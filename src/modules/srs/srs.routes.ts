import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { ok } from '../../utils/response';
import * as srs from './srs.service';
import * as study from '../study/study.service';
import * as lessons from '../lessons/lessons.service';

const router = Router();
router.use(authenticate);

// ---------------------------------------------------------------------------
// Ôn tập
// ---------------------------------------------------------------------------

router.get(
  '/srs/queue',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await srs.buildQueue(req.user!.id, Math.min(50, Number(req.query.limit) || 30))),
  ),
);

const reviewSchema = z.object({
  cardId: z.string().min(1),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  responseMs: z.number().int().min(0).max(600_000).optional(),
});

router.post(
  '/srs/review',
  validate(reviewSchema),
  asyncHandler(async (req: Request, res: Response) =>
    ok(
      res,
      await srs.reviewCard(req.user!.id, req.body.cardId, req.body.rating, req.body.responseMs ?? 0),
    ),
  ),
);

router.get(
  '/srs/stats',
  asyncHandler(async (req: Request, res: Response) => ok(res, await srs.getStats(req.user!.id))),
);

router.get(
  '/srs/leeches',
  asyncHandler(async (req: Request, res: Response) => ok(res, await srs.listLeeches(req.user!.id))),
);

router.post(
  '/srs/cards/:id/reset',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await srs.resetCard(req.user!.id, req.params.id)),
  ),
);

// ---------------------------------------------------------------------------
// Ghi nhận giờ học
// ---------------------------------------------------------------------------

const startSessionSchema = z.object({
  type: z.enum(['lesson', 'srs', 'exam', 'practice', 'reading', 'writing']).default('practice'),
  refId: z.string().optional(),
});

router.post(
  '/study/sessions/start',
  validate(startSessionSchema),
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await study.startSession(req.user!.id, req.body)),
  ),
);

router.post(
  '/study/heartbeat',
  validate(z.object({ sessionId: z.string().min(1) })),
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await study.heartbeat(req.user!.id, req.body.sessionId)),
  ),
);

router.post(
  '/study/sessions/:id/end',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await study.endSession(req.user!.id, req.params.id)),
  ),
);

router.get(
  '/study/today',
  asyncHandler(async (req: Request, res: Response) => ok(res, await study.getToday(req.user!.id))),
);

router.get(
  '/study/history',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await study.getHistory(req.user!.id, Math.min(90, Number(req.query.days) || 30))),
  ),
);

// ---------------------------------------------------------------------------
// Bài học
// ---------------------------------------------------------------------------

router.get(
  '/lessons',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await lessons.listLessons(req.user!.id, req.query.level as string | undefined)),
  ),
);

router.get(
  '/lessons/:slug',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await lessons.getLesson(req.user!.id, req.params.slug)),
  ),
);

router.post(
  '/lessons/:id/progress',
  validate(z.object({ lastBlockIndex: z.number().int().min(0) })),
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await lessons.saveProgress(req.user!.id, req.params.id, req.body.lastBlockIndex)),
  ),
);

router.post(
  '/lessons/:id/complete',
  validate(z.object({ quizScore: z.number().min(0).max(100).optional() })),
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await lessons.completeLesson(req.user!.id, req.params.id, req.body.quizScore)),
  ),
);

export default router;
