import { suite, test, expect } from './helpers';
import {
  gradeQuestion,
  judgeExam,
  scaleScore,
  stratifiedSample,
  type ScoringSectionConfig,
} from '../src/modules/exam/grading.engine';
import { N5_TEMPLATE } from '../src/seeds/data/examTemplate.data';

/** Hai nhóm điểm của N5: Kiến thức ngôn ngữ & Đọc (120, liệt <38), Nghe (60, liệt <19). */
const N5_SCORING = N5_TEMPLATE.scoringSections as ScoringSectionConfig[];

export async function runExamEngineTests() {
  // =======================================================================
  suite('Chấm bài — từng dạng câu hỏi');
  // =======================================================================

  await test('Trắc nghiệm một đáp án', async () => {
    const snap = {
      format: 'mcq_single',
      options: [{ id: '1', text: 'は' }, { id: '2', text: 'が' }],
      correctOptionIds: ['1'],
      acceptedAnswers: [],
    };
    expect(gradeQuestion(snap, '1').isCorrect).toBe(true);
    expect(gradeQuestion(snap, '2').isCorrect).toBe(false);
    expect(gradeQuestion(snap, null).isCorrect).toBe(false);
  });

  await test('Trắc nghiệm nhiều đáp án phải đúng hoàn toàn mới tính điểm', async () => {
    const snap = {
      format: 'mcq_multiple',
      options: [],
      correctOptionIds: ['1', '3'],
      acceptedAnswers: [],
    };
    expect(gradeQuestion(snap, ['1', '3']).isCorrect).toBe(true);
    expect(gradeQuestion(snap, ['3', '1']).isCorrect).toBe(true); // thứ tự không quan trọng
    // Chọn thiếu: sai, nhưng vẫn ghi điểm thành phần để phân tích
    const partial = gradeQuestion(snap, ['1']);
    expect(partial.isCorrect).toBe(false);
    expect(partial.partialScore).toBe(0.5);
    // Chọn thừa bị trừ
    expect(gradeQuestion(snap, ['1', '2', '3']).isCorrect).toBe(false);
  });

  await test('Sắp xếp câu dấu ★ chỉ chấm phần tử ở đúng vị trí sao', async () => {
    const snap = {
      format: 'sentence_order',
      options: [],
      correctOptionIds: [],
      acceptedAnswers: [],
      // Thứ tự đúng: あの 黒くて 大きい かばん → dấu ★ ở vị trí thứ 3 = '4'
      orderConfig: { correctSequence: ['2', '1', '4', '3'], starPosition: 3 },
    };
    expect(gradeQuestion(snap, '4').isCorrect).toBe(true);
    expect(gradeQuestion(snap, '1').isCorrect).toBe(false);
  });

  await test('Điền khuyết chấp nhận Katakana viết thay Hiragana', async () => {
    const snap = {
      format: 'fill_blank',
      options: [],
      correctOptionIds: [],
      acceptedAnswers: ['たべる'],
    };
    expect(gradeQuestion(snap, 'たべる').isCorrect).toBe(true);
    expect(gradeQuestion(snap, 'タベル').isCorrect).toBe(true);
    expect(gradeQuestion(snap, ' たべる ').isCorrect).toBe(true); // bỏ khoảng trắng
    expect(gradeQuestion(snap, 'のむ').isCorrect).toBe(false);
  });

  await test('Ghép cặp chấm theo tỉ lệ đúng', async () => {
    const snap = {
      format: 'matching',
      options: [],
      correctOptionIds: [],
      acceptedAnswers: ['a=1', 'b=2', 'c=3', 'd=4'],
    };
    expect(gradeQuestion(snap, { a: '1', b: '2', c: '3', d: '4' }).isCorrect).toBe(true);
    const half = gradeQuestion(snap, { a: '1', b: '2', c: '9', d: '9' });
    expect(half.isCorrect).toBe(false);
    expect(half.partialScore).toBe(0.5);
  });

  await test('Viết tay đạt ngưỡng thì đúng, sai thứ tự nét bị trừ 20%', async () => {
    const snap = {
      format: 'handwriting',
      options: [],
      correctOptionIds: [],
      acceptedAnswers: [],
      handwritingTolerance: 0.72,
    };
    const perfect = gradeQuestion(snap, { strokeScore: 0.9, strokeOrderCorrect: true });
    expect(perfect.isCorrect).toBe(true);
    expect(perfect.partialScore).toBe(1);

    const wrongOrder = gradeQuestion(snap, { strokeScore: 0.9, strokeOrderCorrect: false });
    expect(wrongOrder.isCorrect).toBe(true);
    expect(wrongOrder.partialScore).toBe(0.8);

    expect(gradeQuestion(snap, { strokeScore: 0.5 }).isCorrect).toBe(false);
  });

  await test('Bài viết tự luận chuyển sang chấm tay', async () => {
    const snap = { format: 'composition', options: [], correctOptionIds: [], acceptedAnswers: [] };
    const r = gradeQuestion(snap, 'わたしの かぞくは よにんです。');
    expect(r.isCorrect).toBe(null);
    expect(r.needsManualGrading).toBe(true);
  });

  // =======================================================================
  suite('Chấm điểm JLPT — QUY TẮC ĐIỂM LIỆT KÉP');
  // =======================================================================

  await test('Quy đổi tuyến tính sang thang điểm nhóm', async () => {
    expect(scaleScore(40, 64, 120)).toBe(75);
    expect(scaleScore(64, 64, 120)).toBe(120);
    expect(scaleScore(0, 64, 120)).toBe(0);
  });

  await test('Đủ tổng điểm và không nhóm nào liệt thì ĐỖ', async () => {
    const r = judgeExam(
      N5_SCORING,
      [
        { code: 'vocabulary', correct: 24, total: 32 },
        { code: 'grammar_reading', correct: 18, total: 32 },
        { code: 'listening', correct: 14, total: 24 },
      ],
      80,
    );
    // (24+18)/64 × 120 = 79 ; 14/24 × 60 = 35 → tổng 114
    expect(r.scaledScore).toBe(114);
    expect(r.passed).toBe(true);
    expect(r.failReason).toBe(null);
  });

  await test('⭐ Tổng điểm cao nhưng MỘT nhóm bị liệt thì vẫn TRƯỢT', async () => {
    const r = judgeExam(
      N5_SCORING,
      [
        // Ngôn ngữ & Đọc rất tốt: 56/64 → 105 điểm
        { code: 'vocabulary', correct: 30, total: 32 },
        { code: 'grammar_reading', correct: 26, total: 32 },
        // Nghe rất kém: 6/24 → 15 điểm, dưới ngưỡng liệt 19
        { code: 'listening', correct: 6, total: 24 },
      ],
      80,
    );
    expect(r.scaledScore).toBe(120); // 105 + 15, vượt xa mức 80
    expect(r.failReason).toBe('section_below');
    expect(r.passed).toBe(false); // ← điểm mấu chốt
    expect(r.failExplanation).toContain('Nghe hiểu');
    expect(r.failExplanation).toContain('điểm liệt');
  });

  await test('Không nhóm nào liệt nhưng thiếu tổng điểm thì cũng TRƯỢT', async () => {
    const r = judgeExam(
      N5_SCORING,
      [
        { code: 'vocabulary', correct: 12, total: 32 },
        { code: 'grammar_reading', correct: 10, total: 32 },
        { code: 'listening', correct: 8, total: 24 },
      ],
      80,
    );
    // 22/64 × 120 = 41 (>= 38 nên không liệt) ; 8/24 × 60 = 20 (>= 19) ; tổng 61 < 80
    expect(r.sectionScores[0].passed).toBe(true);
    expect(r.sectionScores[1].passed).toBe(true);
    expect(r.passed).toBe(false);
    expect(r.failReason).toBe('total_below');
  });

  await test('Ngay đúng ngưỡng liệt thì được tính là đạt', async () => {
    const r = judgeExam(
      N5_SCORING,
      [
        { code: 'vocabulary', correct: 11, total: 32 },
        { code: 'grammar_reading', correct: 10, total: 32 },
        { code: 'listening', correct: 20, total: 24 },
      ],
      80,
    );
    // 21/64 × 120 = 39 (>= 38) ; 20/24 × 60 = 50 ; tổng 89 >= 80
    expect(r.sectionScores[0].scaled).toBe(39);
    expect(r.sectionScores[0].passed).toBe(true);
    expect(r.passed).toBe(true);
  });

  await test('Một nhóm điểm gộp đúng hai phần thi của N5', async () => {
    const r = judgeExam(
      N5_SCORING,
      [
        { code: 'vocabulary', correct: 16, total: 32 },
        { code: 'grammar_reading', correct: 16, total: 32 },
        { code: 'listening', correct: 12, total: 24 },
      ],
      80,
    );
    // Nhóm đầu phải gộp cả hai phần: 32 đúng trên 64 câu
    expect(r.sectionScores[0].raw).toBe(32);
    expect(r.sectionScores[0].rawTotal).toBe(64);
    expect(r.sectionScores[0].scaled).toBe(60);
  });

  // =======================================================================
  suite('Ma trận đề N5 khớp tài liệu thiết kế');
  // =======================================================================

  await test('Ba phần thi với đúng thời lượng 20/40/30 phút', async () => {
    const durations = N5_TEMPLATE.sections.map((s) => s.durationMinutes);
    expect(durations).toEqual([20, 40, 30]);
    expect(N5_TEMPLATE.totalDurationMinutes).toBe(90);
  });

  await test('Số câu từng phần đúng: 32 / 32 / 24', async () => {
    const counts = N5_TEMPLATE.sections.map((s) =>
      s.mondai.reduce((sum, m) => sum + m.questionCount, 0),
    );
    expect(counts).toEqual([32, 32, 24]);
  });

  await test('Chỉ có HAI nhóm tính điểm dù có ba phần thi', async () => {
    expect(N5_TEMPLATE.scoringSections).toHaveLength(2);
    expect(N5_TEMPLATE.sections).toHaveLength(3);
    // Nhóm đầu gộp hai phần thi
    expect(N5_TEMPLATE.scoringSections[0].includesSections).toEqual([
      'vocabulary',
      'grammar_reading',
    ]);
  });

  await test('Ngưỡng đỗ và điểm liệt đúng chuẩn N5', async () => {
    expect(N5_TEMPLATE.totalRequired).toBe(80);
    expect(N5_TEMPLATE.totalMaxScore).toBe(180);
    expect(N5_TEMPLATE.scoringSections[0].maxScore).toBe(120);
    expect(N5_TEMPLATE.scoringSections[0].minPassScore).toBe(38);
    expect(N5_TEMPLATE.scoringSections[1].maxScore).toBe(60);
    expect(N5_TEMPLATE.scoringSections[1].minPassScore).toBe(19);
  });

  await test('Mondai đọc Kanji có đúng 12 câu như đề thật', async () => {
    const m1 = N5_TEMPLATE.sections[0].mondai.find((m) => m.code === 'N5-VOC-M1');
    expect(m1!.questionCount).toBe(12);
    const star = N5_TEMPLATE.sections[1].mondai.find((m) => m.code === 'N5-GRA-M2');
    expect(star!.format).toBe('sentence_order');
    expect(star!.questionCount).toBe(5);
  });

  // =======================================================================
  suite('Lấy mẫu phân tầng theo độ khó');
  // =======================================================================

  const makePool = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      _id: `q${i}`,
      irt: { difficulty: -1.5 + (i / n) * 3 }, // trải đều từ -1.5 tới +1.5
      stats: { timesServed: 0 },
    }));

  await test('Lấy đúng số câu yêu cầu', async () => {
    const picked = stratifiedSample(makePool(100), 12, 0, () => 1, () => 0.5);
    expect(picked).toHaveLength(12);
  });

  await test('Không lấy trùng câu trong cùng một lần', async () => {
    const picked = stratifiedSample(makePool(100), 20, 0, () => 1, () => 0.5);
    const ids = new Set(picked.map((p) => p._id));
    expect(ids.size).toBe(20);
  });

  await test('Tỉ lệ 25% dễ / 50% vừa / 25% khó quanh mốc mục tiêu', async () => {
    const picked = stratifiedSample(makePool(200), 20, 0, () => 1, () => 0.5);
    const easy = picked.filter((p) => p.irt.difficulty < -0.4).length;
    const mid = picked.filter((p) => Math.abs(p.irt.difficulty) <= 0.4).length;
    const hard = picked.filter((p) => p.irt.difficulty > 0.4).length;
    expect(easy).toBe(5);
    expect(mid).toBe(10);
    expect(hard).toBe(5);
  });

  await test('Pool nhỏ hơn tầng yêu cầu vẫn lấy đủ số câu, không hụt', async () => {
    // Toàn câu khó, không có câu dễ nào
    const pool = Array.from({ length: 30 }, (_, i) => ({
      _id: `h${i}`,
      irt: { difficulty: 1.5 },
      stats: { timesServed: 0 },
    }));
    const picked = stratifiedSample(pool, 12, 0, () => 1, () => 0.5);
    expect(picked).toHaveLength(12);
  });
}
