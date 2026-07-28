import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { ok } from '../../utils/response';
import { PLAN_CODES } from '../../models/Billing';
import { isPayosConfigured } from '../../services/payos';
import * as billing from './billing.service';

const router = Router();

/**
 * Webhook của PayOS — KHÔNG có `authenticate`.
 *
 * Cổng thanh toán không mang theo access token của người dùng nào cả. Xác thực
 * ở đây hoàn toàn dựa vào chữ ký HMAC trong thân request, được kiểm tra ngay
 * dòng đầu của handleWebhook().
 *
 * Đặt TRƯỚC router.use(authenticate) bên dưới, nếu không middleware xác thực
 * sẽ chặn PayOS lại bằng lỗi 401 và không đơn nào được ghi nhận.
 */
router.post(
  '/webhook',
  asyncHandler(async (req: Request, res: Response) => ok(res, await billing.handleWebhook(req.body))),
);

/** Danh sách gói là thông tin công khai — khách chưa đăng nhập cũng cần xem giá. */
router.get('/plans', (_req: Request, res: Response) =>
  ok(res, {
    plans: billing.listPlans(),
    // Cho giao diện biết để ẩn nút mua thay vì cho bấm rồi báo lỗi
    paymentAvailable: isPayosConfigured(),
    freeTier: {
      dailyReviewLimit: billing.FREE_DAILY_REVIEW_LIMIT,
      dailyLessonLimit: billing.FREE_DAILY_LESSON_LIMIT,
    },
  }),
);

router.use(authenticate);

router.get(
  '/entitlements',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await billing.getEntitlements(req.user!.id)),
  ),
);

router.post(
  '/checkout',
  validate(z.object({ planCode: z.enum(PLAN_CODES as [string, ...string[]]) })),
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await billing.createCheckout(req.user!.id, req.body.planCode)),
  ),
);

router.get(
  '/payments',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await billing.listMyPayments(req.user!.id)),
  ),
);

router.get(
  '/payments/:orderCode',
  asyncHandler(async (req: Request, res: Response) =>
    ok(res, await billing.getPaymentStatus(req.user!.id, Number(req.params.orderCode))),
  ),
);

export default router;
