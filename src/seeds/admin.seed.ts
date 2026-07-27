import { env } from '../config/env';
import { logger } from '../config/logger';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { User } from '../models/User';
import { LearningProfile } from '../models/LearningProfile';
import { hashPassword } from '../utils/crypto';
import { normalizeEmail } from '../utils/identifier';

/**
 * Tạo tài khoản quản trị đầu tiên. Chạy: npm run seed:admin
 * Script idempotent — chạy nhiều lần không tạo trùng.
 */
async function seedAdmin() {
  if (!env.ADMIN_SEED_EMAIL || !env.ADMIN_SEED_PASSWORD) {
    logger.error('Thiếu ADMIN_SEED_EMAIL hoặc ADMIN_SEED_PASSWORD trong .env');
    process.exit(1);
  }

  await connectDatabase();

  const email = normalizeEmail(env.ADMIN_SEED_EMAIL);
  const existing = await User.findOne({ 'identifiers.value': email, deletedAt: null });

  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      logger.info(`✅ Đã nâng ${email} lên vai trò admin`);
    } else {
      logger.info(`ℹ️  Tài khoản admin ${email} đã tồn tại, không tạo lại`);
    }
    await disconnectDatabase();
    return;
  }

  const admin = await User.create({
    identifiers: [{ type: 'email', value: email, verifiedAt: new Date(), isPrimary: true }],
    passwordHash: await hashPassword(env.ADMIN_SEED_PASSWORD),
    profile: { displayName: env.ADMIN_SEED_NAME, avatarPreset: 0 },
    role: 'admin',
    status: 'active',
    registeredVia: 'email',
  });

  await LearningProfile.create({ userId: admin._id, onboardingCompleted: true });

  logger.info('');
  logger.info('✅ Đã tạo tài khoản quản trị:');
  logger.info(`   Email    : ${email}`);
  logger.info(`   Mật khẩu : ${env.ADMIN_SEED_PASSWORD}`);
  logger.info('');
  logger.warn('⚠️  ĐỔI MẬT KHẨU NGAY sau lần đăng nhập đầu tiên!');
  logger.info('');

  await disconnectDatabase();
}

seedAdmin().catch(async (err) => {
  logger.fatal({ err }, 'Seed admin thất bại');
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
