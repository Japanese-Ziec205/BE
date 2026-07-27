import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/db';

async function bootstrap() {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`🌸 Nihongo Kizuna API đang chạy tại http://localhost:${env.PORT}`);
    logger.info(`   Môi trường : ${env.NODE_ENV}`);
    logger.info(`   CORS       : ${env.corsOrigins.join(', ')}`);
    logger.info(`   Email      : ${env.MAIL_PROVIDER}`);
  });

  /**
   * Render gửi SIGTERM khi deploy phiên bản mới. Đóng server một cách có trật tự
   * để các request đang xử lý dở không bị cắt giữa chừng.
   */
  const shutdown = (signal: string) => async () => {
    logger.info(`Nhận ${signal}, đang tắt server...`);
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Đã tắt an toàn');
      process.exit(0);
    });
    // Nếu 10 giây vẫn chưa đóng xong thì buộc thoát
    setTimeout(() => {
      logger.error('Tắt không kịp thời hạn, buộc thoát');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', shutdown('SIGTERM'));
  process.on('SIGINT', shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Promise bị từ chối mà không được bắt');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Ngoại lệ không được bắt — thoát tiến trình');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  // Chỉ in thông điệp, không đổ nguyên object lỗi: stack của Mongoose dài hàng
  // trăm dòng JSON, làm trôi mất phần hướng dẫn khắc phục ngay phía trên.
  logger.fatal(`Không khởi động được server: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
