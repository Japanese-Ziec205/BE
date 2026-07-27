import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { ok } from '../../utils/response';
import * as game from './gamification.service';

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
