import { Schema, model, type Document, type Types } from 'mongoose';

export interface IRadical extends Document<Types.ObjectId> {
  number: number;
  character: string;
  variants: string[];
  strokeCount: number;
  meaningVi: string;
  meaningEn: string;
  nameJa: string;
  nameVi: string;
  mnemonicVi: string;
  position: string;
  isPublished: boolean;
}

const radicalSchema = new Schema<IRadical>(
  {
    // Số thứ tự trong 214 bộ thủ Khang Hy
    number: { type: Number, required: true, unique: true },
    character: { type: String, required: true },
    variants: { type: [String], default: [] },
    strokeCount: { type: Number, required: true },
    meaningVi: { type: String, required: true },
    meaningEn: { type: String, default: '' },
    nameJa: { type: String, default: '' },
    // Tên Hán-Việt, ví dụ 'bộ Nhân đứng' — người Việt nhớ theo cách này nhanh hơn
    nameVi: { type: String, default: '' },
    mnemonicVi: { type: String, default: '' },
    position: {
      type: String,
      enum: ['left', 'right', 'top', 'bottom', 'enclose', 'standalone', 'any'],
      default: 'any',
    },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

radicalSchema.index({ character: 1 });
radicalSchema.index({ strokeCount: 1 });

export const Radical = model<IRadical>('Radical', radicalSchema);
