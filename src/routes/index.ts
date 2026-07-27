import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';
import cmsRoutes from '../modules/cms/cms.routes';
import publicRoutes from '../modules/public/public.routes';
import learningRoutes from '../modules/srs/srs.routes';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Nihongo Kizuna API',
      version: 'v1',
      description: 'API nền tảng học tiếng Nhật phi lợi nhuận',
      docs: 'https://github.com/Japanese-Ziec205/BE#readme',
      endpoints: ['/auth', '/users', '/cms', '/public', '/srs', '/study', '/lessons'],
    },
  });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/cms', cmsRoutes);
router.use('/public', publicRoutes);
// srs, study và lessons dùng chung một router vì liên quan chặt tới nhau
router.use('/', learningRoutes);

export default router;
