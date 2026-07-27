import { Schema, model, type Document, type Types } from 'mongoose';

export interface IAuditLog extends Document<Types.ObjectId> {
  actorId: Types.ObjectId | null;
  actorRole: string;
  action: string;
  targetType: string | null;
  targetId: Types.ObjectId | null;
  before: unknown;
  after: unknown;
  ip: string;
  userAgent: string;
  severity: 'info' | 'warn' | 'high';
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  actorRole: { type: String, default: 'anonymous' },
  action: { type: String, required: true },
  targetType: { type: String, default: null },
  targetId: { type: Schema.Types.ObjectId, default: null },
  before: { type: Schema.Types.Mixed, default: null },
  after: { type: Schema.Types.Mixed, default: null },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  severity: { type: String, enum: ['info', 'warn', 'high'], default: 'info' },
  createdAt: { type: Date, default: Date.now },
});

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
// Giữ 365 ngày. Sự kiện severity 'high' nên được sao lưu ra ngoài trước khi hết hạn.
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 86_400 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
