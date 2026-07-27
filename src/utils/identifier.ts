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

/** Chuẩn hoá số điện thoại về định dạng E.164, mặc định vùng Việt Nam. */
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
 * Tự nhận diện người dùng nhập email hay số điện thoại.
 * Nhờ vậy giao diện chỉ cần MỘT ô nhập, không bắt chọn tab.
 */
export function detectIdentifier(input: string): NormalizedIdentifier {
  const raw = input.trim();
  if (!raw) {
    throw AppError.badRequest('AUTH_INVALID_IDENTIFIER', 'Vui lòng nhập email hoặc số điện thoại');
  }

  if (raw.includes('@')) {
    if (!EMAIL_RE.test(raw)) {
      throw AppError.badRequest('AUTH_INVALID_IDENTIFIER', 'Email không hợp lệ');
    }
    return { type: 'email', value: normalizeEmail(raw) };
  }

  return { type: 'phone', value: normalizePhone(raw) };
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
