import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';

import { env } from './config/env';
import { logger } from './config/logger';
import { requestId } from './middlewares/requestId';
import { generalLimiter } from './middlewares/rateLimit';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import apiRoutes from './routes';
import healthRoutes from './modules/health/health.routes';

export function createApp() {
  const app = express();

  // Render đứng sau proxy — cần bật để req.ip lấy đúng IP thật của client,
  // nếu không thì rate limit theo IP sẽ gom tất cả người dùng vào một IP proxy.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.use(
    cors({
      origin(origin, callback) {
        // Cho phép request không có Origin: health check, Postman, gọi từ server
        if (!origin) return callback(null, true);
        if (env.corsOrigins.includes(origin)) return callback(null, true);
        // Cho phép mọi preview deployment của Vercel thuộc dự án
        if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return callback(null, true);
        logger.warn({ origin }, 'CORS: origin bị từ chối');
        return callback(new Error('CORS: origin không được phép'));
      },
      credentials: true, // bắt buộc để trình duyệt gửi kèm cookie refresh
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-CSRF-Token'],
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestId);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as { requestId?: string }).requestId ?? '',
      autoLogging: {
        // Cron ping mỗi 10 phút sẽ làm ngập log nếu không bỏ qua
        ignore: (req) => req.url === '/health' || req.url === '/api/v1/health',
      },
    }),
  );

  app.use('/health', healthRoutes);
  app.use('/api/v1/health', healthRoutes);

  app.use('/api/v1', generalLimiter, apiRoutes);

  app.get('/', (_req, res) => {
    res.json({
      name: 'Nihongo Kizuna API',
      message: 'Học tiếng Nhật miễn phí cho mọi người 🌸',
      health: '/health',
      api: '/api/v1',
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
