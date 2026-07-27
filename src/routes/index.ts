import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Nihongo Kizuna API',
      version: 'v1',
      description: 'API nền tảng học tiếng Nhật phi lợi nhuận',
      docs: 'https://github.com/Japanese-Ziec205/BE#readme',
      endpoints: ['/auth', '/users'],
    },
  });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);

export default router;
