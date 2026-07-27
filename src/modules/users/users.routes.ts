import { Router, type Request, type Response } from 'express';
import { asyncHandler, validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { ok } from '../../utils/response';
import * as service from './users.service';
import {
  updateLearningProfileSchema,
  updateProfileSchema,
  updateSettingsSchema,
} from './users.validators';

const router = Router();

router.use(authenticate);

router.get(
  '/me',
  asyncHandler(async (req: Request, res: Response) => ok(res, await service.getProfile(req.user!.id))),
);

router.patch(
  '/me',
  validate(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await service.updateProfile(req.user!.id, req.body, req)),
  ),
);

router.patch(
  '/me/settings',
  validate(updateSettingsSchema),
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await service.updateSettings(req.user!.id, req.body)),
  ),
);

router.patch(
  '/me/learning',
  validate(updateLearningProfileSchema),
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await service.updateLearningProfile(req.user!.id, req.body)),
  ),
);

router.get(
  '/me/stats',
  asyncHandler(async (req: Request, res: Response) => ok(res, await service.getStats(req.user!.id))),
);

router.delete(
  '/me',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await service.softDeleteAccount(req.user!.id, req)),
  ),
);

export default router;
