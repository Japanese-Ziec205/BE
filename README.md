# Nihongo Kizuna — Backend API

API cho nền tảng học tiếng Nhật trực tuyến **phi lợi nhuận**, miễn phí hoàn toàn, hướng tới người học có hoàn cảnh khó khăn. Lộ trình N5 → N1 bám sát khung JLPT.

> Frontend: https://github.com/Japanese-Ziec205/FE

---

## Công nghệ

| Thành phần | Lựa chọn |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express 4 + TypeScript |
| Database | MongoDB (Mongoose 8) |
| Xác thực | JWT access token + refresh token có xoay vòng |
| Validate | zod |
| Log | pino |
| Triển khai | Render |

## Chạy tại máy

```bash
git clone https://github.com/Japanese-Ziec205/BE.git
cd BE
npm install

cp .env.example .env      # rồi mở ra điền MONGODB_URI và 2 chuỗi JWT secret
npm run dev               # http://localhost:5000
```

Sinh nhanh chuỗi bí mật:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Tạo tài khoản quản trị đầu tiên:

```bash
npm run seed:admin
```

> **Mẹo khi phát triển:** để `MAIL_PROVIDER=console`, mã OTP sẽ được in thẳng ra terminal.
> Bạn không cần tài khoản dịch vụ email nào để thử toàn bộ luồng đăng ký.

## Các lệnh

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy chế độ phát triển, tự khởi động lại khi sửa file |
| `npm run build` | Biên dịch TypeScript sang `dist/` |
| `npm start` | Chạy bản đã build (dùng ở production) |
| `npm run typecheck` | Kiểm tra kiểu, không xuất file |
| `npm run seed:admin` | Tạo/nâng cấp tài khoản quản trị |

## Cấu trúc thư mục

```
src/
├── config/        env (validate bằng zod), db, logger
├── constants/     danh mục quyền và ma trận vai trò
├── middlewares/   authenticate, rbac, validate, rateLimit, errorHandler
├── models/        Mongoose schema
├── modules/       tách theo domain nghiệp vụ
│   ├── auth/      controller · service · routes · validators
│   ├── users/
│   └── health/
├── routes/        gom router của các module
├── seeds/         script khởi tạo dữ liệu
├── services/      mailer, audit log
├── utils/         AppError, crypto, jwt, identifier, response
├── app.ts         lắp ráp Express
└── server.ts      khởi động + tắt an toàn
```

## Quy ước API

Base path `/api/v1`. Mọi phản hồi dùng chung một khuôn:

```jsonc
// Thành công
{ "success": true, "data": { ... } }

// Thất bại
{ "success": false, "error": { "code": "AUTH_INVALID_CREDENTIALS", "message": "...", "details": null } }
```

Frontend nên bắt lỗi theo `error.code` chứ không so khớp `message` — chuỗi tiếng Việt có thể thay đổi bất cứ lúc nào.

### Endpoint hiện có

| Method | Path | Mô tả | Cần đăng nhập |
|---|---|---|:---:|
| GET | `/health` | Trạng thái dịch vụ (dùng cho cron chống ngủ) | |
| POST | `/api/v1/auth/register` | Đăng ký bằng email **hoặc** SĐT | |
| POST | `/api/v1/auth/login` | Đăng nhập | |
| POST | `/api/v1/auth/refresh` | Xoay token (dùng cookie `rt`) | |
| POST | `/api/v1/auth/logout` | Đăng xuất phiên hiện tại | |
| POST | `/api/v1/auth/otp/send` | Gửi mã OTP | |
| POST | `/api/v1/auth/otp/verify` | Xác thực OTP | |
| POST | `/api/v1/auth/forgot-password` | Yêu cầu đặt lại mật khẩu | |
| POST | `/api/v1/auth/reset-password` | Đặt mật khẩu mới bằng OTP | |
| GET | `/api/v1/auth/me` | Thông tin phiên hiện tại | ✅ |
| POST | `/api/v1/auth/logout-all` | Đăng xuất mọi thiết bị | ✅ |
| POST | `/api/v1/auth/change-password` | Đổi mật khẩu | ✅ |
| GET | `/api/v1/auth/sessions` | Danh sách thiết bị đang đăng nhập | ✅ |
| DELETE | `/api/v1/auth/sessions/:id` | Đăng xuất một thiết bị từ xa | ✅ |
| POST | `/api/v1/auth/identifiers` | Thêm email/SĐT phụ | ✅ |
| GET | `/api/v1/users/me` | Hồ sơ đầy đủ | ✅ |
| PATCH | `/api/v1/users/me` | Cập nhật hồ sơ | ✅ |
| PATCH | `/api/v1/users/me/settings` | Cập nhật tuỳ chỉnh giao diện | ✅ |
| PATCH | `/api/v1/users/me/learning` | Cập nhật mục tiêu học tập | ✅ |
| GET | `/api/v1/users/me/stats` | Thống kê học tập | ✅ |
| DELETE | `/api/v1/users/me` | Xoá mềm tài khoản | ✅ |

