import { Schema, model, type Document, type Types } from 'mongoose';

export type LearningGoal = 'jlpt' | 'study_abroad' | 'work' | 'hobby' | 'communication';

export interface ILearningProfile extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  currentLevelCode: string;
  placementResult: { levelCode: string; score: number; takenAt: Date } | null;
  learningGoal: LearningGoal | null;
  targetLevel: string | null;
  targetDate: Date | null;
  dailyGoalMinutes: number;
  unlockedLevelCodes: string[];
  totals: {
    studyMinutes: number;
    lessonsCompleted: number;
    kanaLearned: number;
    kanjiLearned: number;
    vocabularyLearned: number;
    grammarLearned: number;
    reviewsDone: number;
    examsTaken: number;
  };
  streak: {
    current: number;
    longest: number;
    lastStudyDate: string | null;
    freezesAvailable: number;
    freezesUsedTotal: number;
  };
  xp: { total: number; thisWeek: number; level: number };
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const learningProfileSchema = new Schema<ILearningProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    currentLevelCode: { type: String, default: 'N5' },
    placementResult: {
      type: new Schema(
        { levelCode: String, score: Number, takenAt: Date },
        { _id: false },
      ),
      default: null,
    },
    learningGoal: {
      type: String,
      enum: ['jlpt', 'study_abroad', 'work', 'hobby', 'communication'],
      default: null,
    },
    targetLevel: { type: String, default: null },
    targetDate: { type: Date, default: null },
    dailyGoalMinutes: { type: Number, default: 10, min: 5, max: 240 },
    unlockedLevelCodes: { type: [String], default: ['N5'] },

    totals: {
      studyMinutes: { type: Number, default: 0 },
      lessonsCompleted: { type: Number, default: 0 },
      kanaLearned: { type: Number, default: 0 },
      kanjiLearned: { type: Number, default: 0 },
      vocabularyLearned: { type: Number, default: 0 },
      grammarLearned: { type: Number, default: 0 },
      reviewsDone: { type: Number, default: 0 },
      examsTaken: { type: Number, default: 0 },
    },

    streak: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      // Dạng 'YYYY-MM-DD' theo múi giờ của người dùng, không phải Date
      lastStudyDate: { type: String, default: null },
      freezesAvailable: { type: Number, default: 0 },
      freezesUsedTotal: { type: Number, default: 0 },
    },

    xp: {
      total: { type: Number, default: 0 },
      thisWeek: { type: Number, default: 0 },
      level: { type: Number, default: 1 },
    },

    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const LearningProfile = model<ILearningProfile>('LearningProfile', learningProfileSchema);

/** XP cần để lên cấp n: 100 × n^1.5 (xem tài liệu thiết kế 07). */
export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

export function levelFromXp(totalXp: number): number {
  let level = 1;
  let accumulated = 0;
  while (accumulated + xpForLevel(level) <= totalXp && level < 200) {
    accumulated += xpForLevel(level);
    level += 1;
  }
  return level;
}

export const LEVEL_TITLES: { minLevel: number; title: string }[] = [
  { minLevel: 40, title: 'Hạc giấy vàng 🕊️' },
  { minLevel: 30, title: 'Bậc thầy chữ viết 🖌️' },
  { minLevel: 20, title: 'Người kiên trì ⛩️' },
  { minLevel: 15, title: 'Học trò cần mẫn 📖' },
  { minLevel: 10, title: 'Hoa anh đào 🌸' },
  { minLevel: 5, title: 'Mầm non 🌿' },
  { minLevel: 1, title: 'Hạt giống 🌱' },
];

export function titleForLevel(level: number): string {
  return LEVEL_TITLES.find((t) => level >= t.minLevel)?.title ?? 'Hạt giống 🌱';
}
