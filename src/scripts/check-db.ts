import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

/**
 * Chẩn đoán chuỗi kết nối MongoDB.
 *
 * Chạy: npm run check:db
 * Hoặc truyền thẳng chuỗi: npm run check:db -- "mongodb+srv://..."
 *
 * Mục đích: tìm ra lỗi ngay trên máy trong vài giây, thay vì sửa biến môi
 * trường rồi chờ Render deploy lại vài phút cho mỗi lần thử.
 */

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';

function line() {
  console.log('─'.repeat(64));
}

async function main() {
  const raw = process.argv[2] ?? process.env.MONGODB_URI;

  if (!raw) {
    console.log(`${RED}Không tìm thấy MONGODB_URI.${RESET}`);
    console.log('Đặt biến trong file .env, hoặc chạy:');
    console.log('  npm run check:db -- "mongodb+srv://..."');
    process.exit(1);
  }

  line();
  console.log(`${BOLD}KIỂM TRA CHUỖI KẾT NỐI MONGODB${RESET}`);
  line();

  // --- 1. Khoảng trắng thừa ---
  // Lỗi rất hay gặp: dán vào ô Environment của Render kèm dấu cách hoặc
  // xuống dòng ở cuối. Nhìn bằng mắt không thấy nhưng làm hỏng mật khẩu.
  const trimmed = raw.trim();
  if (trimmed !== raw) {
    console.log(`${RED}✗ Chuỗi có khoảng trắng hoặc ký tự xuống dòng ở đầu/cuối.${RESET}`);
    console.log('  Đây là nguyên nhân rất hay gặp khi dán vào ô Environment.');
    console.log('  Hãy xoá và dán lại, chú ý không kèm dấu cách.\n');
  }

  // --- 2. Bóc tách bằng chính trình phân tích của driver ---
  let parsed: mongoose.mongo.MongoClient;
  try {
    parsed = new mongoose.mongo.MongoClient(trimmed);
  } catch (err) {
    console.log(`${RED}✗ Chuỗi sai cú pháp: ${(err as Error).message}${RESET}`);
    process.exit(1);
  }

  const options = parsed.options;
  const username = options.credentials?.username ?? '(không có)';
  const authSource = options.credentials?.source ?? '(không có)';
  const dbName = options.dbName ?? '(không có)';
  const password = options.credentials?.password ?? '';

  console.log(`  Người dùng      : ${username}`);
  console.log(`  Database        : ${dbName}`);
  console.log(`  Xác thực tại    : ${authSource}`);
  console.log(`  Độ dài mật khẩu : ${password.length} ký tự`);
  line();

  // --- 3. Các lỗi cấu hình phổ biến ---
  const problems: string[] = [];

  if (authSource !== 'admin') {
    problems.push(
      `Xác thực đang trỏ tới "${authSource}" thay vì "admin".\n` +
        '    Tài khoản do Atlas tạo nằm ở "admin". Thêm &authSource=admin vào cuối chuỗi.',
    );
  }
  if (dbName === 'test' || dbName === '(không có)') {
    problems.push(
      'Chưa chỉ định database nên dữ liệu sẽ vào database mặc định "test".\n' +
        '    Thêm /nihongo_kizuna ngay trước dấu ?',
    );
  }
  if (password.includes('<') || password.includes('>')) {
    problems.push('Mật khẩu vẫn còn dấu <> — bạn chưa thay chỗ <db_password> bằng mật khẩu thật.');
  }
  if (/[@:/?#[\]%]/.test(password)) {
    problems.push(
      'Mật khẩu có ký tự đặc biệt cần mã hoá URL (@ : / ? # [ ] %).\n' +
        '    Ví dụ ký tự @ phải viết thành %40.',
    );
  }
  if (password !== password.trim()) {
    problems.push('Mật khẩu có khoảng trắng ở đầu hoặc cuối.');
  }

  if (problems.length > 0) {
    console.log(`${YELLOW}Phát hiện vấn đề trong chuỗi:${RESET}`);
    problems.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
    line();
  }

  // --- 4. Thử kết nối thật ---
  console.log('Đang thử kết nối...\n');
  try {
    await mongoose.connect(trimmed, { serverSelectionTimeoutMS: 15_000 });
    const admin = mongoose.connection.db!.admin();
    const info = await admin.serverStatus().catch(() => null);

    console.log(`${GREEN}${BOLD}✓ KẾT NỐI THÀNH CÔNG${RESET}`);
    console.log(`  Database đang dùng : ${mongoose.connection.name}`);
    if (info?.version) console.log(`  Phiên bản MongoDB  : ${info.version}`);

    const collections = await mongoose.connection.db!.listCollections().toArray();
    console.log(`  Số collection      : ${collections.length}`);
    if (collections.length === 0) {
      console.log(`\n${YELLOW}  Database còn trống. Chạy "npm run seed" để nạp dữ liệu.${RESET}`);
    }
    line();
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`${RED}${BOLD}✗ KẾT NỐI THẤT BẠI${RESET}`);
    console.log(`  ${message}\n`);

    if (/bad auth|Authentication failed/i.test(message)) {
      console.log(`${YELLOW}Máy chủ đã trả lời — chỉ có thông tin đăng nhập bị từ chối.${RESET}`);
      console.log('Mạng và IP Access List đều ổn. Kiểm tra theo thứ tự:\n');
      console.log('  1. Vào Atlas → Database Access → bấm EDIT ở dòng người dùng này');
      console.log('     → nhập lại mật khẩu → BẤM NÚT "Update User" ở cuối hộp thoại.');
      console.log(`     ${BOLD}Chỉ bấm "Autogenerate Secure Password" thôi là CHƯA LƯU.${RESET}`);
      console.log('     Rất nhiều người copy mật khẩu rồi đóng hộp thoại mà quên bấm Update.\n');
      console.log(`  2. Tên người dùng đang dùng: "${username}" — đối chiếu với Atlas xem có khớp không.\n`);
      console.log('  3. Nếu vừa đổi mật khẩu, chờ khoảng 1 phút để Atlas áp dụng xong.');
    } else if (/ENOTFOUND|querySrv|ECONNREFUSED/i.test(message)) {
      console.log(`${YELLOW}Không phân giải được tên máy chủ.${RESET}`);
      console.log('  • Kiểm tra lại phần host trong chuỗi có gõ đúng không');
      console.log('  • Mạng của bạn có thể đang chặn tra cứu DNS dạng SRV');
    } else if (/timed out|ETIMEDOUT/i.test(message)) {
      console.log(`${YELLOW}Hết thời gian chờ — nhiều khả năng bị chặn ở tầng mạng.${RESET}`);
      console.log('  • Atlas → Network Access → thêm 0.0.0.0/0');
      console.log('  • Kiểm tra cluster có đang tạm dừng (paused) không');
    }
    line();
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  }
}

main();
