import { Types } from 'mongoose';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { AppError } from '../../utils/AppError';
import { User } from '../../models/User';
import { DailyStat } from '../../models/Learning';
import {
  PLANS,
  PLAN_CODES,
  Payment,
  Subscription,
  isSubscriptionActive,
  type PlanCode,
} from '../../models/Billing';
import {
  createPaymentLink,
  generateOrderCode,
  isPayosConfigured,
  verifyWebhookSignature,
  type WebhookData,
} from '../../services/payos';
import { todayKey } from '../study/study.service';

// ---------------------------------------------------------------------------
// Quyền của gói miễn phí
// ---------------------------------------------------------------------------

/**
 * Số thẻ ôn tập tối đa mỗi ngày cho người dùng miễn phí.
 *
 * Con số này là một sự đánh đổi có chủ đích. Dự án tồn tại để phục vụ người
 * học khó khăn, nên bản miễn phí phải THẬT SỰ dùng được — 30 thẻ mỗi ngày đủ
 * để duy trì tiến độ đều đặn và học xong N5 trong khoảng một năm. Nó chỉ chặn
 * người muốn cày 300 thẻ một buổi, mà đó cũng chính là kiểu học kém hiệu quả
 * nhất theo nguyên lý lặp lại ngắt quãng.
 *
 * Đổi số ở đây là đổi cho toàn hệ thống — không có bản sao nào chỗ khác.
 */
export const FREE_DAILY_REVIEW_LIMIT = 30;

/** Bài học mới mỗi ngày cho gói miễn phí. */
export const FREE_DAILY_LESSON_LIMIT = 3;

export interface Entitlements {
  isPremium: boolean;
  planCode: PlanCode | null;
  expiresAt: Date | null;
  daysRemaining: number;
  canTakeMockExam: boolean;
  reviews: { used: number; limit: number | null; remaining: number | null };
  lessons: { used: number; limit: number | null; remaining: number | null };
}

export async function getEntitlements(userId: string): Promise<Entitlements> {
  const uid = new Types.ObjectId(userId);
  const [subscription, today] = await Promise.all([
    Subscription.findOne({ userId: uid }).lean(),
    DailyStat.findOne({ userId: uid, date: todayKey() }).lean(),
  ]);

  const isPremium = isSubscriptionActive(subscription);
  const reviewsUsed = today?.reviewsDone ?? 0;
  const lessonsUsed = today?.lessonsCompleted ?? 0;

  const daysRemaining =
    isPremium && subscription?.expiresAt
      ? Math.ceil((subscription.expiresAt.getTime() - Date.now()) / 86_400_000)
      : 0;

  return {
    isPremium,
    planCode: isPremium ? (subscription?.planCode ?? null) : null,
    expiresAt: subscription?.expiresAt ?? null,
    daysRemaining,
    // Thi thử là ranh giới rõ ràng giữa hai gói
    canTakeMockExam: isPremium,
    reviews: {
      used: reviewsUsed,
      limit: isPremium ? null : FREE_DAILY_REVIEW_LIMIT,
      remaining: isPremium ? null : Math.max(0, FREE_DAILY_REVIEW_LIMIT - reviewsUsed),
    },
    lessons: {
      used: lessonsUsed,
      limit: isPremium ? null : FREE_DAILY_LESSON_LIMIT,
      remaining: isPremium ? null : Math.max(0, FREE_DAILY_LESSON_LIMIT - lessonsUsed),
    },
  };
}

/** Ném lỗi nếu người dùng miễn phí đã dùng hết lượt ôn tập trong ngày. */
export async function assertReviewQuotaAvailable(userId: string): Promise<void> {
  const ent = await getEntitlements(userId);
  if (ent.isPremium || ent.reviews.remaining === null) return;

  if (ent.reviews.remaining <= 0) {
    throw AppError.forbidden(
      'QUOTA_REVIEW_EXCEEDED',
      `Hôm nay bạn đã ôn hết ${FREE_DAILY_REVIEW_LIMIT} thẻ của gói miễn phí. ` +
        'Lượt mới sẽ được cấp lại vào ngày mai, hoặc bạn có thể nâng gói để ôn không giới hạn.',
      { limit: FREE_DAILY_REVIEW_LIMIT, used: ent.reviews.used },
    );
  }
}

