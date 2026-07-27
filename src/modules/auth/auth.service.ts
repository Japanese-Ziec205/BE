import type { Request } from 'express';
import { Types } from 'mongoose';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { AppError } from '../../utils/AppError';
import {
  generateOpaqueToken,
  generateOtpCode,
  hashPassword,
  sha256,
  verifyPassword,
  generateUuid,
} from '../../utils/crypto';
import { accessTokenTtlSeconds, signAccessToken } from '../../utils/jwt';
import { detectIdentifier, maskIdentifier } from '../../utils/identifier';
import { User, type IUser } from '../../models/User';
import { RefreshToken, type RevokedReason } from '../../models/RefreshToken';
import { OtpVerification, type OtpPurpose } from '../../models/OtpVerification';
import { LearningProfile } from '../../models/LearningProfile';
import { buildOtpMail, sendMail } from '../../services/mailer';
import { writeAudit } from '../../services/audit';

const OTP_TTL_MS = 10 * 60_000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60_000;
const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCK_MS = 15 * 60_000;

// ---------------------------------------------------------------------------
// Trợ giúp
// ---------------------------------------------------------------------------

function deviceLabel(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  const browser = ua.includes('edg/')
    ? 'Edge'
    : ua.includes('chrome')
      ? 'Chrome'
      : ua.includes('firefox')
        ? 'Firefox'
        : ua.includes('safari')
          ? 'Safari'
          : 'Trình duyệt';
  const os = ua.includes('android')
    ? 'Android'
    : ua.includes('iphone') || ua.includes('ipad')
      ? 'iOS'
      : ua.includes('windows')
        ? 'Windows'
        : ua.includes('mac os')
          ? 'macOS'
          : ua.includes('linux')
            ? 'Linux'
            : 'thiết bị khác';
  return `${browser} trên ${os}`;
}

export function publicUser(user: IUser, levelCode = 'N5') {
  const primary = user.identifiers.find((i) => i.isPrimary) ?? user.identifiers[0];
  return {
    id: String(user._id),
    displayName: user.profile.displayName,
    role: user.role,
    avatarPreset: user.profile.avatarPreset,
    avatarKey: user.profile.avatarKey,
    status: user.status,
    isVerified: user.identifiers.some((i) => i.verifiedAt !== null),
    primaryIdentifier: primary
      ? { type: primary.type, masked: maskIdentifier(primary.type, primary.value) }
      : null,
    currentLevelCode: levelCode,
    settings: user.settings,
  };
}

async function issueTokens(user: IUser, req: Request, family?: string) {
  const accessToken = signAccessToken({
    sub: String(user._id),
    role: user.role,
    perms: user.permissions ?? [],
    tv: user.tokenVersion,
  });

  const rawRefresh = generateOpaqueToken();
  const userAgent = req.header('User-Agent') ?? '';

  const record = await RefreshToken.create({
    userId: user._id,
    tokenHash: sha256(rawRefresh),
    family: family ?? generateUuid(),
    device: { userAgent, ip: req.ip ?? '', label: deviceLabel(userAgent) },
    expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 86_400_000),
  });

  return { accessToken, refreshToken: rawRefresh, refreshId: record._id, expiresIn: accessTokenTtlSeconds() };
}

// ---------------------------------------------------------------------------
// Đăng ký
// ---------------------------------------------------------------------------

