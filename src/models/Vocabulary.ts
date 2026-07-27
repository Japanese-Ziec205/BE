import { Schema, model, type Document, type Types } from 'mongoose';
import { JLPT_LEVELS, type JlptLevel } from './Kanji';

export const PARTS_OF_SPEECH = [
  'noun',
  'verb_godan',
  'verb_ichidan',
  'verb_irregular',
  'i_adjective',
  'na_adjective',
  'adverb',
  'particle',
  'conjunction',
  'counter',
  'expression',
  'prefix',
  'suffix',
  'pronoun',
  'interjection',
] as const;

export interface IFuriganaSegment {
  text: string;
  reading: string | null;
}

export interface IVocabulary extends Document<Types.ObjectId> {
  word: string;
  reading: string;
  romaji: string;
  furiganaSegments: IFuriganaSegment[];
  meaningsVi: string[];
  meaningsEn: string[];
  partOfSpeech: string[];
  jlptLevel: JlptLevel;
  topics: string[];
  frequencyRank: number | null;
  audioKey: string | null;
  pitchAccent: number | null;
  kanjiCharacters: string[];
  maxKanjiLevel: JlptLevel | null;
  confusableIds: Types.ObjectId[];
  status: string;
  authorId: Types.ObjectId | null;
  reviewerId: Types.ObjectId | null;
  version: number;
  publishedAt: Date | null;
}

export const furiganaSegmentSchema = new Schema<IFuriganaSegment>(
  {
    text: { type: String, required: true },
    reading: { type: String, default: null },
  },
  { _id: false },
);

export const CONTENT_STATUSES = [
  'draft',
  'pending_review',
  'changes_requested',
  'approved',
  'published',
  'archived',
  'rejected',
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

const vocabularySchema = new Schema<IVocabulary>(
  {
    word: { type: String, required: true },
    reading: { type: String, required: true },
    romaji: { type: String, default: '' },
    // Furigana theo từng đoạn để render ruby chính xác:
    // 食べる → [{text:'食',reading:'た'},{text:'べる',reading:null}]
    furiganaSegments: { type: [furiganaSegmentSchema], default: [] },

    meaningsVi: { type: [String], required: true },
    meaningsEn: { type: [String], default: [] },
    partOfSpeech: { type: [String], enum: PARTS_OF_SPEECH, default: [] },

    jlptLevel: { type: String, enum: JLPT_LEVELS, required: true },
    topics: { type: [String], default: [] },
    frequencyRank: { type: Number, default: null },

    audioKey: { type: String, default: null },
    pitchAccent: { type: Number, default: null },

    kanjiCharacters: { type: [String], default: [] },
    maxKanjiLevel: { type: String, enum: JLPT_LEVELS, default: null },

    /**
     * Từ dễ nhầm — dùng làm đáp án nhiễu cho trắc nghiệm.
     * Nhiễu ngẫu nhiên khiến người học loại trừ được ngay mà không cần biết
     * đáp án, làm câu hỏi mất hết giá trị đo lường.
     */
    confusableIds: [{ type: Schema.Types.ObjectId, ref: 'Vocabulary' }],

    status: { type: String, enum: CONTENT_STATUSES, default: 'draft' },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    version: { type: Number, default: 1 },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

vocabularySchema.index({ word: 1, reading: 1 }, { unique: true });
vocabularySchema.index({ jlptLevel: 1, frequencyRank: 1 });
vocabularySchema.index({ topics: 1 });
vocabularySchema.index({ kanjiCharacters: 1 });
vocabularySchema.index({ status: 1 });
vocabularySchema.index({ word: 'text', reading: 'text', meaningsVi: 'text' });

export const Vocabulary = model<IVocabulary>('Vocabulary', vocabularySchema);
