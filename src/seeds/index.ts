import { logger } from '../config/logger';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { seedAllLanguage } from './language.seed';

/**
 * Nạp toàn bộ kho tài sản ngôn ngữ. Chạy: npm run seed
 * Script idempotent — chạy lại nhiều lần không tạo bản ghi trùng.
 */
async function main() {
  await connectDatabase();
  const result = await seedAllLanguage();

  logger.info('');
  logger.info('📊 Tổng kết:');
  logger.info(`   Kana        : ${result.kana.hiragana} Hiragana + ${result.kana.katakana} Katakana`);
  logger.info(`   Bộ thủ      : ${result.radicals}`);
  logger.info(`   Kanji N5    : ${result.kanji}`);
  logger.info(`   Từ vựng     : ${result.vocabulary} (mẫu)`);
  logger.info(`   Ngữ pháp N5 : ${result.grammar}`);
  logger.info(`   Kotowaza    : ${result.kotowaza}`);
  logger.info('');

  await disconnectDatabase();
}

main().catch(async (err) => {
  logger.fatal(`Seed thất bại: ${err instanceof Error ? err.message : String(err)}`);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
