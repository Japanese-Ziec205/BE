import { Schema, model, type Document, type Types } from 'mongoose';
import { strokeSchema, type IStroke } from './Kana';

export const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;
export type JlptLevel = (typeof JLPT_LEVELS)[number];

/** Thứ tự từ dễ đến khó — dùng để so sánh "có vượt cấp không" (BR-10). */
export const LEVEL_ORDER: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export function isLevelWithin(itemLevel: string, targetLevel: string): boolean {
  const a = LEVEL_ORDER.indexOf(itemLevel as JlptLevel);
  const b = LEVEL_ORDER.indexOf(targetLevel as JlptLevel);
  if (a === -1 || b === -1) return false;
  return a <= b; // N5 nằm trong phạm vi của N4, N3...
}

export interface IReading {
  kana: string;
  romaji: string;
  okurigana?: string;
  isCommon: boolean;
}

export interface IKanji extends Document<Types.ObjectId> {
  character: string;
  jlptLevel: JlptLevel;
  jouyouGrade: number | null;
  frequencyRank: number | null;
  strokeCount: number;
  meaningsVi: string[];
  meaningsEn: string[];
  sinoVietnamese: string;
  readings: { onyomi: IReading[]; kunyomi: IReading[]; nanori: string[] };
  radicalCharacter: string;
  componentCharacters: string[];
  mnemonicVi: string;
  strokes: IStroke[];
  similarKanji: string[];
  teachOrder: number;
  isPublished: boolean;
}

const readingSchema = new Schema<IReading>(
  {
    kana: { type: String, required: true },
    romaji: { type: String, default: '' },
    okurigana: { type: String, default: '' },
    isCommon: { type: Boolean, default: true },
  },
  { _id: false },
);

const kanjiSchema = new Schema<IKanji>(
  {
    character: { type: String, required: true, unique: true },
    jlptLevel: { type: String, enum: JLPT_LEVELS, required: true },
    jouyouGrade: { type: Number, default: null },
    frequencyRank: { type: Number, default: null },
    strokeCount: { type: Number, required: true },

    meaningsVi: { type: [String], required: true },
    meaningsEn: { type: [String], default: [] },

    /**
     * Âm Hán-Việt — BẮT BUỘC, không được để trống khi publish.
     * Đây là lợi thế riêng của người học Việt Nam: biết 休 = HƯU thì liên hệ
     * ngay "nghỉ hưu", nhớ nhanh hơn nhiều so với học qua tiếng Anh.
     */
    sinoVietnamese: { type: String, required: true },

    readings: {
      onyomi: { type: [readingSchema], default: [] },
      kunyomi: { type: [readingSchema], default: [] },
      nanori: { type: [String], default: [] },
    },

    // Chiết tự: 休 = 亻(người) + 木(cây)
    radicalCharacter: { type: String, default: '' },
    componentCharacters: { type: [String], default: [] },
    mnemonicVi: { type: String, default: '' },

    strokes: { type: [strokeSchema], default: [] },

    // Chữ dễ nhầm: 木/本/未/末, 士/土, 待/持
    similarKanji: { type: [String], default: [] },

    teachOrder: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

kanjiSchema.index({ jlptLevel: 1, teachOrder: 1 });
kanjiSchema.index({ radicalCharacter: 1 });
kanjiSchema.index({ frequencyRank: 1 });

export const Kanji = model<IKanji>('Kanji', kanjiSchema);
