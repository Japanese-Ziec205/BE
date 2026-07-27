import { Schema, model, type Document, type Types } from 'mongoose';
import { JLPT_LEVELS, type JlptLevel } from './Kanji';
import { CONTENT_STATUSES } from './Vocabulary';

export interface IGrammarPoint extends Document<Types.ObjectId> {
  pattern: string;
  patternRomaji: string;
  titleVi: string;
  jlptLevel: JlptLevel;
  formation: string;
  formationDetail: { base: string; rule: string; example: string }[];
  meaningVi: string;
  usageNotes: string;
  nuanceComparison: { comparedWith: string; explanation: string }[];
  commonMistakes: { wrong: string; correct: string; explanation: string }[];
  relatedPatterns: string[];
  category: string;
  teachOrder: number;
  status: string;
  authorId: Types.ObjectId | null;
  reviewerId: Types.ObjectId | null;
  version: number;
  publishedAt: Date | null;
}

const grammarSchema = new Schema<IGrammarPoint>(
  {
    pattern: { type: String, required: true, unique: true },
    patternRomaji: { type: String, default: '' },
    titleVi: { type: String, required: true },
    jlptLevel: { type: String, enum: JLPT_LEVELS, required: true },

    formation: { type: String, required: true },
    formationDetail: {
      type: [new Schema({ base: String, rule: String, example: String }, { _id: false })],
      default: [],
    },

    meaningVi: { type: String, required: true },
    usageNotes: { type: String, default: '' },

    /**
     * So sánh sắc thái với mẫu gần nghĩa — điểm yếu lớn nhất của người học.
     * Ví dụ: と mang tính tất yếu, たら mang tính giả định cụ thể.
     */
    nuanceComparison: {
      type: [new Schema({ comparedWith: String, explanation: String }, { _id: false })],
      default: [],
    },

    /** Câu sai ↔ câu đúng ↔ giải thích. Dạy qua lỗi hiệu quả hơn dạy qua quy tắc. */
    commonMistakes: {
      type: [new Schema({ wrong: String, correct: String, explanation: String }, { _id: false })],
      default: [],
    },

    relatedPatterns: { type: [String], default: [] },
    category: { type: String, default: '' },
    teachOrder: { type: Number, default: 0 },

    status: { type: String, enum: CONTENT_STATUSES, default: 'draft' },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    version: { type: Number, default: 1 },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

grammarSchema.index({ jlptLevel: 1, teachOrder: 1 });
grammarSchema.index({ category: 1 });
grammarSchema.index({ status: 1 });

export const GrammarPoint = model<IGrammarPoint>('GrammarPoint', grammarSchema);
