import { Schema, model, type Document, type Types } from 'mongoose';
import { JLPT_LEVELS, type JlptLevel } from './Kanji';

/**
 * Ngữ cảnh hiển thị câu tục ngữ. Cố tình KHÔNG hiện ngẫu nhiên — mỗi câu được
 * gắn với một trạng thái cảm xúc cụ thể của người học, đúng theo mục 3 giáo trình.
 */
export const DISPLAY_CONTEXTS = [
  'daily_home', // trang chủ hằng ngày
  'after_fail', // an ủi khi làm bài kém → 笑う門には福来たる
  'before_levelup', // trước khi thi thăng cấp → 井の中の蛙
  'forum', // trang hỏi đáp → 聞くは一時の恥
  'mistake_review', // ôn tập lỗi sai → 温故知新
  'streak_milestone', // mốc chuỗi ngày → 継続は力なり
  'exam_pass', // vừa đỗ đề thi thử
] as const;

export type DisplayContext = (typeof DISPLAY_CONTEXTS)[number];

export interface IKotowaza extends Document<Types.ObjectId> {
  japanese: string;
  reading: string;
  romaji: string;
  literalVi: string;
  meaningVi: string;
  vietnameseEquivalent: string;
  culturalNote: string;
  jlptLevel: JlptLevel;
  displayContexts: DisplayContext[];
  isPublished: boolean;
}

const kotowazaSchema = new Schema<IKotowaza>(
  {
    japanese: { type: String, required: true, unique: true },
    reading: { type: String, required: true },
    romaji: { type: String, default: '' },
    literalVi: { type: String, required: true },
    meaningVi: { type: String, required: true },
    // Câu tục ngữ Việt tương đương — giúp người học neo vào cái đã biết
    vietnameseEquivalent: { type: String, default: '' },
    culturalNote: { type: String, default: '' },
    jlptLevel: { type: String, enum: JLPT_LEVELS, default: 'N3' },
    displayContexts: { type: [String], enum: DISPLAY_CONTEXTS, default: ['daily_home'] },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

kotowazaSchema.index({ displayContexts: 1, isPublished: 1 });

export const Kotowaza = model<IKotowaza>('Kotowaza', kotowazaSchema);
