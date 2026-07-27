import { z } from 'zod';
import { isValidIdentifier } from '../../utils/identifier';

/**
 * Danh sách mật khẩu quá phổ biến. Theo khuyến nghị NIST SP 800-63B,
 * chặn mật khẩu dễ đoán hiệu quả hơn nhiều so với ép quy tắc
 * "phải có chữ hoa, số, ký tự đặc biệt" — quy tắc đó chỉ khiến người dùng
 * đặt `Matkhau1!` và bỏ cuộc ở bước đăng ký.
 */
const COMMON_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', 'password', 'password1', 'password123',
  'qwertyuiop', 'matkhau123', '11111111', '00000000', 'abcd1234', 'abcdefgh',
  'iloveyou', 'admin123', 'welcome1', '87654321', 'sunshine', 'princess',
  '123123123', 'zaq12wsx', 'qwerty123', 'nihongo123', 'vietnam123',
]);

export const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu cần ít nhất 8 ký tự')
  .max(128, 'Mật khẩu quá dài')
  .refine((pw) => !COMMON_PASSWORDS.has(pw.toLowerCase()), 'Mật khẩu này quá dễ đoán')
  .refine((pw) => !/^(.)\1+$/.test(pw), 'Mật khẩu không được lặp lại một ký tự')
  .refine(
    (pw) => !/^(0123456789|1234567890|abcdefgh|qwertyui)/i.test(pw),
    'Mật khẩu không được là chuỗi ký tự liên tiếp',
  );

export const identifierSchema = z
  .string()
  .trim()
  .min(3, 'Vui lòng nhập email hoặc số điện thoại')
  .refine(isValidIdentifier, 'Email hoặc số điện thoại không hợp lệ');

export const registerSchema = z.object({
  identifier: identifierSchema,
  password: passwordSchema,
  displayName: z
    .string()
    .trim()
    .min(2, 'Tên hiển thị cần ít nhất 2 ký tự')
    .max(50, 'Tên hiển thị tối đa 50 ký tự'),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Bạn cần đồng ý với điều khoản sử dụng' }),
  }),
});

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const otpPurposeSchema = z.enum(['verify_email', 'verify_phone', 'reset_password']);

export const sendOtpSchema = z.object({
  identifier: identifierSchema,
  purpose: otpPurposeSchema,
});

export const verifyOtpSchema = z.object({
  identifier: identifierSchema,
  purpose: otpPurposeSchema,
  code: z.string().trim().regex(/^\d{6}$/, 'Mã xác thực gồm 6 chữ số'),
});

export const forgotPasswordSchema = z.object({
  identifier: identifierSchema,
});

export const resetPasswordSchema = z.object({
  identifier: identifierSchema,
  code: z.string().trim().regex(/^\d{6}$/, 'Mã xác thực gồm 6 chữ số'),
  newPassword: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: passwordSchema,
});

export const addIdentifierSchema = z.object({
  identifier: identifierSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
