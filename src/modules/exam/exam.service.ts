import { Types } from 'mongoose';
import crypto from 'node:crypto';
import { AppError } from '../../utils/AppError';
import {
  ExamAttempt,
  ExamTemplate,
  QuestionItem,
  Passage,
  type IQuestionItem,
} from '../../models/Assessment';
import { LearningProfile } from '../../models/LearningProfile';
import { DailyStat } from '../../models/Learning';
import { todayKey } from '../study/study.service';
import {
  gradeQuestion,
  judgeExam,
  stratifiedSample,
  type ScoringSectionConfig,
  type SectionRaw,
} from './grading.engine';

/** Khuyến nghị: pool nên gấp 10 lần số câu cần lấy để đề đủ đa dạng. */
export const HEALTHY_POOL_MULTIPLIER = 10;

export async function checkPoolHealth(levelCode: string, variant = 'standard') {
  const template = await ExamTemplate.findOne({ levelCode, variant, isActive: true }).lean();
  if (!template) {
    throw AppError.notFound('EXAM_TEMPLATE_NOT_FOUND', `Chưa có ma trận đề cho cấp ${levelCode}`);
  }

  const rows = [];
  for (const section of template.sections) {
    for (const mondai of section.mondai) {
      const available = await QuestionItem.countDocuments({
        status: 'published',
        jlptLevel: levelCode,
        mondaiCode: mondai.code,
      });
      const recommendedMin = mondai.questionCount * HEALTHY_POOL_MULTIPLIER;
      rows.push({
        code: mondai.code,
        nameVi: mondai.nameVi,
        required: mondai.questionCount,
        available,
        recommendedMin,
        status:
          available < mondai.questionCount
            ? 'insufficient'
            : available < recommendedMin
              ? 'warning'
              : 'healthy',
        message:
          available < mondai.questionCount
            ? `Thiếu ${mondai.questionCount - available} câu, KHÔNG sinh được đề`
            : available < recommendedMin
              ? `Nên bổ sung thêm ${recommendedMin - available} câu để đề đủ đa dạng`
              : null,
      });
    }
  }

  const insufficient = rows.filter((r) => r.status === 'insufficient');
  return {
    levelCode,
    canGenerate: insufficient.length === 0,
    overallStatus: insufficient.length
      ? 'insufficient'
      : rows.some((r) => r.status === 'warning')
        ? 'warning'
        : 'healthy',
    mondai: rows,
  };
}

