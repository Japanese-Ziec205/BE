import { ExamTemplate } from '../models/Assessment';
import { logger } from '../config/logger';
import { N5_TEMPLATE, N5_READING_WRITING_TEMPLATE } from './data/examTemplate.data';

export { N5_TEMPLATE, PASSING_THRESHOLDS } from './data/examTemplate.data';

export async function seedExamTemplates(): Promise<number> {
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

  const totalQuestions = N5_TEMPLATE.sections.reduce(
    (sum, s) => sum + s.mondai.reduce((a, m) => a + m.questionCount, 0),
    0,
  );
  const rwQuestions = N5_READING_WRITING_TEMPLATE.sections.reduce(
    (sum, s) => sum + s.mondai.reduce((a, m) => a + m.questionCount, 0),
    0,
  );
  logger.info(`   Ma trận đề: N5 chuẩn (${totalQuestions} câu, 90 phút)`);
  logger.info(`   Ma trận đề: N5 Đọc–Viết (${rwQuestions} câu, 60 phút)`);
  return 2;
}
