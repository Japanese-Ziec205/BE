import type { Request } from 'express';
import { AppError } from '../../utils/AppError';
import { User } from '../../models/User';
import { RefreshToken } from '../../models/RefreshToken';
import {
  LearningProfile,
  levelFromXp,
  titleForLevel,
  xpForLevel,
} from '../../models/LearningProfile';
import { publicUser } from '../auth/auth.service';
import { writeAudit } from '../../services/audit';

export async function getProfile(userId: string) {
  const user = await User.findById(userId);
  if (!user || user.deletedAt) {
    throw AppError.notFound('AUTH_USER_NOT_FOUND', 'Không tìm thấy tài khoản');
  }

  const profile =
    (await LearningProfile.findOne({ userId: user._id })) ??
    (await LearningProfile.create({ userId: user._id }));

  return {
    ...publicUser(user, profile.currentLevelCode),
    profile: {
      bio: user.profile.bio,
      province: user.profile.province,
      dateOfBirth: user.profile.dateOfBirth,
      timezone: user.profile.timezone,
    },
    learning: {
      currentLevelCode: profile.currentLevelCode,
      learningGoal: profile.learningGoal,
      targetLevel: profile.targetLevel,
      targetDate: profile.targetDate,
      dailyGoalMinutes: profile.dailyGoalMinutes,
      unlockedLevelCodes: profile.unlockedLevelCodes,
      onboardingCompleted: profile.onboardingCompleted,
    },
    createdAt: user.createdAt,
  };
}

export async function updateProfile(
  userId: string,
  input: Record<string, unknown>,
  req: Request,
) {
  const user = await User.findById(userId);
  if (!user || user.deletedAt) {
    throw AppError.notFound('AUTH_USER_NOT_FOUND', 'Không tìm thấy tài khoản');
  }

  const before = { ...user.profile };
  for (const key of ['displayName', 'bio', 'avatarPreset', 'province', 'dateOfBirth'] as const) {
    if (input[key] !== undefined) {
      (user.profile as unknown as Record<string, unknown>)[key] = input[key];
    }
  }
  await user.save();

  await writeAudit({
    req,
    actorId: userId,
    action: 'USER_PROFILE_UPDATE',
    targetType: 'user',
    targetId: userId,
    before,
    after: user.profile,
  });

  return publicUser(user);
}

export async function updateSettings(userId: string, input: Record<string, unknown>) {
  const user = await User.findById(userId);
  if (!user || user.deletedAt) {
    throw AppError.notFound('AUTH_USER_NOT_FOUND', 'Không tìm thấy tài khoản');
  }

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      (user.settings as unknown as Record<string, unknown>)[key] = value;
    }
  }
  await user.save();

  return user.settings;
}

/** Thứ tự từ dễ tới khó — dùng để mở khoá các cấp thấp hơn cấp đã chọn. */
export const LEVEL_ORDER = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;

export async function updateLearningProfile(userId: string, input: Record<string, unknown>) {
  const patch: Record<string, unknown> = { ...input };

  /*
   * Người học chọn "muốn học N3" nghĩa là họ muốn HỌC ở N3 ngay, không phải
   * học N5 rồi hướng tới N3. Nếu chỉ ghi targetLevel thì currentLevelCode vẫn
   * là N5, và toàn bộ phần còn lại của hệ thống — kho từ, đề thi thử, bảng xếp
   * hạng — đều dựa vào currentLevelCode nên sẽ phục vụ sai cấp độ.
   */
  if (typeof patch.targetLevel === 'string') {
    const index = LEVEL_ORDER.indexOf(patch.targetLevel as (typeof LEVEL_ORDER)[number]);
    if (index >= 0) {
      patch.currentLevelCode = patch.targetLevel;
      // Mở luôn các cấp dễ hơn: người nhắm N3 vẫn cần tra lại từ vựng N5.
      patch.unlockedLevelCodes = LEVEL_ORDER.slice(0, index + 1);
    }
  }

  const profile = await LearningProfile.findOneAndUpdate(
    { userId },
    { $set: patch },
    { new: true, upsert: true },
  );
  return profile;
}

export async function getStats(userId: string) {
  const profile =
    (await LearningProfile.findOne({ userId })) ??
    (await LearningProfile.create({ userId }));

  const level = levelFromXp(profile.xp.total);

  // XP đã tích luỹ để tới đầu cấp hiện tại
  let consumed = 0;
  for (let i = 1; i < level; i += 1) consumed += xpForLevel(i);
  const intoLevel = profile.xp.total - consumed;
  const needed = xpForLevel(level);

  return {
    totals: {
      studyHours: Math.round((profile.totals.studyMinutes / 60) * 10) / 10,
      studyMinutes: profile.totals.studyMinutes,
      lessonsCompleted: profile.totals.lessonsCompleted,
      kanaLearned: profile.totals.kanaLearned,
      kanjiLearned: profile.totals.kanjiLearned,
      vocabularyLearned: profile.totals.vocabularyLearned,
      grammarLearned: profile.totals.grammarLearned,
      reviewsDone: profile.totals.reviewsDone,
      examsTaken: profile.totals.examsTaken,
    },
    streak: profile.streak,
    xp: {
      total: profile.xp.total,
      thisWeek: profile.xp.thisWeek,
      level,
      levelTitle: titleForLevel(level),
      intoLevel,
      neededForNextLevel: needed,
      progressPercent: Math.min(100, Math.round((intoLevel / needed) * 100)),
    },
    currentLevelCode: profile.currentLevelCode,
    dailyGoalMinutes: profile.dailyGoalMinutes,
  };
}

/**
 * Xoá mềm theo BR-13: giữ lại bản ghi để thống kê tổng hợp không bị lệch,
 * nhưng gỡ định danh khỏi ràng buộc duy nhất để email/SĐT dùng lại được.
 */
export async function softDeleteAccount(userId: string, req: Request) {
  const user = await User.findById(userId);
  if (!user || user.deletedAt) {
    throw AppError.notFound('AUTH_USER_NOT_FOUND', 'Không tìm thấy tài khoản');
  }

  if (user.role === 'admin') {
    const remainingAdmins = await User.countDocuments({
      role: 'admin',
      deletedAt: null,
      _id: { $ne: user._id },
    });
    if (remainingAdmins === 0) {
      throw AppError.badRequest(
        'USER_LAST_ADMIN',
        'Không thể xoá quản trị viên cuối cùng của hệ thống',
      );
    }
  }

  user.deletedAt = new Date();
  user.status = 'deleted';
  user.tokenVersion += 1;
  // Gắn hậu tố để index duy nhất (partial trên deletedAt: null) nhả định danh ra
  user.identifiers = user.identifiers.map((i) => ({
    ...i,
    value: `${i.value}#deleted-${Date.now()}`,
  }));
  await user.save();

  await RefreshToken.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'admin' } },
  );

  await writeAudit({
    req,
    actorId: userId,
    action: 'USER_SELF_DELETE',
    targetType: 'user',
    targetId: userId,
    severity: 'high',
  });

  return { message: 'Tài khoản đã được xoá. Cảm ơn bạn đã đồng hành 🌸' };
}
