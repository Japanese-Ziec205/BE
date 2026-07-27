import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';
import { env } from '../config/env';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: 'RESOURCE_NOT_FOUND',
      message: `Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`,
      details: null,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // --- Lỗi nghiệp vụ đã biết ---
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId: req.requestId }, err.message);
    } else {
      logger.warn({ code: err.code, requestId: req.requestId }, err.message);
    }
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // --- Lỗi validate từ zod ---
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Dữ liệu không hợp lệ',
        details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    });
  }

  // --- Trùng khoá duy nhất của MongoDB ---
  if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'RESOURCE_CONFLICT',
        message: 'Dữ liệu đã tồn tại',
        details: (err as { keyValue?: unknown }).keyValue ?? null,
      },
    });
  }

  // --- Lỗi validate của Mongoose ---
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Dữ liệu không hợp lệ',
        details: Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
      },
    });
  }

  // --- ObjectId sai định dạng ---
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      error: { code: 'RESOURCE_INVALID_ID', message: 'Mã định danh không hợp lệ', details: null },
    });
  }

  // --- Lỗi chưa lường trước ---
  logger.error({ err, requestId: req.requestId }, 'Lỗi không xác định');
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Đã có lỗi xảy ra phía máy chủ. Vui lòng thử lại sau.',
      // Chỉ lộ chi tiết ở môi trường phát triển
      details: env.isProd ? null : String(err),
    },
  });
}
