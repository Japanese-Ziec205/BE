import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models/User';

/**
 * Xác thực bằng access token trong header Authorization.
 *
 * Lưu ý: có tra DB mỗi request để kiểm tra tokenVersion và trạng thái tài khoản.
 * Đây là đánh đổi có chủ đích — nếu chỉ tin JWT thì không thể khoá tài khoản
 * hay thu hồi phiên ngay lập tức được. Truy vấn này rất nhẹ (theo _id, có projection).
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
      throw AppError.unauthorized('AUTH_TOKEN_MISSING', 'Vui lòng đăng nhập để tiếp tục');
    }

    const payload = verifyAccessToken(header.slice(7).trim());

    const user = await User.findById(payload.sub)
      .select('_id role permissions status tokenVersion deletedAt')
      .lean();

    if (!user || user.deletedAt) {
      throw AppError.unauthorized('AUTH_USER_NOT_FOUND', 'Tài khoản không tồn tại');
    }
    if (user.status === 'suspended') {
      throw AppError.forbidden('AUTH_ACCOUNT_SUSPENDED', 'Tài khoản của bạn đang bị tạm khoá');
    }
    // Đổi mật khẩu / đăng xuất toàn bộ thiết bị sẽ tăng tokenVersion,
    // khiến mọi access token phát hành trước đó mất hiệu lực ngay lập tức.
    if (user.tokenVersion !== payload.tv) {
      throw AppError.unauthorized('AUTH_TOKEN_REVOKED', 'Phiên đăng nhập đã bị thu hồi');
    }

    req.user = {
      id: String(user._id),
      role: user.role,
      perms: user.permissions ?? [],
      tokenVersion: user.tokenVersion,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/** Gắn req.user nếu có token hợp lệ, nhưng không chặn khi thiếu token. */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.header('Authorization')) return next();
  try {
    await authenticate(req, res, next);
  } catch {
    next();
  }
}

/** Chặn tài khoản chưa xác thực OTP với các hành động cần định danh tin cậy (BR-02). */
export async function requireVerified(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw AppError.unauthorized('AUTH_TOKEN_MISSING', 'Vui lòng đăng nhập để tiếp tục');
    }
    const user = await User.findById(req.user.id).select('status identifiers').lean();
    const hasVerified = user?.identifiers?.some((i) => i.verifiedAt);
    if (!hasVerified) {
      throw AppError.forbidden(
        'AUTH_NOT_VERIFIED',
        'Bạn cần xác thực email hoặc số điện thoại trước khi dùng tính năng này',
      );
    }
    next();
  } catch (err) {
    next(err);
  }
}
