import { Schema, model, type Document, type Types } from 'mongoose';
import { JLPT_LEVELS, type JlptLevel } from './Kanji';

// ---------------------------------------------------------------------------
// Chương trình học
// ---------------------------------------------------------------------------

export interface ILesson extends Document<Types.ObjectId> {
  courseSlug: string;
  levelCode: JlptLevel;
  slug: string;
  title: string;
  objective: string;
  order: number;
  estimatedMinutes: number;
  blocks: {
    type: string;
    order: number;
    richText?: string;
    refIds?: Types.ObjectId[];
    refCharacters?: string[];
    config?: unknown;
  }[];
  teaches: {
    kanaCharacters: string[];
    kanjiCharacters: string[];
    vocabularyIds: Types.ObjectId[];
    grammarPointIds: Types.ObjectId[];
  };
  passThreshold: number;
  xpReward: number;
  status: string;
  publishedAt: Date | null;
}

const lessonSchema = new Schema<ILesson>(
  {
    courseSlug: { type: String, required: true },
    levelCode: { type: String, enum: JLPT_LEVELS, required: true },
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    // "Sau bài này bạn sẽ phân biệt được に và で" — nêu rõ để người tự học
    // biết mình đang học để làm gì
    objective: { type: String, default: '' },
    order: { type: Number, required: true },
    estimatedMinutes: { type: Number, default: 5 },

    blocks: {
      type: [
        new Schema(
          {
            type: { type: String, required: true },
            order: { type: Number, required: true },
            richText: String,
            refIds: [Schema.Types.ObjectId],
            refCharacters: [String],
            config: Schema.Types.Mixed,
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    // Tài sản ngôn ngữ bài này dạy — dùng để nạp thẻ SRS khi hoàn thành bài
    teaches: {
      kanaCharacters: { type: [String], default: [] },
      kanjiCharacters: { type: [String], default: [] },
      vocabularyIds: [{ type: Schema.Types.ObjectId, ref: 'Vocabulary' }],
      grammarPointIds: [{ type: Schema.Types.ObjectId, ref: 'GrammarPoint' }],
    },

    passThreshold: { type: Number, default: 80 },
    xpReward: { type: Number, default: 20 },
    status: { type: String, default: 'published' },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

lessonSchema.index({ courseSlug: 1, order: 1 });
lessonSchema.index({ levelCode: 1, status: 1 });

export const Lesson = model<ILesson>('Lesson', lessonSchema);

// ---------------------------------------------------------------------------
// Tiến độ bài học
// ---------------------------------------------------------------------------

export interface ILessonProgress extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  lessonId: Types.ObjectId;
  status: 'available' | 'in_progress' | 'completed';
  lastBlockIndex: number;
  quizAttempts: { score: number; passed: boolean; takenAt: Date }[];
  bestScore: number;
  completedAt: Date | null;
  timeSpentSeconds: number;
}

const lessonProgressSchema = new Schema<ILessonProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    status: {
      type: String,
      enum: ['available', 'in_progress', 'completed'],
      default: 'available',
    },
    // Ghi nhớ vị trí dừng chính xác — người học thường chỉ có vài phút mỗi lần
    lastBlockIndex: { type: Number, default: 0 },
    quizAttempts: {
      type: [
        new Schema(
          { score: Number, passed: Boolean, takenAt: { type: Date, default: Date.now } },
          { _id: false },
        ),
      ],
      default: [],
    },
    bestScore: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
    timeSpentSeconds: { type: Number, default: 0 },
  },
  { timestamps: true },
);

lessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
lessonProgressSchema.index({ userId: 1, status: 1 });

export const LessonProgress = model<ILessonProgress>('LessonProgress', lessonProgressSchema);

// ---------------------------------------------------------------------------
// Thẻ SRS
// ---------------------------------------------------------------------------

export const SRS_ITEM_TYPES = ['kana', 'kanji', 'vocabulary', 'grammar'] as const;
export const SRS_DIRECTIONS = ['recognition', 'recall', 'writing', 'listening'] as const;
export const SRS_STATES = ['new', 'learning', 'review', 'relearning', 'suspended'] as const;

export type SrsItemType = (typeof SRS_ITEM_TYPES)[number];
export type SrsDirection = (typeof SRS_DIRECTIONS)[number];
export type SrsState = (typeof SRS_STATES)[number];

export interface ISrsCard extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  itemType: SrsItemType;
  /** Ký tự với kana/kanji, hoặc ObjectId dạng chuỗi với từ vựng/ngữ pháp. */
  itemKey: string;
  direction: SrsDirection;
  state: SrsState;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  isLeech: boolean;
  dueAt: Date;
  lastReviewedAt: Date | null;
  learningStepIndex: number;
  stats: { totalReviews: number; correctReviews: number; avgResponseMs: number };
}

const srsCardSchema = new Schema<ISrsCard>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    itemType: { type: String, enum: SRS_ITEM_TYPES, required: true },
    itemKey: { type: String, required: true },
    // Một item sinh nhiều thẻ theo hướng ôn khác nhau: nhìn chữ ra nghĩa,
    // nghe nghĩa viết chữ, viết tay... đều là kỹ năng nhận thức riêng biệt.
    direction: { type: String, enum: SRS_DIRECTIONS, required: true },

    state: { type: String, enum: SRS_STATES, default: 'new' },
    easeFactor: { type: Number, default: 2.5 },
    intervalDays: { type: Number, default: 0 },
    repetitions: { type: Number, default: 0 },
    lapses: { type: Number, default: 0 },
    // Quên >= 8 lần: đừng để người học tiếp tục vật lộn, đó là công thức của
    // sự chán nản. Treo thẻ lại và đổi cách học.
    isLeech: { type: Boolean, default: false },

    dueAt: { type: Date, default: Date.now },
    lastReviewedAt: { type: Date, default: null },
    learningStepIndex: { type: Number, default: 0 },

    stats: {
      totalReviews: { type: Number, default: 0 },
      correctReviews: { type: Number, default: 0 },
      avgResponseMs: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

srsCardSchema.index({ userId: 1, dueAt: 1, state: 1 });
srsCardSchema.index(
  { userId: 1, itemType: 1, itemKey: 1, direction: 1 },
  { unique: true },
);
srsCardSchema.index({ userId: 1, isLeech: 1 });

export const SrsCard = model<ISrsCard>('SrsCard', srsCardSchema);

// ---------------------------------------------------------------------------
// Nhật ký ôn tập
// ---------------------------------------------------------------------------

export interface IReviewLog extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  cardId: Types.ObjectId;
  itemType: string;
  itemKey: string;
  rating: 1 | 2 | 3 | 4;
  responseMs: number;
  intervalBefore: number;
  intervalAfter: number;
  easeBefore: number;
  easeAfter: number;
  reviewedAt: Date;
}

const reviewLogSchema = new Schema<IReviewLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  cardId: { type: Schema.Types.ObjectId, ref: 'SrsCard', required: true },
  itemType: String,
  itemKey: String,
  rating: { type: Number, required: true },
  responseMs: { type: Number, default: 0 },
  intervalBefore: Number,
  intervalAfter: Number,
  easeBefore: Number,
  easeAfter: Number,
  reviewedAt: { type: Date, default: Date.now },
});