// ---------------------------------------------------------------------------
// Mua gói
// ---------------------------------------------------------------------------

export function listPlans() {
  return PLAN_CODES.map((code) => ({ ...PLANS[code] }));
}

export async function createCheckout(userId: string, planCode: PlanCode) {
  const plan = PLANS[planCode];
  if (!plan) throw AppError.badRequest('PLAN_NOT_FOUND', 'Gói không hợp lệ');

  if (!isPayosConfigured()) {
    throw AppError.internal(
      'PAYMENT_NOT_CONFIGURED',
      'Cổng thanh toán chưa được cấu hình. Vui lòng liên hệ ban quản trị.',
    );
  }

  const user = await User.findById(userId).lean();
  if (!user) throw AppError.notFound('AUTH_USER_NOT_FOUND', 'Không tìm thấy tài khoản');

  const orderCode = generateOrderCode();

  /*
   * Bản ghi đơn được tạo TRƯỚC khi gọi PayOS.
   *
   * Nếu tạo sau, một webhook về nhanh hơn phản hồi của API tạo link sẽ tìm
   * không thấy đơn nào và tiền của người dùng vào rồi mà hệ thống không biết.
   */
  const payment = await Payment.create({
    userId: new Types.ObjectId(userId),
    planCode,
    orderCode,
    amount: plan.amount,
    status: 'pending',
  });

  // PayOS giới hạn mô tả 25 ký tự — dài hơn là bị từ chối
  const description = `Kizuna ${planCode === 'monthly' ? '1 thang' : '6 thang'}`;

  try {
    const link = await createPaymentLink({
      orderCode,
      amount: plan.amount,
      description,
      returnUrl: `${env.FRONTEND_URL}/goi-hoc/ket-qua?ma-don=${orderCode}`,
      cancelUrl: `${env.FRONTEND_URL}/goi-hoc?huy=1`,
      buyerEmail: user.identifiers.find((i) => i.isPrimary)?.value,
    });

    payment.checkoutUrl = link.checkoutUrl;
    payment.paymentLinkId = link.paymentLinkId;
    await payment.save();

    return {
      orderCode,
      amount: plan.amount,
      planNameVi: plan.nameVi,
      checkoutUrl: link.checkoutUrl,
      qrCode: link.qrCode,
    };
  } catch (err) {
    payment.status = 'failed';
    await payment.save();
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

/**
 * Cộng hạn dùng cho một đơn đã thanh toán.
 *
 * Gia hạn cộng DỒN vào hạn cũ nếu gói còn hiệu lực, thay vì tính lại từ hôm
 * nay. Người mua tiếp khi còn 20 ngày mà bị mất 20 ngày đó thì đúng nghĩa là
 * bị phạt vì đã ủng hộ sớm.
 */
async function grantSubscription(payment: {
  userId: Types.ObjectId;
  planCode: PlanCode;
  amount: number;
  _id: Types.ObjectId;
}) {
  const plan = PLANS[payment.planCode];
  const existing = await Subscription.findOne({ userId: payment.userId });

  const base =
    existing && isSubscriptionActive(existing) && existing.expiresAt
      ? existing.expiresAt.getTime()
      : Date.now();
  const expiresAt = new Date(base + plan.durationDays * 86_400_000);

  await Subscription.updateOne(
    { userId: payment.userId },
    {
      $set: { planCode: payment.planCode, expiresAt, lastPaymentId: payment._id },
      $inc: { totalPaidAmount: payment.amount },
    },
    { upsert: true },
  );

  return expiresAt;
}

export async function handleWebhook(body: {
  code?: string;
  data?: WebhookData;
  signature?: string;
}) {
  /*
   * Xác minh chữ ký TRƯỚC MỌI THỨ KHÁC.
   *
   * Địa chỉ này công khai trên internet. Không có bước này thì bất kỳ ai gửi
   * được một request HTTP đều tự cấp cho mình gói trả phí vĩnh viễn.
   */
  if (!body.data || !body.signature || !verifyWebhookSignature(body.data, body.signature)) {
    logger.warn(
      { orderCode: body.data?.orderCode },
      'Webhook thanh toán có chữ ký không hợp lệ — đã từ chối',
    );
    throw AppError.unauthorized('PAYMENT_BAD_SIGNATURE', 'Chữ ký không hợp lệ');
  }

  const { orderCode, code } = body.data;
  const payment = await Payment.findOne({ orderCode });
  if (!payment) {
    logger.warn({ orderCode }, 'Webhook trỏ tới đơn không tồn tại');
    // Trả 200 cho PayOS: đơn không tồn tại thì gửi lại bao nhiêu lần cũng vậy
    return { received: true, matched: false };
  }

  /*
   * Đã xử lý rồi thì bỏ qua.
   *
   * PayOS gửi lại webhook khi không nhận được phản hồi 200, và mạng thì không
   * đáng tin. Thiếu chốt này, một lần gửi lại là cộng thêm 30 ngày miễn phí.
   */
  if (payment.status === 'paid') {
    return { received: true, matched: true, alreadyProcessed: true };
  }

  const succeeded = code === '00';
  payment.gatewayPayload = body.data;

  if (!succeeded) {
    payment.status = 'failed';
    await payment.save();
    return { received: true, matched: true, status: 'failed' };
  }

  /*
   * Đối chiếu số tiền.
   *
   * Không kiểm tra thì một đơn 10.000đ bị sửa thành thanh toán 1.000đ vẫn được
   * cấp trọn gói. Số tiền phải khớp đúng với giá của gói đã ghi trong đơn.
   */
  if (Number(body.data.amount) !== payment.amount) {
    logger.error(
      { orderCode, expected: payment.amount, received: body.data.amount },
      'Số tiền thanh toán không khớp với đơn hàng',
    );
    payment.status = 'failed';
    await payment.save();
    throw AppError.badRequest('PAYMENT_AMOUNT_MISMATCH', 'Số tiền thanh toán không khớp');
  }

  payment.status = 'paid';
  payment.paidAt = new Date();
  await payment.save();

  const expiresAt = await grantSubscription({
    userId: payment.userId,
    planCode: payment.planCode,
    amount: payment.amount,
    _id: payment._id,
  });

  logger.info({ orderCode, userId: String(payment.userId), expiresAt }, 'Đã kích hoạt gói trả phí');
  return { received: true, matched: true, status: 'paid' };
}

// ---------------------------------------------------------------------------
// Tra cứu
// ---------------------------------------------------------------------------

export async function getPaymentStatus(userId: string, orderCode: number) {
  const payment = await Payment.findOne({
    orderCode,
    userId: new Types.ObjectId(userId),
  }).lean();

  if (!payment) throw AppError.notFound('PAYMENT_NOT_FOUND', 'Không tìm thấy đơn hàng này');

  return {
    orderCode: payment.orderCode,
    planCode: payment.planCode,
    planNameVi: PLANS[payment.planCode].nameVi,
    amount: payment.amount,
    status: payment.status,
    paidAt: payment.paidAt,
    checkoutUrl: payment.checkoutUrl,
  };
}

export async function listMyPayments(userId: string) {
  const payments = await Payment.find({ userId: new Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return payments.map((p) => ({
    orderCode: p.orderCode,
    planNameVi: PLANS[p.planCode].nameVi,
    amount: p.amount,
    status: p.status,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
  }));
}
