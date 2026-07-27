import { Schema, model, type Document, type Types } from 'mongoose';

export const XP_SOURCES = [
  'lesson_complete',
  'srs_review',
  'exam_complete',
  'exam_pass',
  'streak_bonus',
  'achievement',
  'writing_graded',
  'daily_goal',
  'contribution',
  'adjustment',
] as const;

export interface IXpLedger extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  amount: number;
  source: string;
  refType: string | null;
  refId: Types.ObjectId | null;
  dateKey: string;
  createdAt: Date;
}

/**
 * Sổ cái XP — CHỈ GHI THÊM, không bao giờ sửa bản ghi cũ.
 *
 * Phát hiện gian lận thì thêm bút toán âm chứ không xoá lịch sử, nhờ vậy luôn
 * truy được mọi điểm đến từ đâu.
 */
const xpLedgerSchema = new Schema<IXpLedger>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  source: { type: String, enum: XP_SOURCES, required: true },
  refType: { type: String, default: null },
  refId: { type: Schema.Types.ObjectId, default: null },
  // Khoá ngày theo múi giờ người dùng, dùng để áp trần XP mỗi ngày
  dateKey: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

xpLedgerSchema.index({ userId: 1, dateKey: 1 });
xpLedgerSchema.index({ userId: 1, createdAt: -1 });

export const XpLedger = model<IXpLedger>('XpLedger', xpLedgerSchema);

// ---------------------------------------------------------------------------
// Huy hiệu
// ---------------------------------------------------------------------------

export interface IAchievement extends Document<Types.ObjectId> {
  code: string;
  nameVi: string;
  descriptionVi: string;
  tier: string;
  category: string;
  metric: string;
  threshold: number;
  xpReward: number;
  isSecret: boolean;
  order: number;
  isActive: boolean;
}

const achievementSchema = new Schema<IAchievement>({
  code: { type: String, required: true, unique: true },
  nameVi: { type: String, required: true },
  descriptionVi: { type: String, default: '' },
  tier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
  category: {
    type: String,
    enum: ['learning', 'streak', 'exam', 'skill', 'contribution', 'secret'],
    default: 'learning',
  },
  /** Tên chỉ số cần so sánh, ví dụ 'kana.hiragana.mastered' hoặc 'streak.current'. */
  metric: { type: String, required: true },
  threshold: { type: Number, required: true },
  xpReward: { type: Number, default: 50 },
  // Huy hiệu ẩn không hiện trước, tạo bất ngờ thú vị khi mở khoá
  isSecret: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});

achievementSchema.index({ metric: 1, isActive: 1 });

export const Achievement = model<IAchievement>('Achievement', achievementSchema);

export interface IUserAchievement extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  achievementCode: string;
  unlockedAt: Date | null;
  progress: number;
  seenAt: Date | null;
}

const userAchievementSchema = new Schema<IUserAchievement>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  achievementCode: { type: String, required: true },
  unlockedAt: { type: Date, default: null },
  // 0..1 — hiện thanh tiến độ cho huy hiệu chưa đạt. Thấy mình sắp đạt là
  // động lực mạnh hơn nhiều so với chỉ thấy phần thưởng cuối cùng.
  progress: { type: Number, default: 0 },
  seenAt: { type: Date, default: null },
});

userAchievementSchema.index({ userId: 1, achievementCode: 1 }, { unique: true });
userAchievementSchema.index({ userId: 1, unlockedAt: -1 });

export const UserAchievement = model<IUserAchievement>('UserAchievement', userAchievementSchema);

// ---------------------------------------------------------------------------
// Thông báo
// ---------------------------------------------------------------------------

export interface INotification extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  type: string;
  title: string;
  body: string;
  data: unknown;
  readAt: Date | null;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  data: { type: Schema.Types.Mixed, default: null },
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 86_400 });

export const Notification = model<INotification>('Notification', notificationSchema);