reviewLogSchema.index({ userId: 1, reviewedAt: -1 });
// Collection này phình rất nhanh. Giữ 180 ngày là đủ cho phân tích,
// số liệu dài hạn đã được rollup sang DailyStat.
reviewLogSchema.index({ reviewedAt: 1 }, { expireAfterSeconds: 180 * 86_400 });

export const ReviewLog = model<IReviewLog>('ReviewLog', reviewLogSchema);

// ---------------------------------------------------------------------------
// Phiên học & thống kê ngày
// ---------------------------------------------------------------------------

export interface IStudySession extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  context: { type: string; refId: Types.ObjectId | null };
  startedAt: Date;
  lastHeartbeatAt: Date;
  endedAt: Date | null;
  heartbeatCount: number;
  countedSeconds: number;
  discardedSeconds: number;
  heartbeatIntervals: number[];
  suspicious: boolean;
  timezone: string;
}

const studySessionSchema = new Schema<IStudySession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  context: {
    type: { type: String, default: 'practice' },
    refId: { type: Schema.Types.ObjectId, default: null },
  },
  startedAt: { type: Date, default: Date.now },
  lastHeartbeatAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
  heartbeatCount: { type: Number, default: 0 },
  // Server tự tính, KHÔNG nhận từ client — client có thể gửi duration bất kỳ
  countedSeconds: { type: Number, default: 0 },
  discardedSeconds: { type: Number, default: 0 },
  // Giữ 20 nhịp gần nhất để phát hiện script tự động (nhịp quá đều)
  heartbeatIntervals: { type: [Number], default: [] },
  suspicious: { type: Boolean, default: false },
  timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
});

studySessionSchema.index({ userId: 1, startedAt: -1 });
studySessionSchema.index({ endedAt: 1, lastHeartbeatAt: 1 });

export const StudySession = model<IStudySession>('StudySession', studySessionSchema);

export interface IDailyStat extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  date: string;
  studySeconds: number;
  xpEarned: number;
  lessonsCompleted: number;
  reviewsDone: number;
  reviewsCorrect: number;
  newItemsLearned: number;
  examsTaken: number;
  goalMet: boolean;
  sessionCount: number;
}

const dailyStatSchema = new Schema<IDailyStat>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // 'YYYY-MM-DD' theo múi giờ của người dùng, không phải UTC
  date: { type: String, required: true },
  studySeconds: { type: Number, default: 0 },
  xpEarned: { type: Number, default: 0 },
  lessonsCompleted: { type: Number, default: 0 },
  reviewsDone: { type: Number, default: 0 },
  reviewsCorrect: { type: Number, default: 0 },
  newItemsLearned: { type: Number, default: 0 },
  examsTaken: { type: Number, default: 0 },
  goalMet: { type: Boolean, default: false },
  sessionCount: { type: Number, default: 0 },
});

dailyStatSchema.index({ userId: 1, date: -1 }, { unique: true });

export const DailyStat = model<IDailyStat>('DailyStat', dailyStatSchema);