export async function register(input: {
  identifier: string;
  password: string;
  displayName: string;
}, req: Request) {
  const id = detectIdentifier(input.identifier);

  const existing = await User.findOne({ 'identifiers.value': id.value, deletedAt: null }).lean();
  if (existing) {
    throw AppError.conflict(
      'AUTH_IDENTIFIER_TAKEN',
      id.type === 'email'
        ? 'Email này đã được đăng ký. Bạn có muốn đăng nhập?'
        : 'Số điện thoại này đã được đăng ký. Bạn có muốn đăng nhập?',
    );
  }

  const user = await User.create({
    identifiers: [{ type: id.type, value: id.value, verifiedAt: null, isPrimary: true }],
    passwordHash: await hashPassword(input.password),
    profile: {
      displayName: input.displayName,
      avatarPreset: Math.floor(Math.random() * 12),
    },
    role: 'student',
    status: 'pending_verification',
    registeredVia: id.type,
  });

  // Hồ sơ học tập được tạo ngay để mọi truy vấn sau này không phải kiểm tra null
  await LearningProfile.create({ userId: user._id });

  await writeAudit({
    req,
    actorId: user._id,
    actorRole: 'student',
    action: 'AUTH_REGISTER',
    targetType: 'user',
    targetId: user._id,
  });

  // SMS chưa bật ở giai đoạn 1 (xem tài liệu thiết kế 03): tài khoản đăng ký
  // bằng SĐT vẫn học được bình thường, chỉ chưa xác thực được ngay.
  let otpSent = false;
  if (id.type === 'email') {
    await createAndSendOtp(id.value, 'email', 'verify_email');
    otpSent = true;
  }

  return {
    userId: String(user._id),
    identifierType: id.type,
    requiresVerification: true,
    otpSent,
    otpSentTo: otpSent ? maskIdentifier(id.type, id.value) : null,
    message: otpSent
      ? 'Đã gửi mã xác thực tới email của bạn.'
      : 'Tài khoản đã được tạo. Xác thực qua SMS sẽ sớm được hỗ trợ — bạn vẫn học bình thường.',
  };
}

// ---------------------------------------------------------------------------
// Đăng nhập
// ---------------------------------------------------------------------------

export async function login(input: { identifier: string; password: string }, req: Request) {
  const id = detectIdentifier(input.identifier);

  const user = await User.findOne({ 'identifiers.value': id.value, deletedAt: null }).select(
    '+passwordHash',
  );

  // Thông báo giống hệt nhau cho "không có tài khoản" và "sai mật khẩu",
  // để không lộ email/SĐT nào đã đăng ký trên hệ thống.
  const invalid = () =>
    AppError.unauthorized(
      'AUTH_INVALID_CREDENTIALS',
      'Email/số điện thoại hoặc mật khẩu không đúng',
    );

  if (!user) {
    // Vẫn tốn thời gian băm để thời gian phản hồi không tiết lộ tài khoản có tồn tại hay không
    await hashPassword(input.password);
    throw invalid();
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    throw AppError.forbidden(
      'AUTH_ACCOUNT_LOCKED',
      `Tài khoản tạm khoá do đăng nhập sai nhiều lần. Vui lòng thử lại sau ${minutes} phút.`,
    );
  }

  if (user.status === 'suspended') {
    throw AppError.forbidden(
      'AUTH_ACCOUNT_SUSPENDED',
      user.suspension?.reason
        ? `Tài khoản đang bị tạm khoá: ${user.suspension.reason}`
        : 'Tài khoản của bạn đang bị tạm khoá',
    );
  }

  const matched = await verifyPassword(input.password, user.passwordHash);

  if (!matched) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= LOGIN_MAX_FAILURES) {
      user.lockedUntil = new Date(Date.now() + LOGIN_LOCK_MS);
      user.failedLoginAttempts = 0;
      await writeAudit({
        req,
        actorId: user._id,
        action: 'AUTH_ACCOUNT_LOCKED',
        targetType: 'user',
        targetId: user._id,
        severity: 'warn',
      });
    }
    await user.save();
    throw invalid();
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.lastActiveAt = new Date();
  await user.save();

  const tokens = await issueTokens(user, req);
  const profile = await LearningProfile.findOne({ userId: user._id }).lean();

  await writeAudit({ req, actorId: user._id, action: 'AUTH_LOGIN', targetType: 'user', targetId: user._id });

  return {
    ...tokens,
    user: publicUser(user, profile?.currentLevelCode ?? 'N5'),
    onboardingCompleted: profile?.onboardingCompleted ?? false,
  };
}

