import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

type Source = 'body' | 'query' | 'params';

/**
 * Validate và đồng thời GHI ĐÈ dữ liệu đã được zod ép kiểu/làm sạch
 * trở lại request, nên controller luôn nhận dữ liệu đã chuẩn hoá.
 */
export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    // req.query / req.params là getter chỉ đọc ở Express 5, nhưng ghi được ở Express 4
    (req as unknown as Record<Source, unknown>)[source] = result.data;
    next();
  };
}

/** Bọc controller async để lỗi ném ra tự động đi vào errorHandler. */
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => unknown>(
  fn: T,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
