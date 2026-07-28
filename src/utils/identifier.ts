import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { AppError } from './AppError';

export type IdentifierType = 'email' | 'phone';

export interface NormalizedIdentifier {
  type: IdentifierType;
  value: string;
}

/**
 * Chuẩn hoá email.
 * Với Gmail: bỏ dấu chấm và phần +tag, vì Gmail coi
 * `a.b+test@gmail.com` và `ab@gmail.com` là cùng một hộp thư.
 * Không chuẩn hoá thì một người tạo được vô số tài khoản từ cùng email.
 */
export function normalizeEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex <= 0) {
    throw AppError.badRequest('AUTH_INVALID_IDENTIFIER', 'Email không hợp lệ');
  }

  let local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.split('+')[0].replace(/\./g, '');
    return `${local}@gmail.com`;
  }

  // Các nhà cung cấp khác: chỉ bỏ phần +tag, giữ nguyên dấu chấm
  local = local.split('+')[0];
  return `${local}@${domain}`;
}

/**
 * Chuẩn hoá số điện thoại về định dạng E.164, mặc định vùng Việt Nam.
 *
 * Không còn dùng cho đăng ký (xem detectIdentifier) nhưng vẫn giữ để đọc và
 * hiển thị đúng các định danh dạng số đã tồn tại từ trước trong cơ sở dữ liệu.
 */
export function normalizePhone(input: string): string {
  const cleaned = input.replace(/[\s.\-()]/g, '');
  const parsed = parsePhoneNumberFromString(cleaned, 'VN');
  if (!parsed || !parsed.isValid()) {
    throw AppError.badRequest('AUTH_INVALID_IDENTIFIER', 'Số điện thoại không hợp lệ');
  }
  return parsed.number; // dạng +84912345678
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Chuẩn hoá định danh đăng nhập.
 *
 * Hệ thống chỉ nhận EMAIL. Trước đây có nhận cả số điện thoại, nhưng gửi SMS
 * tại Việt Nam đều mất phí và cần đăng ký brandname — không khả thi với một dự
 * án phi lợi nhuận. Không xác thực được số điện thoại thì nó chỉ là một ô nhập
 * ai cũng bịa được, tức là mở đường cho tài khoản rác.
 *
 * Kiểu 'phone' vẫn giữ trong union vì vài tài khoản cũ trong cơ sở dữ liệu còn
 * mang định danh dạng đó; chỉ chặn ở đường vào, không xoá dữ liệu đã có.
 */
export function detectIdentifier(input: string): NormalizedIdentifier {
  const raw = input.trim();
  if (!raw) {
    throw AppError.badRequest('AUTH_INVALID_IDENTIFIER', 'Vui lòng nhập địa chỉ email');
  }

  if (!raw.includes('@')) {
    throw AppError.badRequest(
      'AUTH_INVALID_IDENTIFIER',
      'Vui lòng dùng địa chỉ email. Hệ thống hiện chưa hỗ trợ đăng ký bằng số điện thoại.',
    );
  }

  if (!EMAIL_RE.test(raw)) {
    throw AppError.badRequest('AUTH_INVALID_IDENTIFIER', 'Email không hợp lệ');
  }

  return { type: 'email', value: normalizeEmail(raw) };
}

/** Kiểm tra nhanh, dùng cho zod validator — không ném lỗi. */
export function isValidIdentifier(input: string): boolean {
  try {
    detectIdentifier(input);
    return true;
  } catch {
    return false;
  }
}

/** Che bớt định danh khi trả về client hoặc ghi log: `li***@gmail.com`, `+8491****678`. */
export function maskIdentifier(type: IdentifierType, value: string): string {
  if (type === 'email') {
    const [local, domain] = value.split('@');
    const head = local.slice(0, 2);
    return `${head}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
  }
  return `${value.slice(0, 6)}****${value.slice(-3)}`;
}
