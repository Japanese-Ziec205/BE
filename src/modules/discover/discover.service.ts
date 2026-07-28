import { Types } from 'mongoose';
import { SrsCard } from '../../models/Learning';
import { Kana } from '../../models/Kana';
import { Kanji } from '../../models/Kanji';
import { Vocabulary } from '../../models/Vocabulary';
import { GrammarPoint } from '../../models/GrammarPoint';
import { Kotowaza } from '../../models/Kotowaza';
import { LearningProfile } from '../../models/LearningProfile';
import { CULTURE_NOTES } from '../../seeds/data/culture.data';

export type DiscoverKind = 'recall' | 'culture' | 'kotowaza';

export interface DiscoverCard {
  kind: DiscoverKind;
  /** Khoá ổn định, dùng làm React key ở phía giao diện. */
  key: string;
  emoji: string;
  eyebrow: string;
  title: string;
  reading: string;
  body: string;
  /** Đường dẫn để người học xem kỹ hơn, `null` nếu không có trang tương ứng. */
  href: string | null;
}

/**
 * Ưu tiên thẻ đã ôn được ít nhất một lần.
 *
 * Thẻ hoàn toàn mới chưa từng gặp thì không phải "nhắc lại kiến thức cũ" — hiện
 * nó ở đây chỉ làm người học hoang mang vì thấy chữ lạ hoắc ở trang chính.
 */
const MIN_REPETITIONS = 1;

function pickRandom<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    const [taken] = pool.splice(Math.floor(Math.random() * pool.length), 1);
    out.push(taken);
  }
  return out;
}

/** Chuyển thẻ SRS đã học thành thẻ nhắc lại, gộp truy vấn theo loại để tránh N+1. */
async function buildRecallCards(userId: string, limit: number): Promise<DiscoverCard[]> {
  if (limit <= 0) return [];

  const cards = await SrsCard.find({
    userId: new Types.ObjectId(userId),
    repetitions: { $gte: MIN_REPETITIONS },
  })
    .select('itemType itemKey')
    .limit(200)
    .lean();

  if (cards.length === 0) return [];

  // Bỏ trùng: một chữ sinh ra nhiều thẻ (nhận mặt, nhớ lại, viết tay) nhưng ở
  // đây chỉ cần nhắc lại chính chữ đó một lần.
  const unique = new Map<string, { itemType: string; itemKey: string }>();
  for (const c of cards) unique.set(`${c.itemType}:${c.itemKey}`, c);

  const chosen = pickRandom([...unique.values()], limit);
  const keysOf = (type: string) => chosen.filter((c) => c.itemType === type).map((c) => c.itemKey);
  const toObjectIds = (keys: string[]) =>
    keys.filter((k) => Types.ObjectId.isValid(k)).map((k) => new Types.ObjectId(k));

  const [kana, kanji, vocabulary, grammar] = await Promise.all([
    Kana.find({ character: { $in: keysOf('kana') } }).lean(),
    Kanji.find({ character: { $in: keysOf('kanji') } }).lean(),
    Vocabulary.find({ _id: { $in: toObjectIds(keysOf('vocabulary')) } }).lean(),
    GrammarPoint.find({ _id: { $in: toObjectIds(keysOf('grammar')) } }).lean(),
  ]);

  const out: DiscoverCard[] = [];

  for (const k of kana) {
    out.push({
      kind: 'recall',
      key: `kana:${k.character}`,
      emoji: '🔤',
      eyebrow: 'Bạn đã học chữ này',
      title: k.character,
      reading: k.romaji,
      body: k.mnemonicVi || `Đọc là "${k.romaji}".`,
      href: '/hoc',
    });
  }

  for (const k of kanji) {
    out.push({
      kind: 'recall',
      key: `kanji:${k.character}`,
      emoji: '🈶',
      eyebrow: 'Hán tự bạn đã gặp',
      title: k.character,
      reading: k.sinoVietnamese,
      body: (k.meaningsVi ?? []).join(', '),
      href: '/hoc',
    });
  }

  for (const v of vocabulary) {
    out.push({
      kind: 'recall',
      key: `vocabulary:${String(v._id)}`,
      emoji: '📖',
      eyebrow: 'Từ vựng ôn lại',
      title: v.word,
      reading: v.reading,
      body: (v.meaningsVi ?? []).join(', '),
      href: '/on-tap',
    });
  }

  for (const g of grammar) {
    out.push({
      kind: 'recall',
      key: `grammar:${String(g._id)}`,
      emoji: '🧩',
      eyebrow: 'Mẫu ngữ pháp ôn lại',
      title: g.pattern,
      reading: g.patternRomaji,
      body: g.meaningVi,
      href: '/on-tap',
    });
  }

  return out;
}

/**
 * Nội dung cho khối tự đổi ở trang chính.
 *
 * Trộn ba nguồn: kiến thức người học ĐÃ gặp, mẩu văn hoá Nhật Bản, và tục ngữ.
 * Người học mới tinh chưa có thẻ nào vẫn nhận đủ thẻ văn hoá, nên khối này
 * không bao giờ trống — trang chính trống trơn ngay hôm đầu là lý do rất hay
 * khiến người ta đóng tab và không quay lại.
 */
export async function getDiscoverFeed(userId: string, limit = 8): Promise<DiscoverCard[]> {
  const recallTarget = Math.ceil(limit / 2);

  const [recall, kotowazaPool, profile] = await Promise.all([
    buildRecallCards(userId, recallTarget),
    Kotowaza.find({ isPublished: true }).lean(),
    LearningProfile.findOne({ userId: new Types.ObjectId(userId) }).select('currentLevelCode').lean(),
  ]);

  const cultureCards: DiscoverCard[] = pickRandom(CULTURE_NOTES, limit).map((c) => ({
    kind: 'culture' as const,
    key: `culture:${c.key}`,
    emoji: c.emoji,
    eyebrow: 'Văn hoá Nhật Bản',
    title: c.title,
    reading: `${c.japanese} · ${c.reading}`,
    body: c.body,
    href: null,
  }));

  const kotowazaCards: DiscoverCard[] = pickRandom(kotowazaPool, 2).map((k) => ({
    kind: 'kotowaza' as const,
    key: `kotowaza:${String(k._id)}`,
    emoji: '🎐',
    eyebrow: 'Tục ngữ',
    title: k.japanese,
    reading: k.reading,
    body: k.vietnameseEquivalent
      ? `${k.meaningVi} (tương đương: ${k.vietnameseEquivalent})`
      : k.meaningVi,
    href: null,
  }));

  /*
   * Xen kẽ chứ không nối đuôi.
   *
   * Nếu ghép thẳng thì người học sẽ thấy bốn thẻ ôn tập liền rồi bốn thẻ văn
   * hoá liền — mất hẳn cảm giác "mỗi lần nhìn lại thấy thứ khác". Xen kẽ giữ
   * cho hai loại nội dung luân phiên nhau.
   */
  const others = [...kotowazaCards, ...cultureCards];
  const mixed: DiscoverCard[] = [];
  for (let i = 0; mixed.length < limit && (i < recall.length || i < others.length); i += 1) {
    if (i < recall.length) mixed.push(recall[i]);
    if (mixed.length < limit && i < others.length) mixed.push(others[i]);
  }

  return mixed.slice(0, limit).map((card) => ({
    ...card,
    // Ghi kèm cấp độ vào thẻ nhắc lại để giao diện hiển thị đúng ngữ cảnh
    eyebrow:
      card.kind === 'recall' && profile?.currentLevelCode
        ? `${card.eyebrow} · ${profile.currentLevelCode}`
        : card.eyebrow,
  }));
}
