import { Types } from 'mongoose';
import {
  Achievement,
  Notification,
  UserAchievement,
  XpLedger,
} from '../../models/Gamification';
import { DailyStat, SrsCard } from '../../models/Learning';
import {
  LearningProfile,
  levelFromXp,
  titleForLevel,
  xpForLevel,
} from '../../models/LearningProfile';
import { todayKey } from '../study/study.service';

/** Trần XP mỗi ngày (BR-07) — chống cày điểm và cũng chống học quá sức. */
export const DAILY_XP_CAP = 1500;

/** Bảng điểm XP theo tài liệu thiết kế 07 mục 2.1. */
export const XP_RATES = {
  srs_review_new: 2,
  srs_review_due: 5,
  srs_review_overdue: 8, // thưởng việc quay lại dọn nợ
  lesson_complete: 20,
  lesson_perfect: 25,
  exam_complete: 100, // không phụ thuộc điểm: ngồi 90 phút đã đáng ghi nhận
  exam_pass: 150,
  daily_goal: 50,
  writing_submit: 30,
} as const;

export interface XpResult {
  awarded: number;
  requested: number;
  capReached: boolean;
  totalXp: number;
  level: number;
  levelTitle: string;
  leveledUp: boolean;
  message: string | null;
}

export async function awardXp(
  userId: string,
  amount: number,
  source: string,
  ref?: { type: string; id: string },
): Promise<XpResult> {
  const uid = new Types.ObjectId(userId);
  const dateKey = todayKey();

  const earned = await XpLedger.aggregate([
    { $match: { userId: uid, dateKey } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const usedToday = earned[0]?.total ?? 0;
  const allowed = Math.max(0, Math.min(amount, DAILY_XP_CAP - usedToday));

  const profile =
    (await LearningProfile.findOne({ userId: uid })) ??
    (await LearningProfile.create({ userId: uid }));
  const levelBefore = levelFromXp(profile.xp.total);

  if (allowed > 0) {
    await XpLedger.create({
      userId: uid,
      amount: allowed,
      source,
      refType: ref?.type ?? null,
      refId: ref?.id && Types.ObjectId.isValid(ref.id) ? new Types.ObjectId(ref.id) : null,
      dateKey,
    });
    profile.xp.total += allowed;
    profile.xp.thisWeek += allowed;
    profile.xp.level = levelFromXp(profile.xp.total);
    await profile.save();

    await DailyStat.updateOne(
      { userId: uid, date: dateKey },
      { $inc: { xpEarned: allowed } },
      { upsert: true },
    );
  }

  const levelAfter = levelFromXp(profile.xp.total);
  const capReached = allowed < amount;

  return {
    awarded: allowed,
    requested: amount,
    capReached,
    totalXp: profile.xp.total,
    level: levelAfter,
    levelTitle: titleForLevel(levelAfter),
    leveledUp: levelAfter > levelBefore,
    // Thông điệp tích cực, không phải báo lỗi
    message: capReached
      ? 'Hôm nay bạn học đủ nhiều rồi! Nghỉ ngơi nhé, mai gặp lại 🌸'
      : null,
  };
}

// ---------------------------------------------------------------------------
// Chuỗi ngày học
// ---------------------------------------------------------------------------

export const FREEZE_EARN_EVERY_DAYS = 7;
export const MAX_FREEZES = 3;

export interface StreakResult {
  current: number;
  longest: number;
  freezesAvailable: number;
  freezeUsed: boolean;
  extended: boolean;
  message: string | null;
}

/** Số ngày giữa hai khoá ngày dạng 'YYYY-MM-DD'. */
export function daysBetweenKeys(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Cập nhật chuỗi ngày học.
 *
 * Bùa cứu được áp dụng TỰ ĐỘNG chứ không bắt người dùng nhớ bấm nút. Một người
 * phải làm ca đêm hoặc nhà mất mạng không nên bị xoá sạch 60 ngày nỗ lực chỉ
 * vì quên một thao tác.
 */
export function computeStreak(
  streak: { current: number; longest: number; lastStudyDate: string | null; freezesAvailable: number },
  today: string,
): StreakResult {
  const last = streak.lastStudyDate;

  if (last === today) {
    return {
      current: streak.current,
      longest: streak.longest,
      freezesAvailable: streak.freezesAvailable,
      freezeUsed: false,
      extended: false,
      message: null,
    };
  }

  const gap = last ? daysBetweenKeys(last, today) : Infinity;

  // Học liên tiếp ngày kế tiếp
  if (gap === 1) {
    const current = streak.current + 1;
    let freezes = streak.freezesAvailable;
    let message: string | null = null;
    // Cứ 7 ngày liên tục tặng một bùa cứu
    if (current % FREEZE_EARN_EVERY_DAYS === 0 && freezes < MAX_FREEZES) {
      freezes += 1;
      message = `Chuỗi ${current} ngày! Bạn nhận thêm 1 bùa cứu chuỗi 🛡️`;
    }
    return {
      current,
      longest: Math.max(streak.longest, current),
      freezesAvailable: freezes,
      freezeUsed: false,
      extended: true,
      message,
    };
  }

  // Lỡ đúng một ngày và còn bùa → tự động cứu
  if (gap === 2 && streak.freezesAvailable > 0) {
    const current = streak.current + 1;
    const freezes = streak.freezesAvailable - 1;
    return {
      current,
      longest: Math.max(streak.longest, current),
      freezesAvailable: freezes,
      freezeUsed: true,
      extended: true,
      message:
        `Bùa cứu chuỗi đã tự động dùng cho hôm qua. Chuỗi ${current} ngày của bạn vẫn nguyên vẹn! ` +
        `Còn ${freezes} bùa.`,
    };
  }

  // Đứt chuỗi — thông điệp phải trung tính, không trách móc
  const hadStreak = streak.current > 1;
  return {
    current: 1,
    longest: Math.max(streak.longest, streak.current),
    freezesAvailable: streak.freezesAvailable,
    freezeUsed: false,
    extended: true,
    message: hadStreak
      ? `Chuỗi mới bắt đầu. Kỷ lục ${streak.longest || streak.current} ngày của bạn vẫn được ghi nhận.`
      : null,
  };
}

export async function updateStreak(userId: string): Promise<StreakResult> {
  const uid = new Types.ObjectId(userId);
  const profile =
    (await LearningProfile.findOne({ userId: uid })) ??
    (await LearningProfile.create({ userId: uid }));

  const today = todayKey();
  const result = computeStreak(profile.streak, today);

  if (result.extended) {
    profile.streak.current = result.current;
    profile.streak.longest = result.longest;
    profile.streak.lastStudyDate = today;
    if (result.freezeUsed) profile.streak.freezesUsedTotal += 1;
    profile.streak.freezesAvailable = result.freezesAvailable;
    await profile.save();

    if (result.message) {
      await Notification.create({
        userId: uid,
        type: result.freezeUsed ? 'streak_freeze_used' : 'streak_milestone',
        title: 'Chuỗi ngày học',
        body: result.message,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Huy hiệu
// ---------------------------------------------------------------------------

/** Đọc giá trị hiện tại của một chỉ số. */
async function resolveMetric(userId: string, metric: string): Promise<number> {
  const uid = new Types.ObjectId(userId);
  const profile = await LearningProfile.findOne({ userId: uid }).lean();

  switch (metric) {
    case 'streak.current':
      return profile?.streak.current ?? 0;
    case 'lesson.count':
      return profile?.totals.lessonsCompleted ?? 0;
    case 'kana.count':
      return profile?.totals.kanaLearned ?? 0;
    case 'kanji.count':
      return profile?.totals.kanjiLearned ?? 0;
    case 'vocabulary.count':
      return profile?.totals.vocabularyLearned ?? 0;
    case 'grammar.count':
      return profile?.totals.grammarLearned ?? 0;
    case 'review.count':
      return profile?.totals.reviewsDone ?? 0;
    case 'exam.count':
      return profile?.totals.examsTaken ?? 0;
    case 'study.hours':
      return Math.floor((profile?.totals.studyMinutes ?? 0) / 60);
    case 'srs.mastered':
      // Thẻ đã ôn được ít nhất 21 ngày mới coi là thuộc
      return SrsCard.countDocuments({ userId: uid, state: 'review', intervalDays: { $gte: 21 } });
    default:
      return 0;
  }
}

/**
 * Đánh giá huy hiệu sau một sự kiện học tập.
 *
 * Chỉ kiểm tra các huy hiệu dùng chỉ số liên quan tới sự kiện vừa xảy ra,
 * không quét toàn bộ mỗi lần — 60 huy hiệu × mỗi lần ôn thẻ sẽ rất tốn.
 */
export async function evaluateAchievements(userId: string, metrics: string[]) {
  if (metrics.length === 0) return [];

  const uid = new Types.ObjectId(userId);
  const candidates = await Achievement.find({ isActive: true, metric: { $in: metrics } }).lean();
  if (candidates.length === 0) return [];

  const existing = await UserAchievement.find({
    userId: uid,
    achievementCode: { $in: candidates.map((a) => a.code) },
  }).lean();
  const unlockedCodes = new Set(
    existing.filter((e) => e.unlockedAt).map((e) => e.achievementCode),
  );

  // Đọc mỗi chỉ số một lần dù nhiều huy hiệu dùng chung
  const values = new Map<string, number>();
  for (const metric of new Set(candidates.map((a) => a.metric))) {
    values.set(metric, await resolveMetric(userId, metric));
  }

  const newlyUnlocked = [];
  for (const achievement of candidates) {
    if (unlockedCodes.has(achievement.code)) continue;

    const value = values.get(achievement.metric) ?? 0;
    const reached = value >= achievement.threshold;

    await UserAchievement.updateOne(
      { userId: uid, achievementCode: achievement.code },
      {
        $set: {
          progress: Math.min(1, value / achievement.threshold),
          ...(reached ? { unlockedAt: new Date() } : {}),
        },
      },
      { upsert: true },
    );

    if (reached) {
      await awardXp(userId, achievement.xpReward, 'achievement', {
        type: 'achievement',
        id: String(achievement._id),
      });
      await Notification.create({
        userId: uid,
        type: 'achievement_unlocked',
        title: 'Mở khoá huy hiệu!',
        body: `${achievement.nameVi} — ${achievement.descriptionVi}`,
        data: { code: achievement.code, xpReward: achievement.xpReward },
      });
      newlyUnlocked.push({
        code: achievement.code,
        nameVi: achievement.nameVi,
        descriptionVi: achievement.descriptionVi,
        tier: achievement.tier,
        xpReward: achievement.xpReward,
      });
    }
  }

  return newlyUnlocked;
}

export async function getProfile(userId: string) {
  const uid = new Types.ObjectId(userId);
  const profile =
    (await LearningProfile.findOne({ userId: uid })) ??
    (await LearningProfile.create({ userId: uid }));

  const level = levelFromXp(profile.xp.total);
  let consumed = 0;
  for (let i = 1; i < level; i += 1) consumed += xpForLevel(i);
  const intoLevel = profile.xp.total - consumed;
  const needed = xpForLevel(level);

  const [unlockedCount, totalAchievements, todayXp] = await Promise.all([
    UserAchievement.countDocuments({ userId: uid, unlockedAt: { $ne: null } }),
    Achievement.countDocuments({ isActive: true }),
    XpLedger.aggregate([
      { $match: { userId: uid, dateKey: todayKey() } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  return {
    xp: {
      total: profile.xp.total,
      thisWeek: profile.xp.thisWeek,
      today: todayXp[0]?.total ?? 0,
      dailyCap: DAILY_XP_CAP,
      level,
      levelTitle: titleForLevel(level),
      intoLevel,
      neededForNextLevel: needed,
      progressPercent: Math.min(100, Math.round((intoLevel / needed) * 100)),
    },
    streak: profile.streak,
    achievements: { unlocked: unlockedCount, total: totalAchievements },
  };
}

export async function listAchievements(userId: string) {
  const uid = new Types.ObjectId(userId);
  const [all, mine] = await Promise.all([
    Achievement.find({ isActive: true }).sort({ order: 1 }).lean(),
    UserAchievement.find({ userId: uid }).lean(),
  ]);

  const byCode = new Map(mine.map((m) => [m.achievementCode, m]));

  return all
    .map((a) => {
      const state = byCode.get(a.code);
      const unlocked = Boolean(state?.unlockedAt);
      // Huy hiệu bí mật chưa mở thì giấu tên và mô tả
      if (a.isSecret && !unlocked) {
        return {
          code: a.code,
          nameVi: '???',
          descriptionVi: 'Huy hiệu bí mật — hãy khám phá!',
          tier: a.tier,
          category: a.category,
          isSecret: true,
          unlocked: false,
          progress: 0,
        };
      }
      return {
        code: a.code,
        nameVi: a.nameVi,
        descriptionVi: a.descriptionVi,
        tier: a.tier,
        category: a.category,
        threshold: a.threshold,
        xpReward: a.xpReward,
        isSecret: a.isSecret,
        unlocked,
        unlockedAt: state?.unlockedAt ?? null,
        progress: state?.progress ?? 0,
      };
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Bảng xếp hạng theo cấp độ
// ---------------------------------------------------------------------------

/**
 * Điểm xếp hạng = tổng số mục đã học được.
 *
 * Cố ý KHÔNG dùng XP: XP cộng cả theo thời gian ngồi học và thành tích phụ, nên
 * người rảnh rỗi luôn thắng người học hiệu quả. Đếm số chữ thật sự học được thì
 * công bằng hơn, và cũng đúng với điều người dùng mô tả — "A học được 3 bảng
 * chữ cái, B học được 2 bảng thì A đứng trên".
 */
const RANK_SCORE = {
  $add: [
    '$totals.kanaLearned',
    '$totals.kanjiLearned',
    '$totals.vocabularyLearned',
    '$totals.grammarLearned',
  ],
};

export async function getLeaderboard(
  userId: string,
  levelCode: string,
  page = 1,
  limit = 20,
) {
  const uid = new Types.ObjectId(userId);
  const safeLimit = Math.min(50, Math.max(5, limit));
  const skip = (Math.max(1, page) - 1) * safeLimit;

  /*
   * Người đã tắt hiển thị trong cài đặt bị loại khỏi bảng — kể cả khỏi phép
   * đếm thứ hạng. Nửa vời (giấu tên nhưng vẫn chiếm một dòng) thì vẫn là để lộ
   * việc họ có mặt và đứng ở đâu.
   */
  const rows = await LearningProfile.aggregate([
    { $match: { currentLevelCode: levelCode } },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $match: {
        'user.deletedAt': null,
        'user.status': 'active',
        'user.settings.hideFromLeaderboard': { $ne: true },
      },
    },
    {
      $project: {
        userId: 1,
        score: RANK_SCORE,
        displayName: '$user.profile.displayName',
        avatarPreset: '$user.profile.avatarPreset',
        streak: '$streak.current',
        xpLevel: '$xp.level',
        breakdown: {
          kana: '$totals.kanaLearned',
          kanji: '$totals.kanjiLearned',
          vocabulary: '$totals.vocabularyLearned',
          grammar: '$totals.grammarLearned',
        },
      },
    },
    // Chuỗi ngày làm tiêu chí phụ: cùng số chữ thì người học đều đặn hơn đứng trên
    { $sort: { score: -1, streak: -1, _id: 1 } },
  ]);

  const total = rows.length;
  const ranked = rows.map((row, index) => ({
    rank: index + 1,
    userId: String(row.userId),
    displayName: row.displayName,
    avatarPreset: row.avatarPreset,
    score: row.score,
    streak: row.streak,
    xpLevel: row.xpLevel,
    breakdown: row.breakdown,
    isMe: String(row.userId) === String(uid),
  }));

  /*
   * Vị trí của chính người dùng luôn được trả về, kể cả khi họ nằm ngoài trang
   * đang xem. Người đứng thứ 340 vẫn cần thấy mình ở đâu — không thấy gì cả thì
   * bảng xếp hạng chỉ còn là nơi tôn vinh vài người đứng đầu.
   */
  const me = ranked.find((r) => r.isMe) ?? null;

  return {
    levelCode,
    page: Math.max(1, page),
    limit: safeLimit,
    total,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    entries: ranked.slice(skip, skip + safeLimit),
    me,
  };
}

export async function listNotifications(userId: string, limit = 30) {
  return Notification.find({ userId: new Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export async function markNotificationRead(userId: string, id: string) {
  await Notification.updateOne(
    { _id: id, userId: new Types.ObjectId(userId) },
    { $set: { readAt: new Date() } },
  );
  return { ok: true };
}
