import pino from 'pino';
import { env } from './env';

/**
 * Ở môi trường phát triển dùng pino-pretty cho dễ đọc.
 * Ở production giữ nguyên JSON để Render Logs parse được.
 */
export const logger = pino({
  level: env.isProd ? 'info' : 'debug',
  // Không bao giờ để mật khẩu / token lọt vào log
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.newPassword',
      'req.body.currentPassword',
      'req.body.code',
      'res.headers["set-cookie"]',
    ],
    censor: '[ĐÃ ẨN]',
  },
  ...(env.isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
});
