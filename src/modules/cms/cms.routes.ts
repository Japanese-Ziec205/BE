import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { requirePermission } from '../../middlewares/rbac';
import { ok, created, paginated, buildPagination } from '../../utils/response';
import * as service from './cms.service';
import { importFromCsv, buildCsvTemplate } from './cms.import';

const router = Router();
router.use(authenticate);

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.string().optional(),
  level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']).optional(),
  search: z.string().optional(),
});

const reviewDecisionSchema = z.object({
  decision: z.enum(['approve', 'request_changes', 'reject']),
  note: z.string().max(2000).optional(),
});

const reportSchema = z.object({
  targetType: z.string(),
  targetId: z.string(),
  reason: z.enum(['wrong_answer', 'typo', 'unclear', 'audio_broken', 'above_level', 'other']),
  description: z.string().max(1000).optional(),
});

// --- Hàng chờ duyệt (đặt TRƯỚC route :type để không bị nuốt) ---
router.get(
  '/review/queue',
  requirePermission('content.review'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await service.listReviewQueue({
      status: req.query.status as string | undefined,
      type: req.query.type as string | undefined,
      page: Number(req.query.page) || 1,
    });
    return paginated(res, result.items, buildPagination(result.page, result.limit, result.total));
  }),
);

router.post(
  '/review/:taskId',
  requirePermission('content.review'),
  validate(reviewDecisionSchema),
  asyncHandler(async (req: Request, res: Response) =>
    ok(
      res,
      await service.reviewContent(
        req.params.taskId,
        req.user!.id,
        req.body.decision,
        req.body.note ?? '',
        req,
      ),
    ),
  ),
);

// --- Báo lỗi nội dung (mọi người dùng đã đăng nhập đều báo được) ---
router.post(
  '/reports',
  validate(reportSchema),
  asyncHandler(async (req: Request, res: Response) =>
    created(res, await service.reportContent(req.user!.id, req.body)),
  ),
);

// --- Nhập hàng loạt ---
router.get(
  '/import/:type/template',
  requirePermission('content.create'),
  asyncHandler(async (req: Request, res: Response) => {
    const csv = buildCsvTemplate(req.params.type);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mau-${req.params.type}.csv"`);
    return res.send('﻿' + csv); // BOM để Excel đọc đúng tiếng Việt
  }),
);

router.post(
  '/import/:type',
  requirePermission('content.create'),
  validate(z.object({ csv: z.string().min(1), dryRun: z.boolean().optional() })),
  asyncHandler(async (req: Request, res: Response) =>
    ok(
      res,
      await importFromCsv(req.params.type, req.body.csv, req.user!.id, req.body.dryRun ?? false),
    ),
  ),
);

// --- CRUD chung theo loại nội dung ---
router.get(
  '/:type',
  requirePermission('content.read.draft'),
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await service.listContent(req.params.type, req.user!, req.query as never);
    return paginated(res, result.items, buildPagination(result.page, result.limit, result.total));
  }),
);

router.get(
  '/:type/:id',
  requirePermission('content.read.draft'),
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await service.getContent(req.params.type, req.params.id)),
  ),
);

router.post(
  '/:type',
  requirePermission('content.create'),
  asyncHandler(async (req: Request, res: Response) =>
    created(res, await service.createContent(req.params.type, req.user!.id, req.body, req)),
  ),
);

router.patch(
  '/:type/:id',
  requirePermission('content.update.own'),
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await service.updateContent(req.params.type, req.params.id, req.user!, req.body, req)),
  ),
);

router.post(
  '/:type/:id/submit',
  requirePermission('content.create'),
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await service.submitForReview(req.params.type, req.params.id, req.user!.id, req)),
  ),
);

router.post(
  '/:type/:id/publish',
  requirePermission('content.publish'),
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await service.publishContent(req.params.type, req.params.id, req.user!.id, req)),
  ),
);

router.post(
  '/:type/:id/archive',
  requirePermission('content.archive'),
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await service.archiveContent(req.params.type, req.params.id, req.user!.id, req)),
  ),
);

router.get(
  '/:type/:id/revisions',
  requirePermission('content.read.draft'),
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await service.getRevisions(req.params.type, req.params.id)),
  ),
);

router.post(
  '/:type/:id/restore/:version',
  requirePermission('content.update.any'),
  asyncHandler(async (req: Request, res: Response) =>
    ok(
      res,
      await service.restoreRevision(
        req.params.type,
        req.params.id,
        Number(req.params.version),
        req.user!.id,
        req,
      ),
    ),
  ),
);

export default router;
