import { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import {
  SrsCard,
  ReviewLog,
  DailyStat,
  type ISrsCard,
  type SrsDirection,
  type SrsItemType,
} from '../../models/Learning';
import { LearningProfile } from '../../models/LearningProfile';
import { Kana } from '../../models/Kana';
import { Kanji } from '../../models/Kanji';
import { Vocabulary } from '../../models/Vocabulary';
import { GrammarPoint } from '../../models/GrammarPoint';
import { awardXp, evaluateAchievements, updateStreak } from '../gamification/gamification.service';
import { todayKey } from '../study/study.service';
import {
  dailyNewLimit,
  interleaveByType,
  previewIntervals,
  schedule,
  type Rating,
  type SchedulingState,
} from './srs.engine';

/** Ngưỡng tồn đọng: quá mức này thì không nạp thêm thẻ mới nữa (BR-05). */
export const BACKLOG_THRESHOLD = 50;

/** Hướng ôn tương ứng từng loại item. Listening chờ có audio mới bật. */
const DIRECTIONS_BY_TYPE: Record<SrsItemType, SrsDirection[]> = {
  kana: ['recognition', 'recall', 'writing'],
  kanji: ['recognition', 'recall'],
  vocabulary: ['recognition', 'recall'],
  grammar: ['recognition'],
};

/**
 * Tạo thẻ SRS cho các item vừa được học.
 *
 * Chỉ tạo khi item THỰC SỰ được học, không tạo trước hàng loạt: một người học
 * tới N1 sẽ có hơn 15.000 thẻ, tạo sẵn tất cả sẽ làm phình database quá mức
 * cho phép của gói MongoDB miễn phí.
 */
export async function enrollItems(
  userId: string,
  items: { itemType: SrsItemType; itemKey: string }[],
): Promise<number> {
  if (items.length === 0) return 0;

  const ops = items.flatMap((item) =>
    DIRECTIONS_BY_TYPE[item.itemType].map((direction) => ({
      updateOne: {
        filter: { userId: new Types.ObjectId(userId), ...item, direction },
        update: {
          $setOnInsert: {
            userId: new Types.ObjectId(userId),
            ...item,
            direction,
            state: 'new' as const,
            easeFactor: 2.5,
            intervalDays: 0,
            dueAt: new Date(),
          },
        },
        upsert: true,
      },
    })),
  );

  const result = await SrsCard.bulkWrite(ops);
  return result.upsertedCount;
}

/** Nạp nội dung hiển thị cho từng thẻ, gộp truy vấn theo loại để tránh N+1. */
async function hydrateCards(cards: ISrsCard[]) {
  const byType = {
    kana: cards.filter((c) => c.itemType === 'kana').map((c) => c.itemKey),
    kanji: cards.filter((c) => c.itemType === 'kanji').map((c) => c.itemKey),
    vocabulary: cards.filter((c) => c.itemType === 'vocabulary').map((c) => c.itemKey),
    grammar: cards.filter((c) => c.itemType === 'grammar').map((c) => c.itemKey),
  };

  const toObjectIds = (keys: string[]) =>
    keys.filter((k) => Types.ObjectId.isValid(k)).map((k) => new Types.ObjectId(k));

  const [kana, kanji, vocab, grammar] = await Promise.all([
    byType.kana.length
      ? Kana.find({ character: { $in: byType.kana } }).lean()
      : Promise.resolve([]),
    byType.kanji.length
      ? Kanji.find({ character: { $in: byType.kanji } }).lean()
      : Promise.resolve([]),
    byType.vocabulary.length
      ? Vocabulary.find({ _id: { $in: toObjectIds(byType.vocabulary) } }).lean()
      : Promise.resolve([]),
    byType.grammar.length
      ? GrammarPoint.find({ _id: { $in: toObjectIds(byType.grammar) } }).lean()
      : Promise.resolve([]),
  ]);

  const maps = {
    kana: new Map(kana.map((k) => [k.character, k])),
    kanji: new Map(kanji.map((k) => [k.character, k])),
    vocabulary: new Map(vocab.map((v) => [String(v._id), v])),
    grammar: new Map(grammar.map((g) => [String(g._id), g])),
  };

  return cards
    .map((card) => {
      const source = maps[card.itemType].get(card.itemKey) as Record<string, unknown> | undefined;
      if (!source) return null; // item đã bị xoá khỏi kho, bỏ qua thẻ này

      const state: SchedulingState = {
        state: card.state,
        easeFactor: card.easeFactor,
        intervalDays: card.intervalDays,
        repetitions: card.repetitions,
        lapses: card.lapses,
        learningStepIndex: card.learningStepIndex,
        isLeech: card.isLeech,
        dueAt: card.dueAt,
      };

      return {
        cardId: String(card._id),
        itemType: card.itemType,
        itemKey: card.itemKey,
        direction: card.direction,
        state: card.state,
        isOverdue: card.dueAt < new Date(Date.now() - 86_400_000),
        content: buildCardContent(card, source),
        nextIntervals: previewIntervals(state),
      };
    })
    .filter(Boolean);
}

/** Dựng nội dung câu hỏi/đáp án theo loại item và hướng ôn. */
function buildCardContent(card: ISrsCard, source: Record<string, unknown>) {
  switch (card.itemType) {
    case 'kana': {
      const romaji = source.romaji as string;
      const character = source.character as string;
      if (card.direction === 'recognition') {
        return {
          prompt: character,
          promptType: 'character',
          answer: romaji,
          hint: source.mnemonicVi as string,
        };
      }
      if (card.direction === 'recall') {
        return { prompt: romaji, promptType: 'romaji', answer: character };
      }
      return {
        prompt: romaji,
        promptType: 'romaji',
        answer: character,
        strokes: source.strokes,
        strokeCount: source.strokeCount,
        requiresHandwriting: true,
      };
    }
    case 'kanji': {
      const character = source.character as string;
      const meanings = (source.meaningsVi as string[]).join(', ');
      const readings = source.readings as { onyomi: { kana: string }[]; kunyomi: { kana: string }[] };
      const readingText = [
        ...readings.onyomi.map((r) => r.kana),
        ...readings.kunyomi.map((r) => r.kana),
      ].join(' / ');

      if (card.direction === 'recognition') {
        return {
          prompt: character,
          promptType: 'character',
          answer: meanings,
          // Âm Hán-Việt là lợi thế riêng của người Việt, luôn hiện kèm
          extra: { sinoVietnamese: source.sinoVietnamese, readings: readingText },
          hint: source.mnemonicVi as string,
        };
      }
      return { prompt: meanings, promptType: 'meaning', answer: character };
    }
    case 'vocabulary': {
      const word = source.word as string;
      const meanings = (source.meaningsVi as string[]).join(', ');
      if (card.direction === 'recognition') {
        return {
          prompt: word,
          promptType: 'word',
          answer: meanings,
          extra: { reading: source.reading, furigana: source.furiganaSegments },
        };
      }
      return { prompt: meanings, promptType: 'meaning', answer: word };
    }
    default:
      return {
        prompt: source.pattern as string,
        promptType: 'pattern',
        answer: source.meaningVi as string,
        extra: { formation: source.formation, title: source.titleVi },
      };
  }
}

export async function buildQueue(userId: string, limit = 30) {
  const now = new Date();
  const uid = new Types.ObjectId(userId);

  const profile =
    (await LearningProfile.findOne({ userId: uid })) ??
    (await LearningProfile.create({ userId: uid }));

  // Ưu tiên: quá hạn lâu nhất > đang trong bước học > đến hạn hôm nay
  const [overdue, learning, due] = await Promise.all([
    SrsCard.find({ userId: uid, state: 'review', dueAt: { $lt: new Date(now.getTime() - 86_400_000) } })
      .sort({ dueAt: 1 })
      .limit(limit)
      .lean(),
    SrsCard.find({ userId: uid, state: { $in: ['learning', 'relearning'] }, dueAt: { $lte: now } })
      .sort({ dueAt: 1 })
      .limit(limit)
      .lean(),
    SrsCard.find({
      userId: uid,
      state: 'review',
      dueAt: { $gte: new Date(now.getTime() - 86_400_000), $lte: now },
    })
      .sort({ dueAt: 1 })
      .limit(limit)
      .lean(),
  ]);

  let selected = [...overdue, ...learning, ...due].slice(0, limit);

  const backlog = await SrsCard.countDocuments({
    userId: uid,
    state: 'review',
    dueAt: { $lte: now },
  });

  /**
   * Chặn thẻ mới khi tồn đọng cao — đây là cái bẫy giết chết người học trên
   * Anki: học 50 từ mới mỗi ngày, ba tuần sau có 400 thẻ đến hạn/ngày, nản,
   * rồi bỏ. Hệ thống phải chủ động phanh lại dù người học đang hào hứng.
   */
  let newAdded = 0;
  if (backlog < BACKLOG_THRESHOLD && selected.length < limit) {
    const room = Math.min(limit - selected.length, dailyNewLimit(profile.dailyGoalMinutes));
    const fresh = await SrsCard.find({ userId: uid, state: 'new' })
      .sort({ createdAt: 1 })
      .limit(room)
      .lean();
    selected = [...selected, ...fresh];
    newAdded = fresh.length;
  }

  const mixed = interleaveByType(selected as unknown as ISrsCard[]);
  const items = await hydrateCards(mixed);

  return {
    totalDue: backlog,
    newAvailable: newAdded,
    backlogWarning: backlog >= BACKLOG_THRESHOLD,
    backlogMessage:
      backlog >= BACKLOG_THRESHOLD
        ? `Bạn đang có ${backlog} thẻ chờ ôn. Hãy ôn bớt trước khi học thêm từ mới nhé!`
        : null,
    items,
  };
}

export async function reviewCard(
  userId: string,
  cardId: string,
  rating: Rating,
  responseMs = 0,
) {
  const card = await SrsCard.findOne({ _id: cardId, userId: new Types.ObjectId(userId) });
  if (!card) throw AppError.notFound('SRS_CARD_NOT_FOUND', 'Không tìm thấy thẻ ôn tập');

  const before: SchedulingState = {
    state: card.state,
    easeFactor: card.easeFactor,
    intervalDays: card.intervalDays,
    repetitions: card.repetitions,
    lapses: card.lapses,
    learningStepIndex: card.learningStepIndex,
    isLeech: card.isLeech,
    dueAt: card.dueAt,
  };

  const after = schedule(before, rating);

  card.state = after.state;
  card.easeFactor = after.easeFactor;
  card.intervalDays = after.intervalDays;
  card.repetitions = after.repetitions;
  card.lapses = after.lapses;
  card.learningStepIndex = after.learningStepIndex;
  card.isLeech = after.isLeech;
  card.dueAt = after.dueAt;
  card.lastReviewedAt = new Date();

  const total = card.stats.totalReviews + 1;
  card.stats.avgResponseMs = Math.round(
    (card.stats.avgResponseMs * card.stats.totalReviews + responseMs) / total,
  );
  card.stats.totalReviews = total;
  if (rating >= 3) card.stats.correctReviews += 1;
  await card.save();

  await ReviewLog.create({
    userId, cardId: card._id, itemType: card.itemType, itemKey: card.itemKey,
    rating, responseMs,
    intervalBefore: before.intervalDays, intervalAfter: after.intervalDays,
    easeBefore: before.easeFactor, easeAfter: after.easeFactor,
  });

  await LearningProfile.updateOne(
    { userId: new Types.ObjectId(userId) },
    { $inc: { 'totals.reviewsDone': 1 } },
  );

  /**
   * Ghi thêm vào thống kê theo NGÀY, không chỉ tổng luỹ kế.
   *
   * Hai con số này phục vụ hai việc khác nhau: totals.reviewsDone là tổng từ
   * trước tới nay, còn DailyStat.reviewsDone là số của riêng hôm nay — thứ mà
   * trang chính và biểu đồ lịch sử đọc. Thiếu dòng này thì người học ôn cả
   * buổi vẫn thấy "0 lượt ôn hôm nay", và biểu đồ 30 ngày phẳng lì.
   */
  await DailyStat.updateOne(
    { userId: new Types.ObjectId(userId), date: todayKey() },
    { $inc: { reviewsDone: 1 } },
    { upsert: true },
  );

  // Ôn thẻ quá hạn được thưởng nhiều hơn: đó mới là việc dọn nợ thật sự
  const wasOverdue = before.dueAt < new Date(Date.now() - 3 * 86_400_000);
  const xpAmount =
    rating === 1 ? 1 : wasOverdue ? 8 : before.state === 'new' ? 2 : 5;
  const xp = await awardXp(userId, xpAmount, 'srs_review', {
    type: 'srs_card',
    id: String(card._id),
  });
  const streak = await updateStreak(userId);
  const unlocked = await evaluateAchievements(userId, [
    'review.count', 'srs.mastered', 'streak.current',
  ]);

  return {
    xpAwarded: xp.awarded,
    leveledUp: xp.leveledUp,
    streak: { current: streak.current, message: streak.message },
    achievementsUnlocked: unlocked,
    card: {
      state: card.state,
      intervalDays: card.intervalDays,
      dueAt: card.dueAt,
      easeFactor: Math.round(card.easeFactor * 100) / 100,
      lapses: card.lapses,
      isLeech: card.isLeech,
    },
    becameLeech: !before.isLeech && after.isLeech,
    // Thông điệp trung tính, không trách móc người học
    leechMessage:
      !before.isLeech && after.isLeech
        ? 'Chữ này khó thật đấy! Mình tạm gác lại và đổi cách học nhé.'
        : null,
    nextIntervals: previewIntervals(after),
  };
}

export async function getStats(userId: string) {
  const uid = new Types.ObjectId(userId);
  const now = new Date();

  const [total, due, newCards, learning, leeches, byState] = await Promise.all([
    SrsCard.countDocuments({ userId: uid }),
    SrsCard.countDocuments({ userId: uid, state: 'review', dueAt: { $lte: now } }),
    SrsCard.countDocuments({ userId: uid, state: 'new' }),
    SrsCard.countDocuments({ userId: uid, state: { $in: ['learning', 'relearning'] } }),
    SrsCard.countDocuments({ userId: uid, isLeech: true }),
    SrsCard.aggregate([
      { $match: { userId: uid } },
      { $group: { _id: '$itemType', count: { $sum: 1 } } },
    ]),
  ]);

  // Dự báo số thẻ đến hạn 7 ngày tới, giúp người học biết đường sắp xếp thời gian
  const forecast = await SrsCard.aggregate([
    {
      $match: {
        userId: uid,
        state: 'review',
        dueAt: { $gt: now, $lte: new Date(now.getTime() + 7 * 86_400_000) },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$dueAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    total,
    due,
    new: newCards,
    learning,
    leeches,
    byType: Object.fromEntries(byState.map((s) => [s._id, s.count])),
    forecast: forecast.map((f) => ({ date: f._id, count: f.count })),
    backlogWarning: due >= BACKLOG_THRESHOLD,
  };
}

export async function listLeeches(userId: string) {
  const cards = await SrsCard.find({ userId: new Types.ObjectId(userId), isLeech: true })
    .sort({ lapses: -1 })
    .lean();
  return hydrateCards(cards as unknown as ISrsCard[]);
}

export async function resetCard(userId: string, cardId: string) {
  const card = await SrsCard.findOneAndUpdate(
    { _id: cardId, userId: new Types.ObjectId(userId) },
    {
      $set: {
        state: 'new', easeFactor: 2.5, intervalDays: 0, repetitions: 0,
        learningStepIndex: 0, isLeech: false, dueAt: new Date(),
      },
    },
    { new: true },
  );
  if (!card) throw AppError.notFound('SRS_CARD_NOT_FOUND', 'Không tìm thấy thẻ ôn tập');
  return card;
}
