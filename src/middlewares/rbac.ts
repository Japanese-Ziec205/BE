import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { permissionsOf, type Permission, type Role } from '../constants/permissions';

/** Yêu cầu người dùng thuộc một trong các vai trò cho trước. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized('AUTH_TOKEN_MISSING', 'Vui lòng đăng nhập để tiếp tục'));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        AppError.forbidden('AUTH_FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này'),
      );
    }
    next();
  };
}

/**
 * Yêu cầu đủ TẤT CẢ các quyền liệt kê.
 *
 * RBAC chỉ trả lời "được làm loại hành động này không".
 * Còn "được làm trên bản ghi cụ thể này không" phải kiểm tra riêng ở service
 * (ví dụ: giảng viên chỉ xem học viên trong lớp mình phụ trách).
 */
export function requirePermission(...needed: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized('AUTH_TOKEN_MISSING', 'Vui lòng đăng nhập để tiếp tục'));
    }
    const granted = permissionsOf(req.user.role, req.user.perms);
    const missing = needed.filter((p) => !granted.has(p));
    if (missing.length > 0) {
      return next(
        AppError.forbidden('AUTH_FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này', {
          missing,
        }),
      );
    }
    next();
  };
}
