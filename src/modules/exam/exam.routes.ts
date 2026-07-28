import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { requirePermission } from '../../middlewares/rbac';
import { ok, created } from '../../utils/response';
import * as exam from './exam.service';

const router = Router();
router.use(authenticate);

router.post(
  '/generate',
  validate(
    z.object({
      levelCode: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']),
      variant: z.string().optional(),
    }),
  ),
  asyncHandler(async (req: Request, res: Response) =>
    created(res, await exam.generateExam(req.user!.id, req.body.levelCode, req.body.variant)),
  ),
);

router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => ok(res, await exam.listHistory(req.user!.id))),
);

router.get(
  '/pool-health',
  requirePermission('exam.create'),
  asyncHandler(async (req: Request, res: Response) =>
    ok(
      res,
      await exam.checkPoolHealth(
        (req.query.level as string) ?? 'N5',
        // Thiếu tham số này thì mọi lần kiểm tra đều trả về bản 'standard',
        // và quản trị viên sẽ tưởng biến thể mình đang soạn vẫn ổn.
        (req.query.variant as string) ?? 'standard',
      ),
    ),
  ),
);

router.get(
  '/attempts/:id',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await exam.getAttempt(req.user!.id, req.params.id)),
  ),
);

router.post(
  '/attempts/:id/sections/:code/start',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await exam.startSection(req.user!.id, req.params.id, req.params.code)),
  ),
);

router.patch(
  '/attempts/:id/answers',
  validate(
    z.object({
      answers: z
        .array(
          z.object({
            order: z.number().int().positive(),
            answer: z.unknown(),
            flagged: z.boolean().optional(),
          }),
        )
        .max(100),
    }),
  ),
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await exam.saveAnswers(req.user!.id, req.params.id, req.body.answers)),
  ),
);

router.post(
  '/attempts/:id/sections/:code/finish',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await exam.finishSection(req.user!.id, req.params.id, req.params.code)),
  ),
);

router.post(
  '/attempts/:id/submit',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await exam.submitExam(req.user!.id, req.params.id)),
  ),
);

router.get(
  '/attempts/:id/result',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await exam.getResult(req.user!.id, req.params.id)),
  ),
);

router.get(
  '/attempts/:id/review',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await exam.reviewAttempt(req.user!.id, req.params.id)),
  ),
);

export default router;
