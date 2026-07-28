import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * Hai gói duy nhất. Định nghĩa nằm trong mã chứ không trong cơ sở dữ liệu:
 * giá của một dự án phi lợi nhuận không đổi thường xuyên, và để trong mã thì
 * mọi thay đổi giá đều đi qua code review thay vì sửa thẳng trên production.
 */
export const PLANS = {
  monthly: {
    code: 'monthly' as const,
    nameVi: 'Gói 1 tháng',
    /** Đơn vị là ĐỒNG, không phải nghìn đồng. PayOS nhận số nguyên tiền đồng. */
    amount: 10_000,
    durationDays: 30,
    descriptionVi: 'Mở khoá thi thử và bỏ giới hạn ôn tập trong 30 ngày.',
  },
  half_year: {
    code: 'half_year' as const,
    nameVi: 'Gói 6 tháng',
    amount: 50_000,
    durationDays: 180,
    descriptionVi: 'Sáu tháng trọn gói — rẻ hơn gần một nửa so với mua từng tháng.',
  },
} as const;

export type PlanCode = keyof typeof PLANS;
export const PLAN_CODES = Object.keys(PLANS) as PlanCode[];

export type PaymentStatus = 'pending' | 'paid' | 'cancelled' | 'expired' | 'failed';

export interface IPayment extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  planCode: PlanCode;
  /** Mã đơn hàng dạng SỐ mà PayOS yêu cầu; cũng là khoá đối soát của hệ thống. */
  orderCode: number;
  amount: number;
  status: PaymentStatus;
  checkoutUrl: string;
  paymentLinkId: string;
  /** Nguyên văn dữ liệu webhook, giữ lại để tra khi có tranh chấp thanh toán. */
  gatewayPayload: unknown;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planCode: { type: String, enum: PLAN_CODES, required: true },
    // Duy nhất trên toàn hệ thống: PayOS dùng nó làm định danh đơn, và nó cũng
    // là thứ chặn việc một webhook bị gửi lại hai lần cộng hạn dùng hai lần.
    orderCode: { type: Number, required: true, unique: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled', 'expired', 'failed'],
      default: 'pending',
      index: true,
    },
    checkoutUrl: { type: String, default: '' },
    paymentLinkId: { type: String, default: '' },
    gatewayPayload: { type: Schema.Types.Mixed, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

paymentSchema.index({ userId: 1, createdAt: -1 });

export const Payment = model<IPayment>('Payment', paymentSchema);

// ---------------------------------------------------------------------------
// Quyền sử dụng
// ---------------------------------------------------------------------------

export interface ISubscription extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  planCode: PlanCode | null;
  /** Hết hạn thì `expiresAt` nằm trong quá khứ — KHÔNG xoá bản ghi. */
  expiresAt: Date | null;
  lastPaymentId: Types.ObjectId | null;
  totalPaidAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    planCode: { type: String, enum: [...PLAN_CODES, null], default: null },
    expiresAt: { type: Date, default: null, index: true },
    lastPaymentId: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
    totalPaidAmount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Subscription = model<ISubscription>('Subscription', subscriptionSchema);

/**
 * Còn hạn hay không được tính từ `expiresAt`, KHÔNG lưu cờ `isActive`.
 *
 * Cờ boolean sẽ cần một tác vụ định kỳ để tắt đi lúc hết hạn, và ngày mà tác
 * vụ đó chết là ngày cả trăm người dùng miễn phí vẫn giữ quyền trả phí mà
 * không ai biết. So sánh mốc thời gian thì không thể sai lệch được.
 */
export function isSubscriptionActive(sub: { expiresAt: Date | null } | null): boolean {
  return sub?.expiresAt != null && sub.expiresAt.getTime() > Date.now();
}
