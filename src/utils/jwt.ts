import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './AppError';
import type { Role } from '../constants/permissions';

export interface AccessTokenPayload {
  sub: string; // userId
  role: Role;
  perms: string[];
  tv: number; // tokenVersion — tăng lên là mọi access token cũ vô hiệu ngay
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
    issuer: 'nihongo-kizuna',
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'nihongo-kizuna',
    }) as AccessTokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      // Mã riêng để frontend biết cần gọi /auth/refresh thay vì đá người dùng ra
      throw AppError.unauthorized('AUTH_TOKEN_EXPIRED', 'Phiên đăng nhập đã hết hạn');
    }
    throw AppError.unauthorized('AUTH_TOKEN_INVALID', 'Token không hợp lệ');
  }
}

/** Số giây còn lại của access token, để frontend chủ động refresh trước khi hết hạn. */
export function accessTokenTtlSeconds(): number {
  const ttl = env.JWT_ACCESS_TTL;
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return 900;
  const value = Number(match[1]);
  const unit = match[2];
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit] ?? 60;
  return value * multiplier;
}
