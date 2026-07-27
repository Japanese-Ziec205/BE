import type { Request } from 'express';
import { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { ContentRevision, type ContentType } from '../../models/ContentRevision';
import { ReviewTask, ContentReport } from '../../models/ReviewTask';
import { Kanji } from '../../models/Kanji';
import { getContentConfig } from './cms.registry';
import { computeMaxKanjiLevel, extractKanji } from '../../utils/japanese';
import { writeAudit } from '../../services/audit';
import { permissionsOf, type Role } from '../../constants/permissions';

// ---------------------------------------------------------------------------
// Kiểm soát cấp độ Kanji (BR-10)
// ---------------------------------------------------------------------------

let kanjiLevelCache: Map<string, string> | null = null;
let kanjiCacheAt = 0;
const KANJI_CACHE_TTL = 10 * 60_000;

async function getKanjiLevelMap(): Promise<Map<string, string>> {
  if (kanjiLevelCache && Date.now() - kanjiCacheAt < KANJI_CACHE_TTL) return kanjiLevelCache;
  const rows = await Kanji.find().select('character jlptLevel').lean();
  kanjiLevelCache = new Map(rows.map((r) => [r.character, r.jlptLevel]));
  kanjiCacheAt = Date.now();
  return kanjiLevelCache;
}

export function invalidateKanjiCache() {
  kanjiLevelCache = null;
}

/** Gom toàn bộ text tiếng Nhật của một document theo cấu hình đăng ký. */
function collectJapaneseText(doc: Record<string, unknown>, fields: string[]): string {
  return fields
    .map((f) => {
      const value = doc[f];
      return typeof value === 'string' ? value : '';
    })
    .join('');
}

export interface LevelCheckResult {
  maxKanjiLevel: string | null;
  aboveLevelKanji: string[];
  hasFurigana: boolean;
  passed: boolean;
}

/**
 * Kiểm tra nội dung có chứa Kanji vượt cấp độ mà thiếu Furigana không.
 * Đây là quy tắc nghiêm ngặt nhất theo mục 6 giáo trình.
 */
export async function checkKanjiLevel(
  type: string,
  doc: Record<string, unknown>,
): Promise<LevelCheckResult> {
  const config = getContentConfig(type);
  if (!config || config.japaneseFields.length === 0) {
    return { maxKanjiLevel: null, aboveLevelKanji: [], hasFurigana: true, passed: true };
  }

  const levelMap = await getKanjiLevelMap();
  const text = collectJapaneseText(doc, config.japaneseFields);
  const chars = extractKanji(text);
  const maxKanjiLevel = computeMaxKanjiLevel(chars, levelMap);

  const targetLevel = String(doc.jlptLevel ?? 'N5');
  const ORDER = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const targetIdx = ORDER.indexOf(targetLevel);

  const aboveLevelKanji = chars.filter((ch) => {
    const lv = levelMap.get(ch);
    const idx = lv ? ORDER.indexOf(lv) : ORDER.length - 1;
    return idx > targetIdx;
  });

  // Có furigana nếu mọi đoạn chứa Kanji đều được gán cách đọc
  const segments = (doc.furiganaSegments as { text: string; reading: string | null }[]) ?? [];
  const hasFurigana =
    segments.length > 0 &&
    segments
      .filter((s) => extractKanji(s.text).length > 0)
      .every((s) => s.reading !== null && s.reading !== '');

  return {
    maxKanjiLevel,
    aboveLevelKanji,
    hasFurigana,
    passed: aboveLevelKanji.length === 0 || hasFurigana,
  };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

function requireConfig(type: string) {
  const config = getContentConfig(type);
  if (!config) {
    throw AppError.badRequest('CONTENT_UNKNOWN_TYPE', `Loại nội dung "${type}" không hợp lệ`);
  }
  return config;
}

export async function listContent(
  type: string,
  actor: { id: string; role: Role; perms: string[] },
  query: { page?: number; limit?: number; status?: string; level?: string; search?: string },
) {
  const config = requireConfig(type);
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));

  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.level) filter.jlptLevel = query.level;

  // Cộng tác viên chỉ thấy bản nháp của chính mình, cộng nội dung đã xuất bản
  const granted = permissionsOf(actor.role, actor.perms);
  if (!granted.has('content.update.any')) {
    filter.$or = [{ authorId: new Types.ObjectId(actor.id) }, { status: 'published' }];
  }

  if (query.search) {
    const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$and = [
      { $or: config.searchFields.map((f) => ({ [f]: regex })) },
      ...(filter.$or ? [{ $or: filter.$or }] : []),
    ];
    delete filter.$or;
  }

  const [items, total] = await Promise.all([
    config.model
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    config.model.countDocuments(filter),
  ]);

  return { items, page, limit, total };
}

