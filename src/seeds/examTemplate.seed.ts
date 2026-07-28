import { ExamTemplate } from '../models/Assessment';
import { logger } from '../config/logger';
import { N5_TEMPLATE, N5_READING_WRITING_TEMPLATE } from './data/examTemplate.data';
import {
  DIFFICULTY_ORDER,
  LEVEL_MATRICES,
  buildTemplate,
  countQuestions,
} from './data/examMatrix.data';

export { N5_TEMPLATE, PASSING_THRESHOLDS } from './data/examTemplate.data';

export async function seedExamTemplates(): Promise<number> {
  /*
   * Hai bản N5 cũ được giữ nguyên, KHÔNG gộp vào bộ ma trận mới.
   *
   * Ngân hàng câu hỏi hiện có được gắn theo mã mondai của hai bản này
   * (N5-VOC-M1…) với đúng số câu của chúng. Đổi số câu là bản
   * 'reading_writing' — bản DUY NHẤT sinh được đề lúc này vì chưa có kho âm
   * thanh — sẽ hỏng theo, và người học mất luôn chỗ thi thử đang chạy được.
   */
  await ExamTemplate.updateOne(
    { levelCode: 'N5', variant: 'standard' },
    { $set: N5_TEMPLATE },
    { upsert: true },
  );
  await ExamTemplate.updateOne(
    { levelCode: 'N5', variant: 'reading_writing' },
    { $set: N5_READING_WRITING_TEMPLATE },
    { upsert: true },
  );

  // Bộ ma trận đầy đủ N5–N1 × ba mức độ, dựng theo tài liệu ôn thi JLPT
  let built = 2;
  for (const matrix of LEVEL_MATRICES) {
    for (const difficulty of DIFFICULTY_ORDER) {
      await ExamTemplate.updateOne(
        { levelCode: matrix.levelCode, variant: difficulty },
        { $set: buildTemplate(matrix, difficulty) },
        { upsert: true },
      );
      built += 1;
    }
    logger.info(
      `   Ma trận đề ${matrix.levelCode}: ${countQuestions(matrix)} câu, ` +
        `${matrix.totalDurationMinutes} phút, 3 mức độ`,
    );
  }

  return built;
}
