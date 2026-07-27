import { env } from '../config/env';
import { logger } from '../config/logger';

export interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Ở chế độ `console`, mã OTP được in ra log thay vì gửi email thật.
 * Nhờ vậy người mới clone repo về chạy được ngay mà không cần tài khoản
 * dịch vụ email nào — quan trọng với dự án dùng cộng tác viên tình nguyện.
 */
async function sendViaConsole(payload: MailPayload): Promise<void> {
  logger.info(
    { to: payload.to, subject: payload.subject },
    `\n📧 ===== EMAIL (chế độ console) =====\n` +
      `Tới    : ${payload.to}\n` +
      `Tiêu đề: ${payload.subject}\n` +
      `${payload.text}\n` +
      `=====================================\n`,
  );
}

async function sendViaResend(payload: MailPayload): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body }, 'Gửi email thất bại');
    throw new Error(`Resend trả về ${res.status}`);
  }
}

export async function sendMail(payload: MailPayload): Promise<void> {
  if (env.MAIL_PROVIDER === 'resend') return sendViaResend(payload);
  return sendViaConsole(payload);
}

const PURPOSE_LABEL: Record<string, string> = {
  verify_email: 'Xác thực địa chỉ email',
  verify_phone: 'Xác thực số điện thoại',
  reset_password: 'Đặt lại mật khẩu',
};

export function buildOtpMail(to: string, code: string, purpose: string): MailPayload {
  const label = PURPOSE_LABEL[purpose] ?? 'Xác thực tài khoản';

  const html = `
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;
            background:#FFF9F2;padding:32px;border-radius:16px;color:#1F2430">
  <h1 style="color:#F2637E;font-size:22px;margin:0 0 8px">Nihongo Kizuna</h1>
  <p style="color:#5A6072;margin:0 0 24px">Học tiếng Nhật miễn phí cho mọi người</p>
  <h2 style="font-size:18px;margin:0 0 12px">${label}</h2>
  <p style="margin:0 0 16px">Mã xác thực của bạn là:</p>
  <div style="background:#fff;border:2px dashed #F2637E;border-radius:12px;padding:20px;
              text-align:center;font-size:34px;font-weight:700;letter-spacing:10px;color:#1B3A6B">
    ${code}
  </div>
  <p style="color:#5A6072;font-size:14px;margin:20px 0 0">
    Mã có hiệu lực trong <strong>10 phút</strong>.<br>
    Nếu bạn không yêu cầu mã này, hãy bỏ qua email.
  </p>
  <hr style="border:none;border-top:1px solid #E8E2D9;margin:24px 0">
  <p style="color:#5A6072;font-size:12px;margin:0">
    Đây là email tự động, vui lòng không trả lời. 🌸
  </p>
</div>`.trim();

  const text =
    `Nihongo Kizuna — ${label}\n\n` +
    `Mã xác thực của bạn: ${code}\n\n` +
    `Mã có hiệu lực trong 10 phút.\n` +
    `Nếu bạn không yêu cầu mã này, hãy bỏ qua email.`;

  return { to, subject: `[Nihongo Kizuna] Mã xác thực: ${code}`, html, text };
}
