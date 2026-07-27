import { Schema, model, type Document, type Types } from 'mongoose';
import { CONTENT_TYPES, type ContentType } from './ContentRevision';

export const REVIEW_STATUSES = [
  'pending',
  'in_review',
  'changes_requested',
  'approved',
  'rejected',
] as const;

export interface IReviewTask extends Document<Types.ObjectId> {
  targetType: ContentType;
  targetId: Types.ObjectId;
  submittedBy: Types.ObjectId;
  submittedAt: Date;
  assignedTo: Types.ObjectId | null;
  status: string;
  priority: 'low' | 'normal' | 'high';
  reviewNotes: { byUserId: Types.ObjectId; note: string; createdAt: Date }[];
  decidedBy: Types.ObjectId | null;
  decidedAt: Date | null;
  slaBy: Date;
}

const reviewTaskSchema = new Schema<IReviewTask>({
  targetType: { type: String, enum: CONTENT_TYPES, required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  submittedAt: { type: Date, default: Date.now },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: REVIEW_STATUSES, default: 'pending' },
  priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  reviewNotes: {
    type: [
      new Schema(
        {
          byUserId: { type: Schema.Types.ObjectId, ref: 'User' },
          note: String,
          createdAt: { type: Date, default: Date.now },
        },
        { _id: false },
      ),
    ],
    default: [],
  },
  decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  decidedAt: { type: Date, default: null },
  // Hạn xử lý — quá hạn thì hiện lên bảng điều khiển của Admin
  slaBy: { type: Date, default: () => new Date(Date.now() + 5 * 86_400_000) },
});

reviewTaskSchema.index({ status: 1, submittedAt: 1 });
reviewTaskSchema.index({ targetType: 1, targetId: 1 });
reviewTaskSchema.index({ submittedBy: 1 });
reviewTaskSchema.index({ assignedTo: 1, status: 1 });

export const ReviewTask = model<IReviewTask>('ReviewTask', reviewTaskSchema);

export interface IContentReport extends Document<Types.ObjectId> {
  reporterId: Types.ObjectId;
  targetType: ContentType;
  targetId: Types.ObjectId;
  reason: string;
  description: string;
  status: string;
  handledBy: Types.ObjectId | null;
  createdAt: Date;
}

const reportSchema = new Schema<IContentReport>({
  reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: CONTENT_TYPES, required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  reason: {
    type: String,
    enum: ['wrong_answer', 'typo', 'unclear', 'audio_broken', 'above_level', 'other'],
    required: true,
  },
  description: { type: String, default: '' },
  status: { type: String, enum: ['open', 'confirmed', 'rejected', 'fixed'], default: 'open' },
  handledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
});

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });

export const ContentReport = model<IContentReport>('ContentReport', reportSchema);
