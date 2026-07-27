import { ExamTemplate } from '../models/Assessment';
import { logger } from '../config/logger';
import { N5_TEMPLATE } from './data/examTemplate.data';

export { N5_TEMPLATE, PASSING_THRESHOLDS } from './data/examTemplate.data';

export async function seedExamTemplates(): Promise<number> {
  await ExamTemplate.updateOne(
    { levelCode: 'N5', variant: 'standard' },
    { $set: N5_TEMPLATE },
    { upsert: true },
  );

  const totalQuestions = N5_TEMPLATE.sections.reduce(
    (sum, s) => sum + s.mondai.reduce((a, m) => a + m.questionCount, 0),
    0,
  );
  logger.info(`   Ma trận đề: N5 chuẩn (${totalQuestions} câu, 90 phút)`);
  return 1;
}
