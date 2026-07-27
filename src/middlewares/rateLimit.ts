import rateLimit, { type Options } from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Chuẩn hoá IP làm khoá đếm.
 *
 * Với IPv6, một người thường được cấp cả khối /64, nên nếu đếm theo địa chỉ
 * đầy đủ thì họ chỉ cần đổi hậu tố là thoát giới hạn. Vì vậy gộp về /64.
 * (express-rate-limit v8 có sẵn `ipKeyGenerator`, nhưng bản 7.x thì chưa.)
 */
function clientIpKey(req: Request): string {
  const ip = req.ip ?? '';
  if (!ip.includes(':')) return ip; // IPv4
  const segments = ip.split(':');
  return `${segments.slice(0, 4).join(':')}::/64`;
}

/**
 * Store mặc định nằm trong bộ nhớ tiến trình — đủ dùng vì Render free
 * chỉ chạy một instance. Khi scale nhiều instance cần chuyển sang Redis.
 */
function build(options: Partial<Options>) {
  return rateLimit({
    // Bộ test tạo hàng chục tài khoản từ cùng một IP nên sẽ chạm trần ngay và
    // làm nhiễu kết quả. Chỉ bỏ qua ở NODE_ENV=test, production vẫn áp dụng.
    skip: () => process.env.NODE_ENV === 'test',
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res, _next, opts) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
          details: { retryAfterSeconds: Math.ceil(opts.windowMs / 1000) },
        },
      });
    },
    ...options,
  });
}

/** Giới hạn chung cho toàn bộ API. */
export const generalLimiter = build({ windowMs: 15 * 60_000, max: 300 });

/**
 * Đăng nhập giới hạn theo IP **và** theo định danh, để một kẻ tấn công
 * đổi IP vẫn không dò được mật khẩu của một tài khoản cụ thể.
 */
export const loginLimiter = build({
  windowMs: 15 * 60_000,
  max: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => {
    const identifier = String((req.body as { identifier?: string })?.identifier ?? '').toLowerCase();
    return `${clientIpKey(req)}:${identifier}`;
  },
});

export const registerLimiter = build({ windowMs: 60 * 60_000, max: 5 });

export const otpSendLimiter = build({
  windowMs: 60 * 60_000,
  max: 5,
  keyGenerator: (req: Request) => {
    const identifier = String((req.body as { identifier?: string })?.identifier ?? '').toLowerCase();
    return identifier || clientIpKey(req);
  },
});

export const passwordResetLimiter = build({ windowMs: 60 * 60_000, max: 5 });

export const refreshLimiter = build({ windowMs: 60 * 60_000, max: 60 });