/** Các câu hỏi người học đã gặp trong N lượt thi gần nhất (BR-09). */
async function recentQuestionIds(userId: string, lookback: number): Promise<Set<string>> {
  const attempts = await ExamAttempt.find({ userId: new Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(lookback)
    .select('sections')
    .lean();

  const ids = new Set<string>();
  for (const attempt of attempts) {
    for (const section of attempt.sections as { questions: { questionItemId: unknown }[] }[]) {
      for (const q of section.questions ?? []) ids.add(String(q.questionItemId));
    }
  }
  return ids;
}

export async function generateExam(userId: string, levelCode: string, variant = 'standard') {
  const template = await ExamTemplate.findOne({ levelCode, variant, isActive: true }).lean();
  if (!template) {
    throw AppError.notFound('EXAM_TEMPLATE_NOT_FOUND', `Chưa có ma trận đề cho cấp ${levelCode}`);
  }

  const seen = await recentQuestionIds(userId, template.antiRepeat.lookbackAttempts);
  const usedIds = new Set<string>();
  const sections = [];

  interface BuiltQuestion {
    questionItemId: Types.ObjectId;
    mondaiCode: string;
    order: number;
    snapshot: Record<string, unknown>;
    userAnswer: unknown;
    isCorrect: boolean | null;
    flaggedByUser: boolean;
    changedAnswerCount: number;
  }

  for (const sectionDef of template.sections) {
    const questions: BuiltQuestion[] = [];

    for (const mondai of sectionDef.mondai) {
      const pool = (await QuestionItem.find({
        status: 'published',
        jlptLevel: levelCode,
        mondaiCode: mondai.code,
        _id: { $nin: [...usedIds].map((id) => new Types.ObjectId(id)) },
        ...(mondai.topics?.length ? { topics: { $in: mondai.topics } } : {}),
      }).lean()) as unknown as IQuestionItem[];

      if (pool.length < mondai.questionCount) {
        throw AppError.conflict(
          'EXAM_INSUFFICIENT_POOL',
          `Chưa đủ câu hỏi cho phần "${mondai.nameVi}": cần ${mondai.questionCount}, hiện có ${pool.length}`,
          { mondaiCode: mondai.code, required: mondai.questionCount, available: pool.length },
        );
      }

      /**
       * Nạp sẵn đoạn văn cho các câu đọc hiểu.
       *
       * Bản chụp đề phải TỰ CHỨA mọi thứ thí sinh cần đọc. Nếu chỉ lưu
       * passageId thì câu hỏi kiểu "Tanaka mấy giờ ra khỏi nhà?" sẽ hiện lên mà
       * không có bài đọc nào — không ai trả lời được. Lưu cả nội dung cũng bảo
       * đảm bài thi cũ không bị đổi nghĩa khi ai đó sửa đoạn văn gốc.
       */
      const passageIds = [...new Set(pool.map((q) => q.passageId).filter(Boolean))];
      const passages = passageIds.length
        ? await Passage.find({ _id: { $in: passageIds } }).select('title body').lean()
        : [];
      const passageById = new Map(passages.map((p) => [String(p._id), p]));

      const picked = stratifiedSample(
        pool,
        mondai.questionCount,
        mondai.difficultyTargetMean,
        // Giảm mạnh xác suất chọn câu đã gặp, và cân bằng tần suất sử dụng
        (item) =>
          (seen.has(String(item._id)) ? 0.1 : 1) /
          Math.sqrt((item.stats?.timesServed ?? 0) + 1),
      );

      picked.forEach((q) => {
        usedIds.add(String(q._id));
        questions.push({
          questionItemId: q._id,
          mondaiCode: mondai.code,
          /**
           * Số thứ tự phải LIÊN TỤC 1..N trong mỗi phần thi.
           *
           * Trước đây tính bằng `questions.length + i + 1`, mà cả hai vế đều
           * tăng sau mỗi vòng lặp — nên số câu nhảy hai đơn vị (1, 3, 5…) và
           * các mondai sau đè số lên nhau. Hậu quả không chỉ là nhìn khó hiểu:
           * saveAnswers tìm câu theo `order` bằng find(), nên hai câu trùng số
           * thì đáp án của câu sau bị ghi đè vào câu trước — bài làm sai lệch
           * mà không có dấu hiệu gì.
           */
          order: questions.length + 1,
          snapshot: {
            // Bản sao BẤT BIẾN: nội dung gốc có thể bị sửa sau này, nhưng bài
            // thi đã làm phải là bằng chứng nguyên vẹn.
            stem: q.stem,
            format: q.format,
            passage: q.passageId
              ? (() => {
                  const p = passageById.get(String(q.passageId));
                  return p ? { title: p.title, body: p.body } : null;
                })()
              : null,
            options: (q.options ?? []).map((o) => ({ id: o.id, text: o.text })),
            correctOptionIds: (q.options ?? []).filter((o) => o.isCorrect).map((o) => o.id),
            acceptedAnswers: q.acceptedAnswers ?? [],
            orderConfig: q.orderConfig ?? null,
            explanationVi: q.explanationVi ?? '',
          },
          userAnswer: null,
          isCorrect: null,
          flaggedByUser: false,
          changedAnswerCount: 0,
        });
      });
    }

    /**
     * Chặn ngay tại nguồn: số thứ tự phải duy nhất trong một phần thi.
     *
     * Đây là bất biến mà saveAnswers ngầm dựa vào để tìm đúng câu. Nếu về sau
     * ai đó sửa cách đánh số và làm hỏng nó, thà đề không sinh được còn hơn để
     * thí sinh làm xong rồi mới phát hiện đáp án bị ghi nhầm chỗ.
     */
    const orders = questions.map((q) => q.order);
    if (new Set(orders).size !== orders.length) {
      throw AppError.internal(
        'EXAM_DUPLICATE_ORDER',
        `Lỗi nội bộ: phần "${sectionDef.nameVi}" có số thứ tự câu bị trùng`,
      );
    }

    sections.push({
      code: sectionDef.code,
      nameVi: sectionDef.nameVi,
      durationMinutes: sectionDef.durationMinutes,
      autoLockOnTimeout: sectionDef.autoLockOnTimeout,
      startedAt: null,
      endedAt: null,
      lockedByTimeout: false,
      questions,
    });
  }

  const attempt = await ExamAttempt.create({
    userId: new Types.ObjectId(userId),
    templateId: template._id,
    levelCode,
    code: `${levelCode}-MOCK-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    currentSectionCode: sections[0]?.code ?? null,
    sections,
    status: 'in_progress',
  });

  // Kiểm tra tỉ lệ trùng lặp với các đề đã làm gần đây
  const overlap = [...usedIds].filter((id) => seen.has(id)).length / Math.max(1, usedIds.size);

  return {
    attemptId: String(attempt._id),
    code: attempt.code,
    levelCode,
    totalDurationMinutes: template.totalDurationMinutes,
    totalQuestions: usedIds.size,
    overlapRatio: Math.round(overlap * 100) / 100,
    sections: sections.map((s) => ({
      code: s.code,
      nameVi: s.nameVi,
      durationMinutes: s.durationMinutes,
      questionCount: s.questions.length,
      autoLockOnTimeout: s.autoLockOnTimeout,
    })),
    scoringSections: template.scoringSections,
    totalRequired: template.totalRequired,
    maxTotal: template.totalMaxScore,
  };
}

/** Nội dung bài thi cho thí sinh — ĐÃ LOẠI BỎ đáp án đúng và giải thích. */
export async function getAttempt(userId: string, attemptId: string) {
  const attempt = await ExamAttempt.findOne({
    _id: attemptId,
    userId: new Types.ObjectId(userId),
  }).lean();
  if (!attempt) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy bài thi');

  const template = await ExamTemplate.findById(attempt.templateId).lean();
  const sections = attempt.sections as {
    code: string;
    nameVi: string;
    durationMinutes: number;
    startedAt: Date | null;
    endedAt: Date | null;
    lockedByTimeout: boolean;
    questions: {
      order: number;
      mondaiCode: string;
      snapshot: {
        stem: string;
        format: string;
        options: { id: string; text: string }[];
        passage: { title: string; body: string } | null;
        orderConfig: { correctSequence: string[]; starPosition: number } | null;
      };
      userAnswer: unknown;
      flaggedByUser: boolean;
    }[];
  }[];

  const current = sections.find((s) => s.code === attempt.currentSectionCode);
  const deadline =
    current?.startedAt
      ? new Date(current.startedAt.getTime() + current.durationMinutes * 60_000)
      : null;

  return {
    attemptId: String(attempt._id),
    code: attempt.code,
    status: attempt.status,
    currentSectionCode: attempt.currentSectionCode,
    // Đồng hồ là của SERVER. Client đếm ngược cục bộ cho mượt nhưng phải đồng
    // bộ theo mốc này — chỉnh đồng hồ máy không ăn thua.
    serverTime: new Date().toISOString(),
    sectionDeadline: deadline?.toISOString() ?? null,
    totalRequired: template?.totalRequired,
    sections: sections.map((s) => ({
      code: s.code,
      nameVi: s.nameVi,
      durationMinutes: s.durationMinutes,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      lockedByTimeout: s.lockedByTimeout,
      questions: s.questions.map((q) => ({
        order: q.order,
        mondaiCode: q.mondaiCode,
        format: q.snapshot.format,
        stem: q.snapshot.stem,
        passage: q.snapshot.passage ?? null,
        // Dạng sắp xếp câu: chỉ gửi các mảnh đã XÁO TRỘN, tuyệt đối không gửi
        // correctSequence — thứ tự đúng nằm ngay trong đó.
        pieces: q.snapshot.orderConfig
          ? [...q.snapshot.orderConfig.correctSequence].sort((a, b) => a.localeCompare(b, 'ja'))
          : null,
        starPosition: q.snapshot.orderConfig?.starPosition ?? null,
        options: q.snapshot.options, // ⚠ không có isCorrect
        userAnswer: q.userAnswer,
        flaggedByUser: q.flaggedByUser,
      })),
    })),
  };
}

export async function startSection(userId: string, attemptId: string, sectionCode: string) {
  const attempt = await ExamAttempt.findOne({
    _id: attemptId,
    userId: new Types.ObjectId(userId),
    status: 'in_progress',
  });
  if (!attempt) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy bài thi đang làm');

  const sections = attempt.sections as { code: string; startedAt: Date | null; endedAt: Date | null }[];
  const section = sections.find((s) => s.code === sectionCode);
  if (!section) throw AppError.badRequest('EXAM_SECTION_NOT_FOUND', 'Không tìm thấy phần thi');
  if (section.endedAt) {
    throw AppError.conflict('EXAM_SECTION_LOCKED', 'Phần thi này đã kết thúc, không quay lại được');
  }

  if (!section.startedAt) section.startedAt = new Date();
  attempt.currentSectionCode = sectionCode;
  attempt.markModified('sections');
  await attempt.save();

  return {
    sectionCode,
    startedAt: section.startedAt,
    serverTime: new Date().toISOString(),
  };
}

export async function saveAnswers(
  userId: string,
  attemptId: string,
  answers: { order: number; answer: unknown; flagged?: boolean }[],
) {
  const attempt = await ExamAttempt.findOne({
    _id: attemptId,
    userId: new Types.ObjectId(userId),
    status: 'in_progress',
  });
  if (!attempt) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy bài thi đang làm');

  const sections = attempt.sections as {
    code: string;
    durationMinutes: number;
    startedAt: Date | null;
    endedAt: Date | null;
    lockedByTimeout: boolean;
    questions: { order: number; userAnswer: unknown; flaggedByUser: boolean; changedAnswerCount: number }[];
  }[];

  const current = sections.find((s) => s.code === attempt.currentSectionCode);
  if (!current) throw AppError.badRequest('EXAM_SECTION_NOT_FOUND', 'Chưa bắt đầu phần thi nào');

  // Hết giờ thì khoá phần thi, không nhận thêm đáp án
  if (current.startedAt) {
    const elapsed = (Date.now() - current.startedAt.getTime()) / 60_000;
    if (elapsed > current.durationMinutes) {
      current.endedAt = new Date();
      current.lockedByTimeout = true;
      attempt.markModified('sections');
      await attempt.save();
      throw AppError.conflict(
        'EXAM_SECTION_TIME_EXPIRED',
        `Đã hết ${current.durationMinutes} phút của phần này`,
      );
    }
  }

  let saved = 0;
  for (const incoming of answers) {
    const question = current.questions.find((q) => q.order === incoming.order);
    if (!question) continue;
    if (question.userAnswer !== null && question.userAnswer !== incoming.answer) {
      // Đổi đáp án nhiều lần là tín hiệu người học không chắc chắn — hữu ích
      // cho phần phân tích sau khi thi
      question.changedAnswerCount += 1;
    }
    question.userAnswer = incoming.answer;
    if (incoming.flagged !== undefined) question.flaggedByUser = incoming.flagged;
    saved += 1;
  }

  attempt.markModified('sections');
  await attempt.save();
  return { saved, serverTime: new Date().toISOString() };
}

export async function finishSection(userId: string, attemptId: string, sectionCode: string) {
  const attempt = await ExamAttempt.findOne({
    _id: attemptId,
    userId: new Types.ObjectId(userId),
    status: 'in_progress',
  });
  if (!attempt) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy bài thi đang làm');

  const sections = attempt.sections as { code: string; endedAt: Date | null }[];
  const index = sections.findIndex((s) => s.code === sectionCode);
  if (index < 0) throw AppError.badRequest('EXAM_SECTION_NOT_FOUND', 'Không tìm thấy phần thi');

  sections[index].endedAt = new Date();
  const next = sections[index + 1];
  attempt.currentSectionCode = next?.code ?? null;
  attempt.markModified('sections');
  await attempt.save();

  return { finished: sectionCode, nextSection: next?.code ?? null, isLastSection: !next };
}

export async function submitExam(userId: string, attemptId: string) {
  const attempt = await ExamAttempt.findOne({
    _id: attemptId,
    userId: new Types.ObjectId(userId),
  });
  if (!attempt) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy bài thi');
  if (attempt.status !== 'in_progress') {
    // BR-08: đã nộp thì không làm lại để lấy điểm mới, lịch sử giữ nguyên vẹn
    throw AppError.conflict('EXAM_ALREADY_SUBMITTED', 'Bài thi này đã được nộp');
  }

  const template = await ExamTemplate.findById(attempt.templateId).lean();
  if (!template) throw AppError.notFound('EXAM_TEMPLATE_NOT_FOUND', 'Không tìm thấy ma trận đề');

  const sections = attempt.sections as {
    code: string;
    endedAt: Date | null;
    questions: {
      order: number;
      mondaiCode: string;
      questionItemId: unknown;
      snapshot: Parameters<typeof gradeQuestion>[0];
      userAnswer: unknown;
      isCorrect: boolean | null;
    }[];
  }[];

  const rawBySection: SectionRaw[] = [];
  const mondaiStats = new Map<string, { correct: number; total: number }>();
  const wrongItemIds: string[] = [];

  for (const section of sections) {
    let correct = 0;
    for (const q of section.questions) {
      const result = gradeQuestion(q.snapshot, q.userAnswer);
      q.isCorrect = result.isCorrect;
      if (result.isCorrect) correct += 1;
      else if (result.isCorrect === false) wrongItemIds.push(String(q.questionItemId));

      const stat = mondaiStats.get(q.mondaiCode) ?? { correct: 0, total: 0 };
      stat.total += 1;
      if (result.isCorrect) stat.correct += 1;
      mondaiStats.set(q.mondaiCode, stat);
    }
    rawBySection.push({ code: section.code, correct, total: section.questions.length });
    if (!section.endedAt) section.endedAt = new Date();
  }

  const judgement = judgeExam(
    template.scoringSections as ScoringSectionConfig[],
    rawBySection,
    template.totalRequired,
    template.totalMaxScore,
  );

  // Phân tích điểm yếu theo từng dạng bài
  const mondaiNames = new Map<string, string>();
  for (const s of template.sections) {
    for (const m of s.mondai) mondaiNames.set(m.code, m.nameVi);
  }

  const byMondai = [...mondaiStats.entries()].map(([code, s]) => ({
    code,
    nameVi: mondaiNames.get(code) ?? code,
    correct: s.correct,
    total: s.total,
    correctRate: Math.round((s.correct / s.total) * 100) / 100,
  }));

  const weakMondai = byMondai.filter((m) => m.correctRate < 0.5).sort((a, b) => a.correctRate - b.correctRate);
  const strongMondai = byMondai.filter((m) => m.correctRate >= 0.8).sort((a, b) => b.correctRate - a.correctRate);

  // Khuyến nghị chữa cháy — theo yêu cầu mục 6 giáo trình
  const recommendations: { type: string; reason: string; priority: number }[] = [];

  for (const s of judgement.sectionScores.filter((x) => !x.passed)) {
    recommendations.push({
      type: 'practice_section',
      reason:
        `Nhóm "${s.nameVi}" bị điểm liệt (${s.scaled}/${s.minRequired}). ` +
        `Dù tổng điểm cao đến đâu, chỉ cần một nhóm dưới ngưỡng là trượt.`,
      priority: 100,
    });
  }
  for (const m of weakMondai.slice(0, 3)) {
    recommendations.push({
      type: 'review_mondai',
      reason: `Bạn đúng ${m.correct}/${m.total} ở phần "${m.nameVi}"`,
      priority: Math.round((1 - m.correctRate) * 90),
    });
  }
  if (wrongItemIds.length > 0) {
    recommendations.push({
      type: 'srs_boost',
      reason: `Đã ghi ${wrongItemIds.length} câu làm sai vào Sổ tay lỗi sai để ôn lại`,
      priority: 75,
    });
  }

  const skillRadar = buildSkillRadar(sections, template);

  attempt.status = 'graded';
  attempt.submittedAt = new Date();
  attempt.result = {
    ...judgement,
    byMondai,
    weakMondai,
    strongMondai,
    skillRadar,
    recommendations: recommendations.sort((a, b) => b.priority - a.priority).slice(0, 5),
    wrongItemIds,
  };
  attempt.markModified('sections');
  await attempt.save();

  await LearningProfile.updateOne(
    { userId: new Types.ObjectId(userId) },
    { $inc: { 'totals.examsTaken': 1 } },
  );
  await DailyStat.updateOne(
    { userId: new Types.ObjectId(userId), date: todayKey() },
    { $inc: { examsTaken: 1 } },
    { upsert: true },
  );

  return attempt.result;
}

/** Điểm theo từng kỹ năng, dùng vẽ biểu đồ radar. */
function buildSkillRadar(
  sections: { questions: { mondaiCode: string; isCorrect: boolean | null }[] }[],
  template: { sections: { mondai: { code: string; skill: string }[] }[] },
): Record<string, number> {
  const skillByMondai = new Map<string, string>();
  for (const s of template.sections) {
    for (const m of s.mondai) skillByMondai.set(m.code, m.skill);
  }

  const tally = new Map<string, { correct: number; total: number }>();
  for (const section of sections) {
    for (const q of section.questions) {
      const skill = skillByMondai.get(q.mondaiCode) ?? 'other';
      const t = tally.get(skill) ?? { correct: 0, total: 0 };
      t.total += 1;
      if (q.isCorrect) t.correct += 1;
      tally.set(skill, t);
    }
  }

  return Object.fromEntries(
    [...tally.entries()].map(([skill, t]) => [skill, Math.round((t.correct / t.total) * 100)]),
  );
}

export async function getResult(userId: string, attemptId: string) {
  const attempt = await ExamAttempt.findOne({
    _id: attemptId,
    userId: new Types.ObjectId(userId),
  }).lean();
  if (!attempt) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy bài thi');
  if (attempt.status !== 'graded') {
    throw AppError.conflict('EXAM_NOT_GRADED', 'Bài thi chưa được chấm');
  }
  return attempt.result;
}

/** Xem lại từng câu — giờ mới được trả đáp án đúng và giải thích. */
export async function reviewAttempt(userId: string, attemptId: string) {
  const attempt = await ExamAttempt.findOne({
    _id: attemptId,
    userId: new Types.ObjectId(userId),
  }).lean();
  if (!attempt) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy bài thi');
  if (attempt.status !== 'graded') {
    throw AppError.conflict('EXAM_NOT_GRADED', 'Phải nộp bài mới xem lại được');
  }

  const sections = attempt.sections as {
    code: string;
    nameVi: string;
    questions: {
      order: number;
      mondaiCode: string;
      snapshot: {
        stem: string;
        format: string;
        options: { id: string; text: string }[];
        correctOptionIds: string[];
        explanationVi: string;
        passage: { title: string; body: string } | null;
        orderConfig: { correctSequence: string[]; starPosition: number } | null;
      };
      userAnswer: unknown;
      isCorrect: boolean | null;
    }[];
  }[];

  return sections.map((s) => ({
    code: s.code,
    nameVi: s.nameVi,
    questions: s.questions.map((q) => ({
      order: q.order,
      mondaiCode: q.mondaiCode,
      format: q.snapshot.format,
      stem: q.snapshot.stem,
      passage: q.snapshot.passage ?? null,
      correctSequence: q.snapshot.orderConfig?.correctSequence ?? null,
      options: q.snapshot.options,
      correctOptionIds: q.snapshot.correctOptionIds,
      explanationVi: q.snapshot.explanationVi,
      userAnswer: q.userAnswer,
      isCorrect: q.isCorrect,
    })),
  }));
}

export async function listHistory(userId: string) {
  const attempts = await ExamAttempt.find({
    userId: new Types.ObjectId(userId),
    status: 'graded',
  })
    .sort({ submittedAt: -1 })
    .select('code levelCode submittedAt result')
    .lean();

  return attempts.map((a) => {
    const r = a.result as { scaledScore: number; passed: boolean; totalRequired: number } | null;
    return {
      attemptId: String(a._id),
      code: a.code,
      levelCode: a.levelCode,
      submittedAt: a.submittedAt,
      scaledScore: r?.scaledScore ?? 0,
      totalRequired: r?.totalRequired ?? 0,
      passed: r?.passed ?? false,
    };
  });
}
