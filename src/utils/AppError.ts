/**
 * Lỗi nghiệp vụ có mã định danh, để frontend bắt lỗi theo `code`
 * thay vì so khớp chuỗi tiếng Việt (chuỗi có thể đổi bất cứ lúc nào).
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: unknown;
  public readonly isOperational = true;

  constructor(code: string, message: string, statusCode = 400, details: unknown = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(code: string, message: string, details?: unknown) {
    return new AppError(code, message, 400, details);
  }
  static unauthorized(code: string, message: string, details?: unknown) {
    return new AppError(code, message, 401, details);
  }
  static forbidden(code: string, message: string, details?: unknown) {
    return new AppError(code, message, 403, details);
  }
  static notFound(code: string, message: string, details?: unknown) {
    return new AppError(code, message, 404, details);
  }
  static conflict(code: string, message: string, details?: unknown) {
    return new AppError(code, message, 409, details);
  }
  static unprocessable(code: string, message: string, details?: unknown) {
    return new AppError(code, message, 422, details);
  }
  static tooMany(code: string, message: string, details?: unknown) {
    return new AppError(code, message, 429, details);
  }
  /**
   * Lỗi do chính hệ thống sai, không phải do người dùng nhập sai.
   *
   * Dùng cho các bất biến nội bộ bị vi phạm: thà dừng lại và báo lỗi còn hơn
   * để dữ liệu hỏng đi tiếp mà không ai biết.
   */
  static internal(code: string, message: string, details?: unknown) {
    return new AppError(code, message, 500, details);
  }
}
