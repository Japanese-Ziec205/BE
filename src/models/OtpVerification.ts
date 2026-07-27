import { Schema, model, type Document, type Types } from 'mongoose';

export type OtpPurpose = 'verify_email' | 'verify_phone' | 'reset_password';

export interface IOtpVerification extends Document<Types.ObjectId> {
  identifier: { type: 'email' | 'phone'; value: string };
  purpose: OtpPurpose;
  codeHash: string;
  attempts: number;
  consumedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

const otpSchema = new Schema<IOtpVerification>({
  identifier: {
    type: { type: String, enum: ['email', 'phone'], required: true },
    value: { type: String, required: true },
  },
  purpose: {
    type: String,
    enum: ['verify_email', 'verify_phone', 'reset_password'],
    required: true,
  },
  // Băm SHA-256, không lưu mã gốc
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  consumedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

otpSchema.index({ 'identifier.value': 1, purpose: 1, consumedAt: 1 });
// Dọn sạch sau 24 giờ kể cả bản ghi đã dùng
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86_400 });

export const OtpVerification = model<IOtpVerification>('OtpVerification', otpSchema);
