import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

/**
 * maxPoolSize thấp là cố ý: MongoDB Atlas gói M0 chỉ cho 500 connection,
 * và Render free chỉ chạy 1 instance nên không cần pool lớn.
 */
const MAX_ATTEMPTS = 4;

/**
 * Thử lại vài lần trước khi bỏ cuộc.
 *
 * Trên Render gói miễn phí, kết nối tới Atlas lúc deploy thỉnh thoảng trượt vì
 * DNS hoặc mạng chớp. Không có retry thì tiến trình thoát, health check trượt và
 * cả lần deploy bị đánh là thất bại dù cấu hình hoàn toàn đúng.
 * Hết số lần thử vẫn ném lỗi — vẫn giữ nguyên tinh thần fail-fast.
 */
export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => logger.info('✅ MongoDB đã kết nối'));
  mongoose.connection.on('error', (err) => logger.error({ err: err?.message }, '❌ Lỗi MongoDB'));
  mongoose.connection.on('disconnected', () => logger.warn('⚠️  MongoDB mất kết nối'));

  const options = {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 15_000,
    socketTimeoutMS: 45_000,
    autoIndex: !env.isProd, // production tạo index thủ công để tránh chặn khởi động
  };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await mongoose.connect(env.MONGODB_URI, options);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (attempt === MAX_ATTEMPTS) {
        logger.fatal(`Không kết nối được MongoDB sau ${MAX_ATTEMPTS} lần thử: ${message}`);

        /**
         * "bad auth" nghĩa là mạng đã thông và server đã trả lời — chỉ có
         * thông tin đăng nhập bị từ chối. Nguyên nhân hay gặp nhất KHÔNG phải
         * sai mật khẩu mà là thiếu authSource: khi chuỗi kết nối có tên
         * database ở phần đường dẫn, driver mặc định đi xác thực ngay tại
         * database đó thay vì ở 'admin' — nơi Atlas thực sự lưu tài khoản.
         */
        if (/bad auth|Authentication failed/i.test(message)) {
          const hasAuthSource = /[?&]authSource=/i.test(env.MONGODB_URI);
          logger.fatal('Máy chủ đã trả lời, chỉ có thông tin đăng nhập bị từ chối.');
          if (!hasAuthSource) {
            logger.fatal('  ⚠️ Chuỗi kết nối THIẾU authSource=admin — gần như chắc chắn là lỗi này.');
            logger.fatal('     Chuỗi có tên database ở đường dẫn thì driver xác thực ngay tại');
            logger.fatal("     database đó, trong khi tài khoản Atlas nằm ở 'admin'.");
            logger.fatal('     Sửa: thêm &authSource=admin vào cuối MONGODB_URI');
          } else {
            logger.fatal('  1. Mật khẩu trong MONGODB_URI có khớp với Atlas → Database Access không?');
            logger.fatal('  2. Mật khẩu có ký tự đặc biệt (@ : / ? # %) chưa mã hoá URL không?');
            logger.fatal('  3. Tên người dùng có gõ đúng không?');
          }
        } else {
          logger.fatal('Kiểm tra lần lượt:');
          logger.fatal('  1. MONGODB_URI đã đúng chưa (user, mật khẩu, tên database)?');
          logger.fatal('  2. Atlas → Network Access đã cho phép 0.0.0.0/0 chưa?');
          logger.fatal('     Render gói miễn phí không có IP tĩnh nên bắt buộc mở toàn bộ.');
          logger.fatal('  3. Cluster có đang tạm dừng (paused) không?');
        }
        throw err;
      }

      const waitMs = attempt * 3_000;
      logger.warn(`Kết nối MongoDB thất bại (lần ${attempt}/${MAX_ATTEMPTS}): ${message}`);
      logger.warn(`Thử lại sau ${waitMs / 1000} giây...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
  logger.info('MongoDB đã đóng kết nối');
}

const DB_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

export function getDbState(): string {
  return DB_STATES[mongoose.connection.readyState] ?? 'unknown';
}
