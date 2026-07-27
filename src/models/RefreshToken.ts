import { Schema, model, type Document, type Types } from 'mongoose';

export type RevokedReason =
  | 'logout'
  | 'logout_all'
  | 'rotated'
  | 'reuse_detected'
  | 'password_changed'
  | 'admin';

export interface IRefreshToken extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  tokenHash: string;
  family: string;
  device: { userAgent: string; ip: string; label: string };
  createdAt: Date;
  expiresAt: Date;
  lastUsedAt: Date;
  revokedAt: Date | null;
  revokedReason: RevokedReason | null;
  replacedBy: Types.ObjectId | null;
}

const refreshTokenSchema = new Schema<IRefreshToken>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Luôn lưu bản băm — lộ database cũng không dùng được token
  tokenHash: { type: String, required: true, unique: true },
  // Cùng một chuỗi đăng nhập chia sẻ một family; phát hiện tái sử dụng thì thu hồi cả family
  family: { type: String, required: true, index: true },
  device: {
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
    label: { type: String, default: 'Thiết bị không xác định' },
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  lastUsedAt: { type: Date, default: Date.now },
  revokedAt: { type: Date, default: null },
  revokedReason: { type: String, default: null },
  replacedBy: { type: Schema.Types.ObjectId, ref: 'RefreshToken', default: null },
});

refreshTokenSchema.index({ userId: 1, revokedAt: 1 });
// MongoDB tự xoá bản ghi hết hạn, không cần cron dọn dẹp
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
