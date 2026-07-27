import { Schema, model, type Document, type Types } from 'mongoose';
import { JLPT_LEVELS, type JlptLevel } from './Kanji';
import { furiganaSegmentSchema, CONTENT_STATUSES, type IFuriganaSegment } from './Vocabulary';

export interface ISentence extends Document<Types.ObjectId> {
  japanese: string;
  furiganaSegments: IFuriganaSegment[];
  romaji: string;
  translationVi: string;
  translationEn: string;
  audioKey: string | null;
  jlptLevel: JlptLevel;
  vocabularyIds: Types.ObjectId[];
  grammarPointIds: Types.ObjectId[];
  maxKanjiLevel: JlptLevel | null;
  source: string;
  status: string;
  authorId: Types.ObjectId | null;
}

const sentenceSchema = new Schema<ISentence>(
  {
    japanese: { type: String, required: true },
    furiganaSegments: { type: [furiganaSegmentSchema], default: [] },
    romaji: { type: String, default: '' },
    translationVi: { type: String, required: true },
    translationEn: { type: String, default: '' },
    audioKey: { type: String, default: null },
    jlptLevel: { type: String, enum: JLPT_LEVELS, required: true },
    vocabularyIds: [{ type: Schema.Types.ObjectId, ref: 'Vocabulary' }],
    grammarPointIds: [{ type: Schema.Types.ObjectId, ref: 'GrammarPoint' }],
    // Cấp độ Kanji cao nhất xuất hiện trong câu — dùng cho kiểm soát vượt cấp
    maxKanjiLevel: { type: String, enum: JLPT_LEVELS, default: null },
    source: { type: String, default: '' },
    status: { type: String, enum: CONTENT_STATUSES, default: 'draft' },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

sentenceSchema.index({ jlptLevel: 1 });
sentenceSchema.index({ vocabularyIds: 1 });
sentenceSchema.index({ grammarPointIds: 1 });
sentenceSchema.index({ status: 1 });

export const Sentence = model<ISentence>('Sentence', sentenceSchema);
