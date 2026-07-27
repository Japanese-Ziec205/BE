import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../middlewares/validate';
import { ok } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import { Kana } from '../../models/Kana';
import { Kanji } from '../../models/Kanji';
import { Radical } from '../../models/Radical';
import { GrammarPoint } from '../../models/GrammarPoint';
import { Kotowaza } from '../../models/Kotowaza';
import { User } from '../../models/User';
import { LearningProfile } from '../../models/LearningProfile';

const router = Router();

/**
 * API công khai, không cần đăng nhập.
 *
 * Next.js gọi các endpoint này lúc build/ISR để render tĩnh trang tra cứu —
 * vừa tốt cho SEO, vừa giúp khách vãng lai không phải chờ Render đánh thức
 * instance đang ngủ.
 */

const CACHE_1H = 'public, s-maxage=3600, stale-while-revalidate=86400';
const CACHE_24H = 'public, s-maxage=86400, stale-while-revalidate=604800';

router.get(
  '/kana/chart',
  asyncHandler(async (req: Request, res: Response) => {
    const script = (req.query.script as string) ?? 'hiragana';
    if (!['hiragana', 'katakana'].includes(script)) {
      throw AppError.badRequest('INVALID_PARAM', 'script phải là hiragana hoặc katakana');
    }

    const items = await Kana.find({ script, isPublished: true })
      .select('character romaji romajiAlt group row column order strokeCount mnemonicVi similarTo exampleWords teachOrder')
      .sort({ group: 1, order: 1 })
      .lean();

    // Nhóm sẵn theo loại để frontend dựng bảng mà không phải xử lý thêm
    const grouped = {
      gojuon: items.filter((i) => i.group === 'gojuon'),
      dakuten: items.filter((i) => i.group === 'dakuten'),
      handakuten: items.filter((i) => i.group === 'handakuten'),
      yoon: items.filter((i) => i.group === 'yoon'),
      special: items.filter((i) => i.group === 'special'),
    };

    res.setHeader('Cache-Control', CACHE_24H);
    return ok(res, { script, total: items.length, groups: grouped });
  }),
);

router.get(
  '/kana/:character',
  asyncHandler(async (req: Request, res: Response) => {
    const item = await Kana.findOne({
      character: decodeURIComponent(req.params.character),
      isPublished: true,
    }).lean();
    if (!item) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy ký tự này');

    res.setHeader('Cache-Control', CACHE_24H);
    return ok(res, item);
  }),
);

router.get(
  '/kanji',
  asyncHandler(async (req: Request, res: Response) => {
    const level = (req.query.level as string) ?? 'N5';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Number(req.query.limit) || 50);

    const [items, total] = await Promise.all([
      Kanji.find({ jlptLevel: level, isPublished: true })
        .select('character sinoVietnamese meaningsVi strokeCount jlptLevel teachOrder readings')
        .sort({ teachOrder: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Kanji.countDocuments({ jlptLevel: level, isPublished: true }),
    ]);

    res.setHeader('Cache-Control', CACHE_24H);
    return ok(res, { items, page, limit, total });
  }),
);

router.get(
  '/kanji/:character',
  asyncHandler(async (req: Request, res: Response) => {
    const character = decodeURIComponent(req.params.character);
    const item = await Kanji.findOne({ character, isPublished: true }).lean();
    if (!item) throw AppError.notFound('RESOURCE_NOT_FOUND', 'Không tìm thấy Hán tự này');

    // Nạp kèm thông tin bộ thủ cấu thành để hiển thị phần chiết tự
    const components = await Radical.find({
      character: { $in: [item.radicalCharacter, ...item.componentCharacters] },
    })
      .select('character nameVi meaningVi strokeCount')
      .lean();

    res.setHeader('Cache-Control', CACHE_24H);
    return ok(res, { ...item, components });
  }),
);

router.get(
  '/radicals',
  asyncHandler(async (_req: Request, res: Response) => {
    const items = await Radical.find({ isPublished: true })
      .select('number character variants strokeCount nameVi meaningVi position')
      .sort({ number: 1 })
      .lean();
    res.setHeader('Cache-Control', CACHE_24H);
    return ok(res, { total: items.length, items });
  }),
);

router.get(
  '/grammar',
  asyncHandler(async (req: Request, res: Response) => {
    const level = (req.query.level as string) ?? 'N5';
    const items = await GrammarPoint.find({ jlptLevel: level, status: 'published' })
      .select('pattern titleVi meaningVi formation category teachOrder jlptLevel')
      .sort({ teachOrder: 1 })
      .lean();
    res.setHeader('Cache-Control', CACHE_1H);
    return ok(res, { level, total: items.length, items });
  }),
);

router.get(
  '/kotowaza/daily',
  asyncHandler(async (req: Request, res: Response) => {
    const context = (req.query.context as string) ?? 'daily_home';
    const pool = await Kotowaza.find({ displayContexts: context, isPublished: true }).lean();
    if (pool.length === 0) {
      const fallback = await Kotowaza.findOne({ isPublished: true }).lean();
      return ok(res, fallback);
    }

    // Cùng một ngày trả về cùng một câu, để người dùng tải lại trang không bị đổi
    const dayIndex = Math.floor(Date.now() / 86_400_000);
    res.setHeader('Cache-Control', CACHE_1H);
    return ok(res, pool[dayIndex % pool.length]);
  }),
);

router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const [learners, kanaCount, kanjiCount, profiles] = await Promise.all([
      User.countDocuments({ deletedAt: null, status: { $ne: 'deleted' } }),
      Kana.countDocuments({ isPublished: true }),
      Kanji.countDocuments({ isPublished: true }),
      LearningProfile.aggregate([
        { $group: { _id: null, totalMinutes: { $sum: '$totals.studyMinutes' } } },
      ]),
    ]);

    res.setHeader('Cache-Control', CACHE_1H);
    return ok(res, {
      learners,
      kanaCount,
      kanjiCount,
      communityStudyHours: Math.round((profiles[0]?.totalMinutes ?? 0) / 60),
    });
  }),
);

export default router;