## Ghi chú thiết kế

**Định danh là một mảng, không phải hai cột riêng.** Người dùng đăng ký bằng email hay số điện thoại đều được, và giao diện chỉ cần một ô nhập. Email được chuẩn hoá (Gmail bỏ dấu chấm và phần `+tag`), số điện thoại chuyển sang chuẩn E.164 mặc định vùng Việt Nam. Nhờ vậy `Linh.NG+test@Gmail.com` và `linhng@gmail.com` được nhận là cùng một tài khoản.

**Refresh token không phải JWT.** Nó là chuỗi ngẫu nhiên, lưu trong DB dạng băm SHA-256. Lý do: cần thu hồi được ngay lập tức, mà JWT thì không — đã phải tra DB để kiểm tra thu hồi thì JWT không còn lợi ích gì.

**Có phát hiện đánh cắp token.** Mỗi lần refresh, token cũ bị vô hiệu và cấp token mới cùng `family`. Nếu một token đã vô hiệu lại được dùng lần nữa, toàn bộ `family` bị thu hồi và ghi log mức `high`.

**Mật khẩu không ép ký tự đặc biệt.** Theo NIST SP 800-63B, quy tắc phức tạp chỉ khiến người dùng đặt `Matkhau1!` — dễ đoán hơn một cụm từ dài. Thay vào đó hệ thống chặn danh sách mật khẩu phổ biến. Với đối tượng ít rành công nghệ, ép quy tắc rườm rà là nguyên nhân bỏ cuộc ngay ở bước đăng ký.

**Không lộ tài khoản nào đã tồn tại.** Đăng nhập sai email và sai mật khẩu trả về cùng một mã lỗi; ngay cả khi không tìm thấy tài khoản, server vẫn chạy một lượt băm mật khẩu để thời gian phản hồi không tiết lộ điều gì. Endpoint quên mật khẩu luôn trả lời như nhau.

**Xác thực có tra database mỗi request.** Đây là đánh đổi có chủ đích: nếu chỉ tin JWT thì không thể khoá tài khoản hay thu hồi phiên tức thì. Truy vấn rất nhẹ (theo `_id`, có projection).

## Triển khai lên Render

Chọn **Web Service** (không cần Blueprint — dự án chỉ có một service, database thì ở Atlas).

1. Tạo **New Web Service**, kết nối repo này. Để trống Root Directory.
2. Cấu hình:
   - **Build Command:** `npm ci --include=dev && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
3. Thêm biến môi trường theo `.env.example`. Đặt `NODE_ENV=production` và `CORS_ORIGINS` trỏ tới domain Vercel của frontend.
4. Chạy `npm run seed:admin` một lần qua Render Shell.

### ⚠️ Ba cái bẫy chắc chắn gặp

**1. `--include=dev` là bắt buộc, không phải tuỳ chọn.**
Render đặt `NODE_ENV=production`, mà npm khi thấy biến này sẽ tự bỏ qua `devDependencies` — nơi `typescript` đang nằm. Dùng `npm install` trần thì `tsc` không được cài, build **thất bại lặng lẽ**, và lúc chạy bạn nhận:

```
Error: Cannot find module '/opt/render/project/src/dist/server.js'
```

Thông báo này gây hiểu nhầm là lỗi đường dẫn, nhưng thực chất là thư mục `dist/` chưa từng được tạo ra.

**2. Atlas phải mở IP `0.0.0.0/0`.**
Render gói miễn phí không cấp IP tĩnh cho kết nối đi ra. Vào Atlas → **Network Access** → thêm `0.0.0.0/0`. Thiếu bước này, server thử kết nối 4 lần rồi thoát, và Render báo deploy thất bại.

**3. Hai chuỗi JWT secret phải khác nhau.**
`env.ts` kiểm tra và dừng ngay nếu trùng. Sinh chuỗi bằng lệnh ở phần "Chạy tại máy" phía trên, chạy hai lần.

### Chống ngủ

Render cho instance ngủ sau 15 phút không có request, lần đánh thức mất 30–60 giây. Hãy đặt một cron job (cron-job.org hoặc GitHub Actions, đều miễn phí) gọi `/health` mỗi 10 phút.

Phiên bản Node được ghim ở file `.node-version` (Node 24 LTS) để môi trường máy bạn và Render giống nhau.

## Giấy phép

Dự án phi lợi nhuận, phát hành theo giấy phép MIT. Mọi đóng góp đều được hoan nghênh. 🌸
