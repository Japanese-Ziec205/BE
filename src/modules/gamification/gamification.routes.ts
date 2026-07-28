import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { ok } from '../../utils/response';
import * as game from './gamification.service';
import { LearningProfile } from '../../models/LearningProfile';

const router = Router();
router.use(authenticate);

router.get(
  '/profile',
  asyncHandler(async (req: Request, res: Response) => ok(res, await game.getProfile(req.user!.id))),
);

router.get(
  '/achievements',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await game.listAchievements(req.user!.id)),
  ),
);

/**
 * Bảng xếp hạng của MỘT cấp độ. Mặc định lấy cấp người dùng đang học.
 *
 * Mỗi cấp một bảng riêng: xếp chung thì người mới bắt đầu N5 luôn nằm cuối
 * bảng sau những người đã học N2 nhiều năm, và bảng xếp hạng thành thứ làm
 * nản lòng đúng nhóm người cần được khích lệ nhất.
 */
router.get(
  '/leaderboard',
  asyncHandler(async (req: Request, res: Response) => {
    const profile = await LearningProfile.findOne({ userId: req.user!.id })
      .select('currentLevelCode')
      .lean();
    const level = ((req.query.level as string) ?? profile?.currentLevelCode ?? 'N5').toUpperCase();

    return ok(
      res,
      await game.getLeaderboard(
        req.user!.id,
        level,
        Number(req.query.page) || 1,
        Number(req.query.limit) || 20,
      ),
    );
  }),
);

router.get(
  '/notifications',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await game.listNotifications(req.user!.id)),
  ),
);

router.patch(
  '/notifications/:id/read',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await game.markNotificationRead(req.user!.id, req.params.id)),
  ),
);

export default router;
