import { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { StudySession, DailyStat } from '../../models/Learning';
import { LearningProfile } from '../../models/LearningProfile';
import { User } from '../../models/User';

/** Nhịp báo gần nhau hơn mức này là bất thường, từ chối luôn. */
export const MIN_HEARTBEAT_GAP_SEC = 45;

/**
 * Ân hạn cho khoảng trống giữa hai nhịp.
 *
 * Người học có thể dừng suy nghĩ một câu khó 80 giây — vẫn là đang học.
 * Nhưng 10 phút không tương tác thì không. 90 giây là ranh giới hợp lý.
 */
export const GRACE_SEC = 90;

/** Trần 6 giờ/ngày: vượt mức này gần như chắc chắn là lỗi hoặc gian lận. */
export const DAILY_CAP_SEC = 6 * 3600;

/** Session không có nhịp báo quá lâu thì coi như người dùng đã rời đi. */
export const SESSION_TIMEOUT_SEC = 180;

/** Khoá ngày theo múi giờ của người dùng, không phải UTC. */
export function todayKey(timezone = 'Asia/Ho_Chi_Minh', at: Date = new Date()): string {
  try {
    // en-CA cho định dạng YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(at);
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(at);
  }
}

/**
 * Phát hiện nhịp báo quá đều đặn.
 *
 * Người thật có độ trễ mạng và thao tác dao động vài trăm mili giây. Một script
 * tự động gửi đúng 60.0 giây một lần. Nếu 6 nhịp gần nhất lệch nhau dưới 0.5
 * giây thì rất đáng ngờ.
 */
export function detectRoboticPattern(intervals: number[]): boolean {
  if (intervals.length < 6) return false;
  const recent = intervals.slice(-6);
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const variance = recent.reduce((sum, v) => sum + (v - mean) ** 2, 0) / recent.length;
  return Math.sqrt(variance) < 0.5;
}

export async function startSession(
  userId: string,
  context: { type: string; refId?: string },
) {
  const user = await User.findById(userId).select('profile.timezone').lean();
  const timezone = user?.profile?.timezone ?? 'Asia/Ho_Chi_Minh';

  // Đóng các phiên còn treo của chính người dùng này để không đếm trùng
  await StudySession.updateMany(
    { userId: new Types.ObjectId(userId), endedAt: null },
    { $set: { endedAt: new Date() } },
  );

  const session = await StudySession.create({
    userId: new Types.ObjectId(userId),
    context: {
      type: context.type,
      refId: context.refId && Types.ObjectId.isValid(context.refId)
        ? new Types.ObjectId(context.refId)
        : null,
    },
    timezone,
  });

  return { sessionId: String(session._id), startedAt: session.startedAt };
}

export async function heartbeat(userId: string, sessionId: string) {
  const session = await StudySession.findOne({
    _id: sessionId,
    userId: new Types.ObjectId(userId),
    endedAt: null,
  });
  if (!session) {
    throw AppError.notFound('STUDY_SESSION_NOT_FOUND', 'Phiên học không tồn tại hoặc đã kết thúc');
  }

  const now = new Date();
  const gap = (now.getTime() - session.lastHeartbeatAt.getTime()) / 1000;

  if (gap < MIN_HEARTBEAT_GAP_SEC) {
    throw AppError.tooMany(
      'STUDY_HEARTBEAT_TOO_SOON',
      'Nhịp báo quá gần nhau',
      { retryAfterSeconds: Math.ceil(MIN_HEARTBEAT_GAP_SEC - gap) },
    );
  }

  // Server tự tính thời gian từ khoảng cách giữa các nhịp mà CHÍNH NÓ ghi nhận.
  // Không bao giờ nhận con số thời lượng do client gửi lên.
  // Làm tròn về giây nguyên: lưu phần thập phân của giây không mang thông tin gì
  // mà lại khiến các con số cộng dồn trông lởm chởm khi hiển thị.
  const counted = Math.round(Math.min(gap, GRACE_SEC));
  const discarded = Math.round(Math.max(0, gap - GRACE_SEC));

  const dateKey = todayKey(session.timezone, now);
  const stat = await DailyStat.findOne({ userId: new Types.ObjectId(userId), date: dateKey });
  const usedToday = stat?.studySeconds ?? 0;
  const allowed = Math.max(0, Math.min(counted, DAILY_CAP_SEC - usedToday));

  const intervals = [...session.heartbeatIntervals, gap].slice(-20);
  const isSuspicious = detectRoboticPattern(intervals);

  session.lastHeartbeatAt = now;
  session.heartbeatCount += 1;
  session.countedSeconds += allowed;
  session.discardedSeconds += discarded;
  session.heartbeatIntervals = intervals;
  // Đánh dấu để quản trị viên xem lại, KHÔNG chặn thẳng — mạng chập chờn của
  // người dùng thật cũng có thể tạo nhịp đều, phạt oan thì tệ hơn.
  if (isSuspicious) session.suspicious = true;
  await session.save();

  if (!isSuspicious && allowed > 0) {
    await DailyStat.updateOne(
      { userId: new Types.ObjectId(userId), date: dateKey },
      { $inc: { studySeconds: allowed } },
      { upsert: true },
    );
    await LearningProfile.updateOne(
      { userId: new Types.ObjectId(userId) },
      { $inc: { 'totals.studyMinutes': allowed / 60 } },
    );
  }

  const profile = await LearningProfile.findOne({ userId: new Types.ObjectId(userId) }).lean();
  const goalSeconds = (profile?.dailyGoalMinutes ?? 10) * 60;
  const countedToday = usedToday + allowed;

  return {
    countedTodaySeconds: countedToday,
    dailyGoalSeconds: goalSeconds,
    goalMet: countedToday >= goalSeconds,
    sessionSeconds: session.countedSeconds,
    capReached: countedToday >= DAILY_CAP_SEC,
  };
}

export async function endSession(userId: string, sessionId: string) {
  const session = await StudySession.findOneAndUpdate(
    { _id: sessionId, userId: new Types.ObjectId(userId), endedAt: null },
    { $set: { endedAt: new Date() } },
    { new: true },
  );
  if (!session) {
    throw AppError.notFound('STUDY_SESSION_NOT_FOUND', 'Phiên học không tồn tại');
  }
  await DailyStat.updateOne(
    { userId: new Types.ObjectId(userId), date: todayKey(session.timezone) },
    { $inc: { sessionCount: 1 } },
    { upsert: true },
  );
  return { sessionSeconds: session.countedSeconds, discardedSeconds: session.discardedSeconds };
}

export async function getToday(userId: string) {
  const user = await User.findById(userId).select('profile.timezone').lean();
  const timezone = user?.profile?.timezone ?? 'Asia/Ho_Chi_Minh';
  const dateKey = todayKey(timezone);

  const [stat, profile] = await Promise.all([
    DailyStat.findOne({ userId: new Types.ObjectId(userId), date: dateKey }).lean(),
    LearningProfile.findOne({ userId: new Types.ObjectId(userId) }).lean(),
  ]);

  const goalSeconds = (profile?.dailyGoalMinutes ?? 10) * 60;
  const studySeconds = stat?.studySeconds ?? 0;

  return {
    date: dateKey,
    studySeconds,
    studyMinutes: Math.round(studySeconds / 60),
    dailyGoalSeconds: goalSeconds,
    goalMet: studySeconds >= goalSeconds,
    progressPercent: Math.min(100, Math.round((studySeconds / goalSeconds) * 100)),
    reviewsDone: stat?.reviewsDone ?? 0,
    lessonsCompleted: stat?.lessonsCompleted ?? 0,
  };
}

export async function getHistory(userId: string, days = 30) {
  const user = await User.findById(userId).select('profile.timezone').lean();
  const timezone = user?.profile?.timezone ?? 'Asia/Ho_Chi_Minh';

  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    keys.push(todayKey(timezone, new Date(Date.now() - i * 86_400_000)));
  }

  const stats = await DailyStat.find({
    userId: new Types.ObjectId(userId),
    date: { $in: keys },
  }).lean();
  const byDate = new Map(stats.map((s) => [s.date, s]));

  // Trả về đủ mọi ngày kể cả ngày không học, để biểu đồ không bị khuyết cột
  return keys.map((date) => {
    const s = byDate.get(date);
    return {
      date,
      studySeconds: s?.studySeconds ?? 0,
      studyMinutes: Math.round((s?.studySeconds ?? 0) / 60),
      reviewsDone: s?.reviewsDone ?? 0,
      xpEarned: s?.xpEarned ?? 0,
      goalMet: s?.goalMet ?? false,
    };
  });
}

/**
 * Dọn các phiên bị bỏ dở (người dùng đóng tab mà không gọi end).
 * Chạy định kỳ bằng cron.
 */
export async function closeOrphanSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - SESSION_TIMEOUT_SEC * 1000);
  const result = await StudySession.updateMany(
    { endedAt: null, lastHeartbeatAt: { $lt: cutoff } },
    { $set: { endedAt: new Date() } },
  );
  return result.modifiedCount;
}
