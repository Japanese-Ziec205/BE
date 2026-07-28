import { env } from '../config/env';
import { sendMail, buildOtpMail } from '../services/mailer';

/**
 * Gửi thử một email OTP để kiểm tra cấu hình.
 *
 * Chạy: npm run check:mail -- dia-chi@cua-ban.com
 *
 * Mục đích: biết ngay cấu hình email đúng hay sai, thay vì phải đăng ký một
 * tài khoản thật rồi mò trong log của Render.
 */
async function main() {
  const to = process.argv[2];

  if (!to) {
    console.error('Thiếu địa chỉ nhận.');
    console.error('Chạy: npm run check:mail -- dia-chi@cua-ban.com');
    process.exit(1);
  }

  console.log(`Nhà cung cấp : ${env.MAIL_PROVIDER}`);
  console.log(`Gửi từ       : ${env.MAIL_FROM}`);
  console.log(`Gửi tới      : ${to}\n`);

  if (env.MAIL_PROVIDER === 'console') {
    console.log('⚠️  Đang ở chế độ console — thư chỉ in ra màn hình, không gửi thật.');
    console.log('   Đặt MAIL_PROVIDER=sendgrid để gửi thật.\n');
  }

  // Mã giả để thử, không lưu vào database
  const code = String(Math.floor(100000 + Math.random() * 900000));

  try {
    await sendMail(buildOtpMail(to, code, 'verify_email'));
    console.log(`\n✓ Đã gửi thành công. Mã trong thư: ${code}`);
    if (env.MAIL_PROVIDER === 'sendgrid') {
      console.log('  Nếu vài phút không thấy thư, kiểm tra thư mục Spam,');
      console.log('  rồi xem SendGrid → Activity Feed để biết thư đi tới đâu.');
    }
    process.exit(0);
  } catch (err) {
    console.error(`\n✗ Gửi thất bại: ${(err as Error).message}`);
    process.exit(1);
  }
}

main();
