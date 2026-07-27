import { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { Lesson, LessonProgress, DailyStat } from '../../models/Learning';
import { LearningProfile } from '../../models/LearningProfile';
import { enrollItems } from '../srs/srs.service';
import { todayKey } from '../study/study.service';
import type { SrsItemType } from '../../models/Learning';

export async function listLessons(userId: string, levelCode?: string) {
  const filter: Record<string, unknown> = { status: 'published' };
  if (levelCode) filter.levelCode = levelCode;

  const [lessons, progresses] = await Promise.all([
    Lesson.find(filter).sort({ order: 1 }).lean(),
    LessonProgress.find({ userId: new Types.ObjectId(userId) }).lean(),
  ]);

  const byLesson = new Map(progresses.map((p) => [String(p.lessonId), p]));

  /**
   * Bài n chỉ mở khoá khi bài n-1 đã hoàn thành (BR-03).
   * Không cho nhảy cóc vì người học sẽ lạc vào nội dung quá khó rồi nản —
   * nguyên nhân bỏ cuộc phổ biến nhất khi tự học.
   */
  let previousCompleted = true;
  return lessons.map((lesson) => {
    const progress = byLesson.get(String(lesson._id));
    const completed = progress?.status === 'completed';
    const unlocked = previousCompleted;
    previousCompleted = completed;

    return {
      id: String(lesson._id),
      slug: lesson.slug,
      title: lesson.title,
      objective: lesson.objective,
      order: lesson.order,
      levelCode: lesson.levelCode,
      estimatedMinutes: lesson.estimatedMinutes,
      xpReward: lesson.xpReward,
      status: !unlocked ? 'locked' : (progress?.status ?? 'available'),
      bestScore: progress?.bestScore ?? 0,
      lastBlockIndex: progress?.lastBlockIndex ?? 0,
    };
  });
}

export async function getLesson(userId: string, slug: string) {
  const lesson = await Lesson.findOne({ slug, status: 'published' }).lean();
  if (!lesson) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy bài học');

  const progress = await LessonProgress.findOneAndUpdate(
    { userId: new Types.ObjectId(userId), lessonId: lesson._id },
    { $setOnInsert: { status: 'in_progress' } },
    { upsert: true, new: true },
  );

  return {
    ...lesson,
    progress: {
      status: progress.status,
      lastBlockIndex: progress.lastBlockIndex,
      bestScore: progress.bestScore,
    },
  };
}

export async function saveProgress(userId: string, lessonId: string, lastBlockIndex: number) {
  const progress = await LessonProgress.findOneAndUpdate(
    { userId: new Types.ObjectId(userId), lessonId: new Types.ObjectId(lessonId) },
    { $set: { lastBlockIndex, status: 'in_progress' } },
    { upsert: true, new: true },
  );
  return { lastBlockIndex: progress.lastBlockIndex };
}

export async function completeLesson(userId: string, lessonId: string, quizScore?: number) {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy bài học');

  const score = quizScore ?? 100;
  const passed = score >= lesson.passThreshold;

  const progress = await LessonProgress.findOneAndUpdate(
    { userId: new Types.ObjectId(userId), lessonId: lesson._id },
    {
      $set: {
        status: passed ? 'completed' : 'in_progress',
        ...(passed ? { completedAt: new Date() } : {}),
      },
      $max: { bestScore: score },
      $push: { quizAttempts: { score, passed, takenAt: new Date() } },
    },
    { upsert: true, new: true },
  );

  if (!passed) {
    return {
      passed: false,
      score,
      required: lesson.passThreshold,
      message: `Bạn đạt ${score}%, cần ${lesson.passThreshold}% để mở bài tiếp theo. Ôn lại một chút rồi thử lại nhé!`,
      cardsCreated: 0,
      xpAwarded: 0,
    };
  }

  // Chỉ nạp thẻ SRS khi đã thực sự học xong — không tạo trước hàng loạt
  const items: { itemType: SrsItemType; itemKey: string }[] = [
    ...lesson.teaches.kanaCharacters.map((c) => ({ itemType: 'kana' as const, itemKey: c })),
    ...lesson.teaches.kanjiCharacters.map((c) => ({ itemType: 'kanji' as const, itemKey: c })),
    ...lesson.teaches.vocabularyIds.map((id) => ({
      itemType: 'vocabulary' as const,
      itemKey: String(id),
    })),
    ...lesson.teaches.grammarPointIds.map((id) => ({
      itemType: 'grammar' as const,
      itemKey: String(id),
    })),
  ];
  const cardsCreated = await enrollItems(userId, items);

  const isFirstCompletion = progress.quizAttempts.filter((a) => a.passed).length === 1;
  if (isFirstCompletion) {
    await LearningProfile.updateOne(
      { userId: new Types.ObjectId(userId) },
      {
        $inc: {
          'totals.lessonsCompleted': 1,
          'totals.kanaLearned': lesson.teaches.kanaCharacters.length,
          'totals.kanjiLearned': lesson.teaches.kanjiCharacters.length,
          'totals.vocabularyLearned': lesson.teaches.vocabularyIds.length,
          'totals.grammarLearned': lesson.teaches.grammarPointIds.length,
        },
      },
    );
    await DailyStat.updateOne(
      { userId: new Types.ObjectId(userId), date: todayKey() },
      { $inc: { lessonsCompleted: 1, newItemsLearned: items.length } },
      { upsert: true },
    );
  }

  return {
    passed: true,
    score,
    cardsCreated,
    xpAwarded: isFirstCompletion ? lesson.xpReward : 0,
    message: passed && score === 100 ? 'Tuyệt vời, đúng hết!' : 'Hoàn thành bài học!',
  };
}