export async function getContent(type: string, id: string) {
  const config = requireConfig(type);
  const doc = await config.model.findById(id).lean();
  if (!doc) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy nội dung');
  return doc;
}

export async function createContent(
  type: string,
  actorId: string,
  payload: Record<string, unknown>,
  req: Request,
) {
  const config = requireConfig(type);

  const check = await checkKanjiLevel(type, payload);
  const doc = await config.model.create({
    ...payload,
    ...(check.maxKanjiLevel ? { maxKanjiLevel: check.maxKanjiLevel } : {}),
    status: config.hasWorkflow ? 'draft' : 'published',
    authorId: actorId,
    version: 1,
  });

  await ContentRevision.create({
    targetType: type as ContentType,
    targetId: doc._id,
    version: 1,
    snapshot: doc.toObject(),
    action: 'create',
    authorId: actorId,
    changeSummary: 'Tạo mới',
  });

  await writeAudit({ req, actorId, action: 'CONTENT_CREATE', targetType: type, targetId: doc._id });
  return doc;
}

export async function updateContent(
  type: string,
  id: string,
  actor: { id: string; role: Role; perms: string[] },
  payload: Record<string, unknown>,
  req: Request,
) {
  const config = requireConfig(type);
  const doc = await config.model.findById(id);
  if (!doc) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy nội dung');

  const granted = permissionsOf(actor.role, actor.perms);

  // BR-11: nội dung đã xuất bản là bất biến. Muốn sửa phải tạo bản mới đi
  // qua quy trình duyệt, tránh việc học viên đang học dở thì nội dung đổi.
  if (doc.status === 'published' && !granted.has('content.publish')) {
    throw AppError.forbidden(
      'CONTENT_IMMUTABLE_PUBLISHED',
      'Nội dung đã xuất bản không sửa trực tiếp được. Hãy tạo bản sửa đổi mới.',
    );
  }

  if (!granted.has('content.update.any') && String(doc.authorId) !== actor.id) {
    throw AppError.forbidden('AUTH_FORBIDDEN', 'Bạn chỉ sửa được nội dung do mình soạn');
  }

  const before = doc.toObject();
  Object.assign(doc, payload);

  const check = await checkKanjiLevel(type, doc.toObject());
  if (check.maxKanjiLevel) doc.maxKanjiLevel = check.maxKanjiLevel;
  doc.version = (doc.version ?? 1) + 1;
  await doc.save();

  await ContentRevision.create({
    targetType: type as ContentType,
    targetId: doc._id,
    version: doc.version,
    snapshot: doc.toObject(),
    action: 'update',
    authorId: actor.id,
    changeSummary: `Cập nhật ${Object.keys(payload).join(', ')}`,
  });

  await writeAudit({
    req, actorId: actor.id, action: 'CONTENT_UPDATE',
    targetType: type, targetId: doc._id, before, after: doc.toObject(),
  });
  return doc;
}

// ---------------------------------------------------------------------------
// Workflow duyệt
// ---------------------------------------------------------------------------

