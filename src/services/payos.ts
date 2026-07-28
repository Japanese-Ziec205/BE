import crypto from 'node:crypto';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';

/**
 * Tích hợp cổng thanh toán PayOS.
 *
 * Toàn bộ khoá nằm trong biến môi trường — không có giá trị mặc định nào trong
 * mã. Chưa cấu hình thì `isPayosConfigured()` trả false và tầng dịch vụ báo lỗi
 * rõ ràng, thay vì gọi API bằng chuỗi rỗng rồi nhận về lỗi 401 khó hiểu.
 */

const API_BASE = 'https://api-merchant.payos.vn/v2';

export function isPayosConfigured(): boolean {
  return Boolean(env.PAYOS_CLIENT_ID && env.PAYOS_API_KEY && env.PAYOS_CHECKSUM_KEY);
}

function requireConfig() {
  if (!isPayosConfigured()) {
    throw AppError.internal(
      'PAYMENT_NOT_CONFIGURED',
      'Cổng thanh toán chưa được cấu hình. Vui lòng liên hệ ban quản trị.',
    );
  }
  return {
    clientId: env.PAYOS_CLIENT_ID!,
    apiKey: env.PAYOS_API_KEY!,
    checksumKey: env.PAYOS_CHECKSUM_KEY!,
  };
}

function hmac(data: string, key: string): string {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

export interface CreateLinkInput {
  orderCode: number;
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  buyerEmail?: string;
}

/**
 * Chữ ký của yêu cầu tạo link.
 *
 * PayOS quy định ĐÚNG năm trường theo ĐÚNG thứ tự bảng chữ cái này — không
 * phải toàn bộ body. Thêm hay bớt trường, hoặc đổi thứ tự, là chữ ký sai.
 */
function signCreateRequest(input: CreateLinkInput, checksumKey: string): string {
  const raw =
    `amount=${input.amount}` +
    `&cancelUrl=${input.cancelUrl}` +
    `&description=${input.description}` +
    `&orderCode=${input.orderCode}` +
    `&returnUrl=${input.returnUrl}`;
  return hmac(raw, checksumKey);
}

export interface CreateLinkResult {
  checkoutUrl: string;
  paymentLinkId: string;
  qrCode: string;
}

export async function createPaymentLink(input: CreateLinkInput): Promise<CreateLinkResult> {
  const { clientId, apiKey, checksumKey } = requireConfig();

  const body = {
    orderCode: input.orderCode,
    amount: input.amount,
    description: input.description,
    cancelUrl: input.cancelUrl,
    returnUrl: input.returnUrl,
    ...(input.buyerEmail ? { buyerEmail: input.buyerEmail } : {}),
    signature: signCreateRequest(input, checksumKey),
  };

  const res = await fetch(`${API_BASE}/payment-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': clientId,
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => null)) as
    | { code?: string; desc?: string; data?: Record<string, string> }
    | null;

  // PayOS trả HTTP 200 kèm code !== '00' khi thất bại, nên phải kiểm tra cả hai
  if (!res.ok || json?.code !== '00' || !json.data) {
    logger.error(
      { status: res.status, code: json?.code, desc: json?.desc },
      'PayOS từ chối yêu cầu tạo link thanh toán',
    );
    throw AppError.badRequest(
      'PAYMENT_LINK_FAILED',
      `Không tạo được link thanh toán: ${json?.desc ?? `lỗi ${res.status}`}`,
    );
  }

  return {
    checkoutUrl: json.data.checkoutUrl,
    paymentLinkId: json.data.paymentLinkId,
    qrCode: json.data.qrCode,
  };
}

export interface WebhookData {
  orderCode: number;
  amount: number;
  description: string;
  code: string;
  desc: string;
  [key: string]: unknown;
}

/**
 * Xác minh chữ ký webhook.
 *
 * ĐÂY LÀ HÀNG PHÒNG THỦ DUY NHẤT của toàn bộ luồng thanh toán. Địa chỉ webhook
 * là công khai — bất kỳ ai cũng gửi được vào đó một gói tin nói "đơn số 123 đã
 * thanh toán". Thứ duy nhất phân biệt PayOS thật với kẻ giả mạo là chữ ký này,
 * vì chỉ hai bên biết checksum key.
 *
 * Quy tắc ký của PayOS: sắp xếp các khoá của `data` theo thứ tự bảng chữ cái,
 * nối thành `key=value&key=value`, rồi HMAC-SHA256 bằng checksum key.
 * Giá trị null/undefined được ghi thành chuỗi rỗng.
 */
export function verifyWebhookSignature(data: unknown, signature: string): boolean {
  const { checksumKey } = requireConfig();

  if (!data || typeof data !== 'object' || !signature) return false;

  const record = data as Record<string, unknown>;
  const raw = Object.keys(record)
    .sort()
    .map((key) => {
      const value = record[key];
      const normalised =
        value === null || value === undefined || value === 'null' || value === 'undefined'
          ? ''
          : Array.isArray(value) || typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);
      return `${key}=${normalised}`;
    })
    .join('&');

  const expected = hmac(raw, checksumKey);

  /*
   * So sánh theo thời gian hằng định.
   *
   * So bằng === sẽ dừng lại ở byte đầu tiên khác nhau, và chênh lệch thời gian
   * đó đủ để kẻ tấn công dò dần từng byte của chữ ký hợp lệ.
   */
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Sinh mã đơn hàng dạng số.
 *
 * PayOS chỉ nhận số nguyên dương tối đa 9007199254740991. Dùng mốc thời gian
 * mili giây (13 chữ số) ghép ba chữ số ngẫu nhiên: vẫn nằm gọn trong giới hạn,
 * tăng dần theo thời gian nên dễ tra cứu, và hai người bấm mua cùng một
 * mili giây vẫn ra hai mã khác nhau.
 */
export function generateOrderCode(): number {
  return Number(`${Date.now()}${Math.floor(Math.random() * 900) + 100}`.slice(0, 15));
}
