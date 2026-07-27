import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Token ngẫu nhiên 64 byte dùng làm refresh token (không phải JWT — để thu hồi được ngay). */
export function generateOpaqueToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

/** Refresh token và OTP luôn lưu dạng băm, không lưu bản gốc. */
export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Mã OTP 6 chữ số, dùng nguồn ngẫu nhiên an toàn (không dùng Math.random). */
export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function generateUuid(): string {
  return crypto.randomUUID();
}

/**
 * So sánh chuỗi trong thời gian hằng định, tránh rò rỉ thông tin qua thời gian phản hồi.
 */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
