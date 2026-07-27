import { Schema, model, type Document, type Types } from 'mongoose';

/** Các loại nội dung đi qua quy trình duyệt. */
export const CONTENT_TYPES = [
  'vocabulary',
  'grammar',
  'sentence',
  'kanji',
  'kana',
  'kotowaza',
  'question',
  'passage',
  'lesson',
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const REVISION_ACTIONS = [
  'create',
  'update',
  'submit',
  'approve',
  'request_changes',
  'reject',
  'publish',
  'archive',
  'restore',
] as const;

export interface IContentRevision extends Document<Types.ObjectId> {
  targetType: ContentType;
  targetId: Types.ObjectId;
  version: number;
  snapshot: unknown;
  changeSummary: string;
  authorId: Types.ObjectId;
  action: string;
  createdAt: Date;
}

const revisionSchema = new Schema<IContentRevision>({
  targetType: { type: String, enum: CONTENT_TYPES, required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  version: { type: Number, required: true },
  // Ảnh chụp toàn bộ document tại thời điểm đó → khôi phục được bản cũ
  snapshot: { type: Schema.Types.Mixed, default: null },
  changeSummary: { type: String, default: '' },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: REVISION_ACTIONS, required: true },
  createdAt: { type: Date, default: Date.now },
});

revisionSchema.index({ targetType: 1, targetId: 1, version: -1 });
revisionSchema.index({ authorId: 1, createdAt: -1 });

export const ContentRevision = model<IContentRevision>('ContentRevision', revisionSchema);
