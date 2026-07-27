import { Schema, model, type Document, type Types } from 'mongoose';

export type KanaScript = 'hiragana' | 'katakana';
export type KanaGroup = 'gojuon' | 'dakuten' | 'handakuten' | 'yoon' | 'special';

export interface IStroke {
  order: number;
  path: string;
  direction: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
}

export interface IKana extends Document<Types.ObjectId> {
  script: KanaScript;
  group: KanaGroup;
  row: string;
  column: string;
  order: number;
  character: string;
  romaji: string;
  romajiAlt: string[];
  strokeCount: number;
  strokes: IStroke[];
  audioKey: string | null;
  mnemonicVi: string;
  similarTo: string[];
  exampleWords: { word: string; reading: string; meaningVi: string }[];
  composedOf: string[];
  baseCharacter: string | null;
  teachOrder: number;
  isPublished: boolean;
}

export const strokeSchema = new Schema<IStroke>(
  {
    order: { type: Number, required: true },
    // Dữ liệu vector, KHÔNG lưu ảnh: cho phép hoạt hình thứ tự nét, so khớp
    // nét viết tay của học viên, và nhẹ hơn ảnh hàng trăm lần.
    path: { type: String, required: true },
    direction: { type: String, default: '' },
    startPoint: { x: { type: Number, default: 0 }, y: { type: Number, default: 0 } },
    endPoint: { x: { type: Number, default: 0 }, y: { type: Number, default: 0 } },
  },
  { _id: false },
);

const kanaSchema = new Schema<IKana>(
  {
    script: { type: String, enum: ['hiragana', 'katakana'], required: true },
    group: {
      type: String,
      enum: ['gojuon', 'dakuten', 'handakuten', 'yoon', 'special'],
      required: true,
    },
    row: { type: String, required: true },
    column: { type: String, default: '' },
    order: { type: Number, required: true },

    character: { type: String, required: true },
    romaji: { type: String, required: true },
    // Chấp nhận nhiều cách phiên âm: し = shi hoặc si, つ = tsu hoặc tu
    romajiAlt: { type: [String], default: [] },

    strokeCount: { type: Number, default: 0 },
    strokes: { type: [strokeSchema], default: [] },

    audioKey: { type: String, default: null },
    mnemonicVi: { type: String, default: '' },

    // Ký tự dễ nhầm — hệ thống chủ động đưa cả cặp vào cùng câu hỏi phân biệt
    // thay vì né tránh (シ↔ツ, ソ↔ン, あ↔お)
    similarTo: { type: [String], default: [] },

    exampleWords: {
      type: [
        new Schema(
          { word: String, reading: String, meaningVi: String },
          { _id: false },
        ),
      ],
      default: [],
    },

    composedOf: { type: [String], default: [] }, // với âm ghép: ['き','ゃ']
    baseCharacter: { type: String, default: null }, // với âm đục: が → か

    // Khác `order`: thứ tự bảng là あいうえお, nhưng thứ tự DẠY phải tách
    // các cặp dễ nhầm ra xa nhau vì lý do sư phạm.
    teachOrder: { type: Number, default: 0 },

    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

kanaSchema.index({ character: 1 }, { unique: true });
kanaSchema.index({ script: 1, group: 1, order: 1 });
kanaSchema.index({ teachOrder: 1 });

export const Kana = model<IKana>('Kana', kanaSchema);
