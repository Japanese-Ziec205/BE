import { katakanaToHiragana, normalizeAnswer } from '../../utils/japanese';

/**
 * Chấm bài — toàn bộ là hàm thuần khiết, không chạm database.
 * Nhờ vậy test được trực tiếp và kết quả luôn tái lập được.
 */

export interface QuestionSnapshot {
  format: string;
  options: { id: string; text: string }[];
  correctOptionIds: string[];
  acceptedAnswers: string[];
  answerMatchMode?: 'exact' | 'normalized';
  orderConfig?: { correctSequence: string[]; starPosition: number } | null;
  handwritingTolerance?: number;
}

export interface GradeResult {
  isCorrect: boolean | null; // null = chờ chấm tay
  partialScore: number; // 0..1
  needsManualGrading: boolean;
}

const CORRECT: GradeResult = { isCorrect: true, partialScore: 1, needsManualGrading: false };
const WRONG: GradeResult = { isCorrect: false, partialScore: 0, needsManualGrading: false };
const MANUAL: GradeResult = { isCorrect: null, partialScore: 0, needsManualGrading: true };

/** So khớp đáp án dạng chữ, chấp nhận Katakana viết thay Hiragana. */
function matchesText(
  answer: string,
  accepted: string[],
  mode: 'exact' | 'normalized' = 'normalized',
): boolean {
  if (mode === 'exact') return accepted.includes(answer);

  const normalized = katakanaToHiragana(normalizeAnswer(answer));
  return accepted.some((a) => katakanaToHiragana(normalizeAnswer(a)) === normalized);
}

export function gradeQuestion(snapshot: QuestionSnapshot, userAnswer: unknown): GradeResult {
  // Bỏ trống thì sai, trừ dạng phải chấm tay
  if (userAnswer === null || userAnswer === undefined || userAnswer === '') {
    return snapshot.format === 'composition' ? MANUAL : WRONG;
  }

  switch (snapshot.format) {
    case 'mcq_single':
    case 'audio_mcq':
      return snapshot.correctOptionIds.includes(String(userAnswer)) ? CORRECT : WRONG;

    case 'mcq_multiple': {
      // Phải chọn đúng hoàn toàn: chọn thừa hoặc thiếu đều là sai
      const picked = Array.isArray(userAnswer) ? userAnswer.map(String).sort() : [];
      const expected = [...snapshot.correctOptionIds].sort();
      const exact =
        picked.length === expected.length && picked.every((v, i) => v === expected[i]);
      if (exact) return CORRECT;

      // Điểm thành phần để phân tích, nhưng vẫn tính là sai
      const hits = picked.filter((p) => expected.includes(p)).length;
      const misses = picked.filter((p) => !expected.includes(p)).length;
      const partial = Math.max(0, (hits - misses) / Math.max(1, expected.length));
      return { isCorrect: false, partialScore: partial, needsManualGrading: false };
    }

    /**
     * Dạng sắp xếp câu có dấu ★ của JLPT: chỉ chấm phần tử rơi đúng vào vị trí
     * dấu sao, không chấm cả câu — giống hệt đề thi thật.
     */
    case 'sentence_order': {
      if (!snapshot.orderConfig) return WRONG;
      const { correctSequence, starPosition } = snapshot.orderConfig;
      const expected = correctSequence[starPosition - 1];
      return String(userAnswer) === expected ? CORRECT : WRONG;
    }

    case 'fill_blank':
    case 'typing_kana':
    case 'short_answer':
      return matchesText(String(userAnswer), snapshot.acceptedAnswers, snapshot.answerMatchMode)
        ? CORRECT
        : WRONG;

    case 'matching': {
      // userAnswer: { leftId: rightId }, acceptedAnswers: ['a=1','b=2']
      const pairs = userAnswer as Record<string, string>;
      const expected = new Map(
        snapshot.acceptedAnswers.map((s) => {
          const [l, r] = s.split('=');
          return [l, r];
        }),
      );
      const total = expected.size;
      let hits = 0;
      for (const [left, right] of expected) {
        if (pairs?.[left] === right) hits += 1;
      }
      return {
        isCorrect: hits === total,
        partialScore: total === 0 ? 0 : hits / total,
        needsManualGrading: false,
      };
    }

    /**
     * Viết tay: client đã tính điểm nét bằng thuật toán so khớp và gửi lên.
     * Server chỉ đối chiếu với ngưỡng. Sai thứ tự nét thì vẫn tính đúng nhưng
     * trừ 20% — thứ tự nét quan trọng nhưng không nên phủ nhận cả bài viết.
     */
    case 'handwriting': {
      const payload = userAnswer as { strokeScore?: number; strokeOrderCorrect?: boolean };
      const tolerance = snapshot.handwritingTolerance ?? 0.72;
      const score = payload?.strokeScore ?? 0;
      if (score < tolerance) return WRONG;
      return {
        isCorrect: true,
        partialScore: payload?.strokeOrderCorrect === false ? 0.8 : 1,
        needsManualGrading: false,
      };
    }

    case 'composition':
    case 'speaking_repeat':
      return MANUAL;

    default:
      return WRONG;
  }
}

// ---------------------------------------------------------------------------
// Quy đổi điểm và xét đỗ/trượt
// ---------------------------------------------------------------------------

export interface ScoringSectionConfig {
  code: string;
  nameVi: string;
  includesSections: string[];
  maxScore: number;
  minPassScore: number;
}

