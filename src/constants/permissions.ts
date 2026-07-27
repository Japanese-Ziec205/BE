export const ROLES = ['student', 'contributor', 'lecturer', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  // Chương trình học
  'curriculum.read',
  'curriculum.manage',

  // Nội dung
  'content.create',
  'content.read.draft',
  'content.update.own',
  'content.update.any',
  'content.review',
  'content.publish',
  'content.archive',
  'content.delete',

  // Ngân hàng câu hỏi & đề thi
  'question.create',
  'question.review',
  'exam.template.manage',
  'exam.create',
  'exam.publish',

  // Chấm bài
  'grading.writing',
  'grading.speaking',
  'grading.queue.view',

  // Học viên
  'student.progress.read.own',
  'student.progress.read.class',
  'student.progress.read.any',
  'student.list.class',
  'student.list.any',

  // Người dùng
  'user.read',
  'user.update.own',
  'user.update.any',
  'user.role.assign',
  'user.suspend',
  'user.delete',

  // Hệ thống
  'system.config',
  'system.audit.read',
  'system.export',
  'system.import',
  'gamification.config',
  'analytics.read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Quyền cộng dồn theo bậc: lecturer có mọi quyền của contributor,
 * contributor có mọi quyền của student. Khai báo từng bậc rồi dựng dần —
 * không tự tham chiếu bên trong object literal (sẽ là undefined lúc chạy).
 */
const STUDENT: Permission[] = [
  'curriculum.read',
  'student.progress.read.own',
  'user.update.own',
];

const CONTRIBUTOR: Permission[] = [
  ...STUDENT,
  'content.create',
  'content.read.draft',
  'content.update.own',
  'question.create',
];

const LECTURER: Permission[] = [
  ...CONTRIBUTOR,
  'content.update.any',
  'content.review',
  'question.review',
  'exam.create',
  'grading.writing',
  'grading.speaking',
  'grading.queue.view',
  'student.progress.read.class',
  'student.list.class',
  'curriculum.manage',
  'analytics.read',
];

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  student: new Set(STUDENT),
  contributor: new Set(CONTRIBUTOR),
  lecturer: new Set(LECTURER),
  admin: new Set(PERMISSIONS),
};

export function permissionsOf(role: Role, extra: string[] = []): Set<string> {
  return new Set<string>([...ROLE_PERMISSIONS[role], ...extra]);
}