// ---------------------------------------------------------------------------
// Xoay refresh token
// ---------------------------------------------------------------------------

export async function refresh(rawToken: string, req: Request) {
  if (!rawToken) {
    throw AppError.unauthorized('AUTH_REFRESH_MISSING', 'Không tìm thấy phiên đăng nhập');
  }

  const record = await RefreshToken.findOne({ tokenHash: sha256(rawToken) });
  if (!record) {
    throw AppError.unauthorized('AUTH_REFRESH_INVALID', 'Phiên đăng nhập không hợp lệ');
  }

  // Một token đã bị vô hiệu mà còn quay lại → gần như chắc chắn đã bị đánh cắp.
  // Thu hồi toàn bộ family để cắt đứt cả kẻ tấn công lẫn phiên gốc.
  if (record.revokedAt) {
    await RefreshToken.updateMany(
      { family: record.family, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: 'reuse_detected' as RevokedReason } },
    );
    await writeAudit({
      req,
      actorId: record.userId,
      action: 'AUTH_TOKEN_REUSE_DETECTED',
      targetType: 'user',
      targetId: record.userId,
      severity: 'high',
    });
    throw AppError.unauthorized(
      'AUTH_SESSION_COMPROMISED',
      'Phiên đăng nhập có dấu hiệu bất thường. Vui lòng đăng nhập lại.',
    );
  }

  if (record.expiresAt < new Date()) {
    throw AppError.unauthorized('AUTH_REFRESH_EXPIRED', 'Phiên đăng nhập đã hết hạn');
  }

  const user = await User.findById(record.userId);
  if (!user || user.deletedAt) {
    throw AppError.unauthorized('AUTH_USER_NOT_FOUND', 'Tài khoản không tồn tại');
  }
  if (user.status === 'suspended') {
    throw AppError.forbidden('AUTH_ACCOUNT_SUSPENDED', 'Tài khoản của bạn đang bị tạm khoá');
  }

  const tokens = await issueTokens(user, req, record.family);

  record.revokedAt = new Date();
  record.revokedReason = 'rotated';
  record.replacedBy = tokens.refreshId;
  record.lastUsedAt = new Date();
  await record.save();

  const profile = await LearningProfile.findOne({ userId: user._id }).lean();

  return { ...tokens, user: publicUser(user, profile?.currentLevelCode ?? 'N5') };
}

// ---------------------------------------------------------------------------
// Đăng xuất
// ---------------------------------------------------------------------------

export async function logout(rawToken: string | undefined, req: Request) {
  if (!rawToken) return;
  const record = await RefreshToken.findOne({ tokenHash: sha256(rawToken), revokedAt: null });
  if (!record) return;

  record.revokedAt = new Date();
  record.revokedReason = 'logout';
  await record.save();

  await writeAudit({ req, actorId: record.userId, action: 'AUTH_LOGOUT', targetType: 'user', targetId: record.userId });
}

export async function logoutAll(userId: string, req: Request) {
  await RefreshToken.updateMany(
    { userId: new Types.ObjectId(userId), revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'logout_all' as RevokedReason } },
  );
  // Tăng tokenVersion để mọi access token đang lưu hành mất hiệu lực tức thì,
  // không phải chờ hết hạn 15 phút.
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });

  await writeAudit({
    req,
    actorId: userId,
    action: 'AUTH_LOGOUT_ALL',
    targetType: 'user',
    targetId: userId,
    severity: 'warn',
  });
}

export async function listSessions(userId: string, currentRawToken?: string) {
  const sessions = await RefreshToken.find({
    userId: new Types.ObjectId(userId),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastUsedAt: -1 })
    .lean();

  const currentHash = currentRawToken ? sha256(currentRawToken) : null;

  return sessions.map((s) => ({
    id: String(s._id),
    label: s.device.label,
    ip: s.device.ip,
    createdAt: s.createdAt,
    lastUsedAt: s.lastUsedAt,
    isCurrent: currentHash !== null && s.tokenHash === currentHash,
  }));
}

