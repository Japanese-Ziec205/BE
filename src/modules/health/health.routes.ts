import { Router, type Request, type Response } from 'express';
import { getDbState } from '../../config/db';
import { env } from '../../config/env';

const router = Router();
const startedAt = Date.now();

/**
 * Endpoint này phục vụ hai việc:
 *  1. Health check của Render.
 *  2. Cron ping mỗi 10 phút để instance free tier không bị ngủ
 *     (ngủ rồi thì người dùng đầu tiên phải chờ 30-60 giây cold-start).
 * Vì vậy nó phải cực nhẹ và không chạm database.
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'nihongo-kizuna-api',
    version: process.env.npm_package_version ?? '0.1.0',
    environment: env.NODE_ENV,
    dbState: getDbState(),
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
});

export default router;
