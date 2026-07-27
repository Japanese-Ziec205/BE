import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(50).optional(),
  bio: z.string().trim().max(300).optional(),
  avatarPreset: z.number().int().min(0).max(11).optional(),
  province: z.string().trim().max(80).nullable().optional(),
  dateOfBirth: z.coerce.date().nullable().optional(),
});

export const updateSettingsSchema = z.object({
  uiMode: z.enum(['auto', 'genki', 'shizuka']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  dataSaver: z.boolean().optional(),
  furiganaMode: z.enum(['always', 'above_level', 'never']).optional(),
  fontSize: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
  reminderEnabled: z.boolean().optional(),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ nhắc phải có dạng HH:mm')
    .optional(),
  emailNotifications: z.boolean().optional(),
  romajiCrutch: z.boolean().optional(),
  hideFromLeaderboard: z.boolean().optional(),
});

export const updateLearningProfileSchema = z.object({
  learningGoal: z.enum(['jlpt', 'study_abroad', 'work', 'hobby', 'communication']).optional(),
  targetLevel: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']).optional(),
  targetDate: z.coerce.date().nullable().optional(),
  dailyGoalMinutes: z.number().int().min(5).max(240).optional(),
  onboardingCompleted: z.boolean().optional(),
});
