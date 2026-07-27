import type { Request } from 'express';
import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog';
import { logger } from '../config/logger';

interface AuditInput {
  req?: Request;
  actorId?: string | Types.ObjectId | null;
  actorRole?: string;
  action: string;
  targetType?: string | null;
  targetId?: string | Types.ObjectId | null;
  before?: unknown;
  after?: unknown;
  severity?: 'info' | 'warn' | 'high';
}

/**
 * Ghi nhật ký kiểm toán.
 *
 * Cố tình KHÔNG ném lỗi ra ngoài: việc ghi log hỏng không được phép
 * làm thất bại nghiệp vụ chính (ví dụ người dùng đổi mật khẩu thành công
 * rồi nhận lỗi 500 chỉ vì audit log ghi không được).
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await AuditLog.create({
      actorId: input.actorId ? new Types.ObjectId(String(input.actorId)) : null,
      actorRole: input.actorRole ?? input.req?.user?.role ?? 'anonymous',
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ? new Types.ObjectId(String(input.targetId)) : null,
      before: input.before ?? null,
      after: input.after ?? null,
      ip: input.req?.ip ?? '',
      userAgent: input.req?.header('User-Agent') ?? '',
      severity: input.severity ?? 'info',
    });
  } catch (err) {
    logger.error({ err, action: input.action }, 'Không ghi được audit log');
  }
}