export async function revokeSession(userId: string, sessionId: string, req: Request) {
  const result = await RefreshToken.findOneAndUpdate(
    { _id: sessionId, userId: new Types.ObjectId(userId), revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'logout' as RevokedReason } },
  );
  if (!result) {
    throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy phiên đăng nhập này');
  }
  await writeAudit({ req, actorId: userId, action: 'AUTH_SESSION_REVOKE', targetType: 'user', targetId: userId });
}

// ---------------------------------------------------------------------------
// OTP
// ---------------------------------------------------------------------------

async function createAndSendOtp(value: string, type: 'email' | 'phone', purpose: OtpPurpose) {
  const recent = await OtpVerification.findOne({
    'identifier.value': value,
    purpose,
    createdAt: { $gt: new Date(Date.now() - OTP_RESEND_COOLDOWN_MS) },
  }).lean();

  if (recent) {
    const wait = Math.ceil(
      (OTP_RESEND_COOLDOWN_MS - (Date.now() - new Date(recent.createdAt).getTime())) / 1000,
    );
    throw AppError.tooMany(
      'AUTH_OTP_COOLDOWN',
      `Vui lòng đợi ${wait} giây trước khi yêu cầu mã mới`,
      { retryAfterSeconds: wait },
    );
  }

  // Vô hiệu các mã cũ cùng mục đích, tránh nhiều mã hợp lệ song song
  await OtpVerification.updateMany(
    { 'identifier.value': value, purpose, consumedAt: null },
    { $set: { consumedAt: new Date() } },
  );

  const code = generateOtpCode();
  await OtpVerification.create({
    identifier: { type, value },
    purpose,
    codeHash: sha256(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  if (type === 'email') {
    await sendMail(buildOtpMail(value, code, purpose));
  } else {
    // Chưa tích hợp SMS ở giai đoạn 1 — in ra log để đội phát triển vẫn thử được
    logger.warn({ value, purpose }, `📱 OTP cho SĐT (SMS chưa bật): ${code}`);
  }

  return { code, expiresInSeconds: OTP_TTL_MS / 1000 };
}

export async function sendOtp(input: { identifier: string; purpose: OtpPurpose }) {
  const id = detectIdentifier(input.identifier);
  const user = await User.findOne({ 'identifiers.value': id.value, deletedAt: null }).lean();

  // Với đặt lại mật khẩu, luôn trả lời giống nhau dù tài khoản có tồn tại hay không.
  if (input.purpose === 'reset_password' && !user) {
    return {
      sentTo: maskIdentifier(id.type, id.value),
      expiresInSeconds: OTP_TTL_MS / 1000,
      resendAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
    };
  }

  if (!user) {
    throw AppError.notFound('AUTH_USER_NOT_FOUND', 'Không tìm thấy tài khoản với định danh này');
  }

  const alreadyVerified = user.identifiers.find((i) => i.value === id.value)?.verifiedAt;
  if (input.purpose !== 'reset_password' && alreadyVerified) {
    throw AppError.conflict('AUTH_ALREADY_VERIFIED', 'Định danh này đã được xác thực rồi');
  }

  await createAndSendOtp(id.value, id.type, input.purpose);

  return {
    sentTo: maskIdentifier(id.type, id.value),
    expiresInSeconds: OTP_TTL_MS / 1000,
    resendAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
  };
}

/** Kiểm tra và tiêu thụ OTP. Trả về bản ghi OTP nếu hợp lệ. */
async function consumeOtp(value: string, purpose: OtpPurpose, code: string) {
  const otp = await OtpVerification.findOne({
    'identifier.value': value,
    purpose,
    consumedAt: null,
  }).sort({ createdAt: -1 });

  if (!otp) {
    throw AppError.badRequest('AUTH_OTP_INVALID', 'Mã xác thực không đúng hoặc đã được sử dụng');
  }
  if (otp.expiresAt < new Date()) {
    throw AppError.badRequest('AUTH_OTP_EXPIRED', 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.');
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    otp.consumedAt = new Date();
    await otp.save();
    throw AppError.tooMany(
      'AUTH_OTP_TOO_MANY_ATTEMPTS',
      'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.',
    );
  }

  if (otp.codeHash !== sha256(code)) {
    otp.attempts += 1;
    await otp.save();
    const remaining = OTP_MAX_ATTEMPTS - otp.attempts;
    throw AppError.badRequest(
      'AUTH_OTP_INVALID',
      `Mã xác thực không đúng. Bạn còn ${remaining} lần thử.`,
      { attemptsRemaining: remaining },
    );
  }

  otp.consumedAt = new Date();
  await otp.save();
  return otp;
}

export async function verifyOtp(
  input: { identifier: string; purpose: OtpPurpose; code: string },
  req: Request,
) {
  const id = detectIdentifier(input.identifier);
  await consumeOtp(id.value, input.purpose, input.code);

  const user = await User.findOne({ 'identifiers.value': id.value, deletedAt: null });
  if (!user) {
    throw AppError.notFound('AUTH_USER_NOT_FOUND', 'Không tìm thấy tài khoản');
  }

  // Với reset_password, chỉ xác nhận mã đúng — việc đổi mật khẩu làm ở bước sau
  if (input.purpose === 'reset_password') {
    return { verified: true, nextStep: 'reset_password' as const };
  }

  const identifier = user.identifiers.find((i) => i.value === id.value);
  if (identifier) identifier.verifiedAt = new Date();
  if (user.status === 'pending_verification') user.status = 'active';
  await user.save();

  const tokens = await issueTokens(user, req);
  const profile = await LearningProfile.findOne({ userId: user._id }).lean();

  await writeAudit({ req, actorId: user._id, action: 'AUTH_VERIFY_OTP', targetType: 'user', targetId: user._id });

  return {
    verified: true,
    nextStep: 'authenticated' as const,
    ...tokens,
    user: publicUser(user, profile?.currentLevelCode ?? 'N5'),
    onboardingCompleted: profile?.onboardingCompleted ?? false,
  };
}

// ---------------------------------------------------------------------------
// Mật khẩu
// ---------------------------------------------------------------------------

export async function forgotPassword(identifier: string) {
  const id = detectIdentifier(identifier);
  const user = await User.findOne({ 'identifiers.value': id.value, deletedAt: null }).lean();

  // Luôn trả về thành công để không lộ tài khoản nào tồn tại
  if (user) {
    try {
      await createAndSendOtp(id.value, id.type, 'reset_password');
    } catch (err) {
      // Kể cả đang trong thời gian chờ gửi lại cũng không được để lộ ra ngoài
      logger.debug({ err }, 'Bỏ qua lỗi khi gửi OTP đặt lại mật khẩu');
    }
  }

  return {
    message: 'Nếu tài khoản tồn tại, mã xác thực đã được gửi.',
    resendAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
  };
}

export async function resetPassword(
  input: { identifier: string; code: string; newPassword: string },
  req: Request,
) {
  const id = detectIdentifier(input.identifier);
  await consumeOtp(id.value, 'reset_password', input.code);

  const user = await User.findOne({ 'identifiers.value': id.value, deletedAt: null });
  if (!user) {
    throw AppError.notFound('AUTH_USER_NOT_FOUND', 'Không tìm thấy tài khoản');
  }

  user.passwordHash = await hashPassword(input.newPassword);
  user.passwordChangedAt = new Date();
  user.tokenVersion += 1;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  // Đặt lại mật khẩu qua email đồng thời chứng minh quyền sở hữu email đó
  const identifier = user.identifiers.find((i) => i.value === id.value);
  if (identifier && !identifier.verifiedAt) identifier.verifiedAt = new Date();
  if (user.status === 'pending_verification') user.status = 'active';
  await user.save();

  // Đổi mật khẩu phải đá toàn bộ phiên cũ — nếu tài khoản bị chiếm, đây là cách lấy lại
  await RefreshToken.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'password_changed' as RevokedReason } },
  );

  await writeAudit({
    req,
    actorId: user._id,
    action: 'AUTH_PASSWORD_RESET',
    targetType: 'user',
    targetId: user._id,
    severity: 'warn',
  });

  return { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' };
}

export async function changePassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
  req: Request,
  currentRawToken?: string,
) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw AppError.notFound('AUTH_USER_NOT_FOUND', 'Không tìm thấy tài khoản');
  }

  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw AppError.badRequest('AUTH_WRONG_PASSWORD', 'Mật khẩu hiện tại không đúng');
  }
  if (await verifyPassword(input.newPassword, user.passwordHash)) {
    throw AppError.badRequest('AUTH_SAME_PASSWORD', 'Mật khẩu mới phải khác mật khẩu hiện tại');
  }

  user.passwordHash = await hashPassword(input.newPassword);
  user.passwordChangedAt = new Date();
  user.tokenVersion += 1;
  await user.save();

  // Thu hồi mọi phiên KHÁC, giữ lại phiên hiện tại để người dùng không bị đá ra
  const keepHash = currentRawToken ? sha256(currentRawToken) : null;
  await RefreshToken.updateMany(
    { userId: user._id, revokedAt: null, ...(keepHash ? { tokenHash: { $ne: keepHash } } : {}) },
    { $set: { revokedAt: new Date(), revokedReason: 'password_changed' as RevokedReason } },
  );

  await writeAudit({
    req,
    actorId: user._id,
    action: 'AUTH_PASSWORD_CHANGE',
    targetType: 'user',
    targetId: user._id,
    severity: 'warn',
  });

  // tokenVersion vừa tăng nên access token cũ đã chết — cấp bộ token mới ngay
  const tokens = await issueTokens(user, req);
  return { ...tokens, message: 'Đổi mật khẩu thành công' };
}