export interface SectionRaw {
  code: string;
  correct: number;
  total: number;
}

export interface SectionScore {
  code: string;
  nameVi: string;
  raw: number;
  rawTotal: number;
  scaled: number;
  maxScaled: number;
  minRequired: number;
  passed: boolean;
}

export interface ExamJudgement {
  scaledScore: number;
  maxTotal: number;
  totalRequired: number;
  sectionScores: SectionScore[];
  passed: boolean;
  failReason: 'total_below' | 'section_below' | null;
  failExplanation: string | null;
}

/** Quy đổi tuyến tính từ số câu đúng sang thang điểm của nhóm. */
export function scaleScore(correct: number, total: number, maxScaled: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * maxScaled);
}

/**
 * Xét đỗ/trượt theo QUY TẮC KÉP của JLPT.
 *
 * Thí sinh phải đồng thời:
 *   1. Đạt tổng điểm tối thiểu, VÀ
 *   2. Không nhóm điểm nào dưới ngưỡng liệt.
 *
 * Rất nhiều người học không biết điều thứ hai. Ví dụ có thật: được 105/180 ở
 * N5 (vượt xa mức 80) nhưng phần Nghe chỉ 15/60 (dưới 19) thì vẫn TRƯỢT.
 * Màn hình kết quả phải nói thẳng điều này chứ không được giấu.
 */
export function judgeExam(
  scoringSections: ScoringSectionConfig[],
  rawBySection: SectionRaw[],
  totalRequired: number,
  maxTotal = 180,
): ExamJudgement {
  const rawMap = new Map(rawBySection.map((r) => [r.code, r]));

  const sectionScores: SectionScore[] = scoringSections.map((cfg) => {
    // Một nhóm điểm có thể gộp nhiều phần thi (N5: Từ vựng + Ngữ pháp/Đọc)
    let correct = 0;
    let total = 0;
    for (const sectionCode of cfg.includesSections) {
      const raw = rawMap.get(sectionCode);
      if (raw) {
        correct += raw.correct;
        total += raw.total;
      }
    }
    const scaled = scaleScore(correct, total, cfg.maxScore);
    return {
      code: cfg.code,
      nameVi: cfg.nameVi,
      raw: correct,
      rawTotal: total,
      scaled,
      maxScaled: cfg.maxScore,
      minRequired: cfg.minPassScore,
      passed: scaled >= cfg.minPassScore,
    };
  });

  const scaledScore = sectionScores.reduce((sum, s) => sum + s.scaled, 0);
  const totalPassed = scaledScore >= totalRequired;
  const failedSections = sectionScores.filter((s) => !s.passed);
  const allSectionsPassed = failedSections.length === 0;

  let failReason: ExamJudgement['failReason'] = null;
  let failExplanation: string | null = null;

  if (!totalPassed) {
    failReason = 'total_below';
    failExplanation = `Tổng điểm ${scaledScore}/${maxTotal}, cần tối thiểu ${totalRequired}.`;
  } else if (!allSectionsPassed) {
    failReason = 'section_below';
    const names = failedSections
      .map((s) => `"${s.nameVi}" (${s.scaled}/${s.minRequired})`)
      .join(', ');
    failExplanation =
      `Tổng điểm ${scaledScore}/${maxTotal} đã vượt mức yêu cầu ${totalRequired}, ` +
      `nhưng nhóm ${names} bị điểm liệt. Theo quy định JLPT, chỉ cần một nhóm ` +
      `dưới ngưỡng là trượt dù tổng điểm có cao đến đâu.`;
  }

  return {
    scaledScore,
    maxTotal,
    totalRequired,
    sectionScores,
    passed: totalPassed && allSectionsPassed,
    failReason,
    failExplanation,
  };
}

/**
 * Lấy mẫu phân tầng theo độ khó: 25% dễ, 50% vừa, 25% khó.
 *
 * Lấy ngẫu nhiên thuần sẽ cho ra đề lúc quá dễ lúc quá khó, không đo được
 * năng lực. Phân tầng cho đường cong độ khó giống đề thi thật.
 */
export function stratifiedSample<T extends { irt: { difficulty: number }; _id: unknown }>(
  pool: T[],
  count: number,
  targetMean: number,
  penalize: (item: T) => number = () => 1,
  rng: () => number = Math.random,
): T[] {
  const easy = pool.filter((q) => q.irt.difficulty < targetMean - 0.4);
  const mid = pool.filter((q) => Math.abs(q.irt.difficulty - targetMean) <= 0.4);
  const hard = pool.filter((q) => q.irt.difficulty > targetMean + 0.4);

  const quota = {
    easy: Math.round(count * 0.25),
    mid: Math.round(count * 0.5),
    hard: 0,
  };
  quota.hard = count - quota.easy - quota.mid;

  const pickFrom = (arr: T[], k: number): T[] =>
    [...arr]
      .map((item) => ({ item, weight: rng() * penalize(item) }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, k)
      .map((x) => x.item);

  const picked = [
    ...pickFrom(easy, quota.easy),
    ...pickFrom(mid, quota.mid),
    ...pickFrom(hard, quota.hard),
  ];

  // Tầng nào thiếu thì bù từ phần còn lại, tránh sinh đề hụt câu
  if (picked.length < count) {
    const chosen = new Set(picked.map((p) => String(p._id)));
    const rest = pool.filter((q) => !chosen.has(String(q._id)));
    picked.push(...pickFrom(rest, count - picked.length));
  }

  return picked.slice(0, count);
}
