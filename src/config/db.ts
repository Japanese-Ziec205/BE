import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

/**
 * maxPoolSize thấp là cố ý: MongoDB Atlas gói M0 chỉ cho 500 connection,
 * và Render free chỉ chạy 1 instance nên không cần pool lớn.
 */
export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => logger.info('✅ MongoDB đã kết nối'));
  mongoose.connection.on('error', (err) => logger.error({ err }, '❌ Lỗi kết nối MongoDB'));
  mongoose.connection.on('disconnected', () => logger.warn('⚠️  MongoDB mất kết nối'));

  await mongoose.connect(env.MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 15_000,
    socketTimeoutMS: 45_000,
    autoIndex: !env.isProd, // production tạo index thủ công để tránh chặn khởi động
  });
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