// ---------------------------------------------------------------------------
// Thêm định danh phụ
// ---------------------------------------------------------------------------

export async function addIdentifier(userId: string, identifier: string) {
  const id = detectIdentifier(identifier);

  const taken = await User.findOne({ 'identifiers.value': id.value, deletedAt: null }).lean();
  if (taken) {
    throw AppError.conflict(
      'AUTH_IDENTIFIER_TAKEN',
      'Email hoặc số điện thoại này đã được dùng cho tài khoản khác',
    );
  }

  const user = await User.findById(userId);
  if (!user) throw AppError.notFound('AUTH_USER_NOT_FOUND', 'Không tìm thấy tài khoản');

  if (user.identifiers.length >= 4) {
    throw AppError.badRequest('AUTH_TOO_MANY_IDENTIFIERS', 'Mỗi tài khoản tối đa 4 định danh');
  }

  user.identifiers.push({ type: id.type, value: id.value, verifiedAt: null, isPrimary: false });
  await user.save();

  if (id.type === 'email') {
    await createAndSendOtp(id.value, 'email', 'verify_email');
  }

  return {
    added: { type: id.type, masked: maskIdentifier(id.type, id.value) },
    requiresVerification: true,
  };
}

export async function getMe(userId: string) {
  const user = await User.findById(userId);
  if (!user || user.deletedAt) {
    throw AppError.notFound('AUTH_USER_NOT_FOUND', 'Không tìm thấy tài khoản');
  }
  const profile = await LearningProfile.findOne({ userId: user._id }).lean();
  return {
    user: publicUser(user, profile?.currentLevelCode ?? 'N5'),
    identifiers: user.identifiers.map((i) => ({
      type: i.type,
      masked: maskIdentifier(i.type, i.value),
      verified: i.verifiedAt !== null,
      isPrimary: i.isPrimary,
    })),
    onboardingCompleted: profile?.onboardingCompleted ?? false,
  };
}
