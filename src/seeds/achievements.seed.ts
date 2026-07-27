import { Achievement } from '../models/Gamification';
import { logger } from '../config/logger';
import { ACHIEVEMENTS } from './data/achievements.data';

export async function seedAchievements(): Promise<number> {
  await Achievement.bulkWrite(
    ACHIEVEMENTS.map((a) => ({
      updateOne: {
        filter: { code: a.code },
        update: { $set: { ...a, isSecret: false, isActive: true } },
        upsert: true,
      },
    })),
  );
  logger.info(`   Huy hiệu: ${ACHIEVEMENTS.length}`);
  return ACHIEVEMENTS.length;
}