export async function submitForReview(type: string, id: string, actorId: string, req: Request) {
  const config = requireConfig(type);
  if (!config.hasWorkflow) {
    throw AppError.badRequest('CONTENT_NO_WORKFLOW', 'Loại nội dung này không qua quy trình duyệt');
  }

  const doc = await config.model.findById(id);
  if (!doc) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy nội dung');

  if (!['draft', 'changes_requested', 'rejected'].includes(doc.status)) {
    throw AppError.conflict(
      'CONTENT_INVALID_STATE',
      `Không thể gửi duyệt nội dung đang ở trạng thái "${doc.status}"`,
    );
  }

  // Chặn ngay từ đây, không để nội dung vượt cấp vào hàng chờ của giảng viên
  const check = await checkKanjiLevel(type, doc.toObject());
  if (!check.passed) {
    throw AppError.unprocessable(
      'CONTENT_KANJI_LEVEL_VIOLATION',
      `Nội dung chứa Kanji vượt cấp ${doc.jlptLevel} mà chưa có Furigana: ${check.aboveLevelKanji.join(', ')}`,
      { aboveLevelKanji: check.aboveLevelKanji },
    );
  }

  doc.status = 'pending_review';
  await doc.save();

  await ReviewTask.findOneAndUpdate(
    { targetType: type, targetId: doc._id, status: { $in: ['pending', 'changes_requested'] } },
    {
      $set: {
        targetType: type, targetId: doc._id,
        submittedBy: actorId, submittedAt: new Date(),
        status: 'pending',
      },
    },
    { upsert: true, new: true },
  );

  await ContentRevision.create({
    targetType: type as ContentType, targetId: doc._id, version: doc.version,
    snapshot: doc.toObject(), action: 'submit', authorId: actorId,
    changeSummary: 'Gửi duyệt',
  });

  return doc;
}

export async function reviewContent(
  taskId: string,
  reviewerId: string,
  decision: 'approve' | 'request_changes' | 'reject',
  note: string,
  req: Request,
) {
  const task = await ReviewTask.findById(taskId);
  if (!task) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy yêu cầu duyệt');

  // Bắt buộc người thứ hai thẩm định — tự duyệt bài của chính mình thì
  // quy trình kiểm soát chất lượng mất hết ý nghĩa.
  if (String(task.submittedBy) === reviewerId) {
    throw AppError.forbidden(
      'CONTENT_SELF_REVIEW',
      'Không thể duyệt nội dung do chính bạn soạn. Cần người thứ hai thẩm định.',
    );
  }

  if (!['pending', 'in_review'].includes(task.status)) {
    throw AppError.conflict('CONTENT_INVALID_STATE', 'Yêu cầu duyệt này đã được xử lý');
  }

  const config = requireConfig(task.targetType);
  const doc = await config.model.findById(task.targetId);
  if (!doc) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Nội dung đích không còn tồn tại');

  const statusMap = {
    approve: { task: 'approved', content: 'approved', action: 'approve' },
    request_changes: { task: 'changes_requested', content: 'changes_requested', action: 'request_changes' },
    reject: { task: 'rejected', content: 'rejected', action: 'reject' },
  } as const;
  const next = statusMap[decision];

  task.status = next.task;
  task.decidedBy = new Types.ObjectId(reviewerId);
  task.decidedAt = new Date();
  if (note) {
    task.reviewNotes.push({
      byUserId: new Types.ObjectId(reviewerId),
      note,
      createdAt: new Date(),
    });
  }
  await task.save();

  doc.status = next.content;
  doc.reviewerId = reviewerId;
  await doc.save();

  await ContentRevision.create({
    targetType: task.targetType, targetId: doc._id, version: doc.version,
    snapshot: doc.toObject(), action: next.action, authorId: reviewerId,
    changeSummary: note,
  });

  await writeAudit({
    req, actorId: reviewerId, action: `CONTENT_${decision.toUpperCase()}`,
    targetType: task.targetType, targetId: doc._id,
  });

  return { task, content: doc };
}

