import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Toàn bộ biến môi trường được kiểm tra ngay khi khởi động (fail-fast).
 * Thiếu hoặc sai biến thì tiến trình dừng ngay với thông báo rõ ràng,
 * thay vì chạy được rồi sập giữa chừng ở production.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI là bắt buộc'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET cần ít nhất 32 ký tự'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET cần ít nhất 32 ký tự'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  MAIL_PROVIDER: z.enum(['console', 'resend', 'sendgrid']).default('console'),
  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default('Nihongo Kizuna <onboarding@resend.dev>'),

  ADMIN_SEED_EMAIL: z.string().email().optional(),
  ADMIN_SEED_PASSWORD: z.string().optional(),
  ADMIN_SEED_NAME: z.string().default('Quản trị viên'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Không dùng logger ở đây vì logger cũng phụ thuộc env
  console.error('\n❌ Cấu hình môi trường không hợp lệ:\n');
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('\n👉 Kiểm tra lại file .env (tham khảo .env.example)\n');
  process.exit(1);
}

const raw = parsed.data;

// Hai secret trùng nhau làm mất ý nghĩa của việc tách access/refresh:
// một refresh token bị lộ sẽ dùng được như access token và ngược lại.
if (raw.JWT_ACCESS_SECRET === raw.JWT_REFRESH_SECRET) {
  console.error('\n❌ JWT_ACCESS_SECRET và JWT_REFRESH_SECRET phải khác nhau.\n');
  process.exit(1);
}

if (raw.MAIL_PROVIDER === 'resend' && !raw.RESEND_API_KEY) {
  console.error('\n❌ MAIL_PROVIDER=resend nhưng thiếu RESEND_API_KEY.\n');
  process.exit(1);
}

if (raw.MAIL_PROVIDER === 'sendgrid') {
  if (!raw.SENDGRID_API_KEY) {
    console.error('\n❌ MAIL_PROVIDER=sendgrid nhưng thiếu SENDGRID_API_KEY.\n');
    process.exit(1);
  }
  // SendGrid chỉ nhận thư từ địa chỉ đã được xác minh (Single Sender hoặc
  // Domain Authentication). Địa chỉ mặc định của Resend chắc chắn sẽ bị từ
  // chối với lỗi 403, nên chặn ngay lúc khởi động cho dễ hiểu.
  if (raw.MAIL_FROM.includes('resend.dev')) {
    console.error('\n❌ MAIL_FROM vẫn đang dùng địa chỉ mặc định của Resend.');
    console.error('   SendGrid chỉ gửi được từ địa chỉ đã xác minh trong');
    console.error('   Settings → Sender Authentication.\n');
    process.exit(1);
  }
}

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  isDev: raw.NODE_ENV === 'development',
  corsOrigins: raw.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
} as const;

export type Env = typeof env;