export async function publishContent(type: string, id: string, adminId: string, req: Request) {
  const config = requireConfig(type);
  const doc = await config.model.findById(id);
  if (!doc) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy nội dung');

  if (config.hasWorkflow && doc.status !== 'approved') {
    throw AppError.conflict(
      'CONTENT_NOT_APPROVED',
      'Nội dung phải được thẩm định chuyên môn trước khi xuất bản',
    );
  }

  const check = await checkKanjiLevel(type, doc.toObject());
  if (!check.passed) {
    throw AppError.unprocessable(
      'CONTENT_KANJI_LEVEL_VIOLATION',
      `Không thể xuất bản: chứa Kanji vượt cấp mà thiếu Furigana (${check.aboveLevelKanji.join(', ')})`,
      { aboveLevelKanji: check.aboveLevelKanji },
    );
  }

  doc.status = 'published';
  doc.publishedAt = new Date();
  doc.version = (doc.version ?? 1) + 1;
  await doc.save();

  if (type === 'kanji') invalidateKanjiCache();

  await ContentRevision.create({
    targetType: type as ContentType, targetId: doc._id, version: doc.version,
    snapshot: doc.toObject(), action: 'publish', authorId: adminId,
    changeSummary: 'Xuất bản',
  });

  await writeAudit({
    req, actorId: adminId, action: 'CONTENT_PUBLISH',
    targetType: type, targetId: doc._id, severity: 'warn',
  });

  return doc;
}

export async function archiveContent(type: string, id: string, adminId: string, req: Request) {
  const config = requireConfig(type);
  const doc = await config.model.findByIdAndUpdate(id, { $set: { status: 'archived' } }, { new: true });
  if (!doc) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy nội dung');

  await writeAudit({
    req, actorId: adminId, action: 'CONTENT_ARCHIVE',
    targetType: type, targetId: id, severity: 'warn',
  });
  return doc;
}

export async function listReviewQueue(query: { status?: string; type?: string; page?: number }) {
  const page = Math.max(1, query.page ?? 1);
  const limit = 20;
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  else filter.status = { $in: ['pending', 'in_review'] };
  if (query.type) filter.targetType = query.type;

  const [tasks, total] = await Promise.all([
    ReviewTask.find(filter)
      .sort({ priority: -1, submittedAt: 1 }) // chờ lâu nhất được xử lý trước
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('submittedBy', 'profile.displayName role')
      .lean(),
    ReviewTask.countDocuments(filter),
  ]);

  // Đính kèm nội dung đích để người duyệt không phải gọi thêm API
  const enriched = await Promise.all(
    tasks.map(async (t) => {
      const config = getContentConfig(t.targetType);
      const content = config ? await config.model.findById(t.targetId).lean() : null;
      return { ...t, content, isOverdue: new Date(t.slaBy) < new Date() };
    }),
  );

  return { items: enriched, page, limit, total };
}

export async function getRevisions(type: string, id: string) {
  return ContentRevision.find({ targetType: type, targetId: id })
    .sort({ version: -1 })
    .populate('authorId', 'profile.displayName role')
    .lean();
}

export async function restoreRevision(
  type: string,
  id: string,
  version: number,
  actorId: string,
  req: Request,
) {
  const config = requireConfig(type);
  const revision = await ContentRevision.findOne({ targetType: type, targetId: id, version });
  if (!revision) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy phiên bản này');

  const doc = await config.model.findById(id);
  if (!doc) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy nội dung');

  const snapshot = revision.snapshot as Record<string, unknown>;
  // Không khôi phục các trường định danh và trạng thái
  for (const key of ['_id', '__v', 'createdAt', 'updatedAt', 'status', 'version']) {
    delete snapshot[key];
  }
  Object.assign(doc, snapshot);
  doc.version = (doc.version ?? 1) + 1;
  doc.status = 'draft'; // khôi phục xong phải duyệt lại
  await doc.save();

  await ContentRevision.create({
    targetType: type as ContentType, targetId: doc._id, version: doc.version,
    snapshot: doc.toObject(), action: 'restore', authorId: actorId,
    changeSummary: `Khôi phục về phiên bản ${version}`,
  });

  await writeAudit({
    req, actorId, action: 'CONTENT_RESTORE',
    targetType: type, targetId: id, severity: 'warn',
  });
  return doc;
}

export async function reportContent(
  reporterId: string,
  input: { targetType: string; targetId: string; reason: string; description?: string },
) {
  return ContentReport.create({
    reporterId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    description: input.description ?? '',
  });
}
