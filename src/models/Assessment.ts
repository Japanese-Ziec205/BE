import { Schema, model, type Document, type Types } from 'mongoose';
import { JLPT_LEVELS, type JlptLevel } from './Kanji';
import { CONTENT_STATUSES, furiganaSegmentSchema, type IFuriganaSegment } from './Vocabulary';

export const QUESTION_FORMATS = [
  'mcq_single',
  'mcq_multiple',
  'sentence_order',
  'fill_blank',
  'matching',
  'typing_kana',
  'handwriting',
  'short_answer',
  'composition',
  'audio_mcq',
  'speaking_repeat',
] as const;
export type QuestionFormat = (typeof QUESTION_FORMATS)[number];

export const SKILLS = [
  'reading',
  'writing',
  'listening',
  'speaking',
  'language_knowledge',
] as const;

export interface IQuestionItem extends Document<Types.ObjectId> {
  skill: string;
  format: QuestionFormat;
  jlptLevel: JlptLevel;
  mondaiCode: string;
  topics: string[];
  stem: string;
  stemFuriganaSegments: IFuriganaSegment[];
  passageId: Types.ObjectId | null;
  options: {
    id: string;
    text: string;
    furiganaSegments: IFuriganaSegment[];
    isCorrect: boolean;
  }[];
  orderConfig: {
    template: string;
    correctSequence: string[];
    starPosition: number;
  } | null;
  acceptedAnswers: string[];
  answerMatchMode: 'exact' | 'normalized';
  compositionConfig: {
    minChars: number;
    maxChars: number;
    requiredGrammarPatterns: string[];
    rubric: { criterion: string; maxPoints: number }[];
  } | null;
  explanationVi: string;
  relatedLessonSlug: string | null;
  irt: { difficulty: number; discrimination: number; guessing: number };
  stats: {
    timesServed: number;
    timesCorrect: number;
    correctRate: number;
    optionDistribution: Record<string, number>;
    flaggedForReview: boolean;
    flagReason: string | null;
  };
  maxKanjiLevel: JlptLevel | null;
  hasFuriganaForAboveLevel: boolean;
  status: string;
  authorId: Types.ObjectId | null;
  reviewerId: Types.ObjectId | null;
  version: number;
  publishedAt: Date | null;
}

const questionSchema = new Schema<IQuestionItem>(
  {
    skill: { type: String, enum: SKILLS, required: true },
    format: { type: String, enum: QUESTION_FORMATS, required: true },
    jlptLevel: { type: String, enum: JLPT_LEVELS, required: true },
    // Ánh xạ vào ma trận đề JLPT: 'N5-VOC-M1' = Mondai 1 phần Từ vựng của N5
    mondaiCode: { type: String, required: true },
    topics: { type: [String], default: [] },

    stem: { type: String, required: true },
    stemFuriganaSegments: { type: [furiganaSegmentSchema], default: [] },
    passageId: { type: Schema.Types.ObjectId, ref: 'Passage', default: null },

    options: {
      type: [
        new Schema(
          {
            id: { type: String, required: true },
            text: { type: String, required: true },
            furiganaSegments: { type: [furiganaSegmentSchema], default: [] },
            // ⚠ Trường này LUÔN bị loại bỏ trước khi trả về cho thí sinh
            isCorrect: { type: Boolean, default: false },
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    // Dạng sắp xếp câu có dấu ★ đặc trưng của JLPT
    orderConfig: {
      type: new Schema(
        {
          template: String,
          correctSequence: [String],
          starPosition: Number,
        },
        { _id: false },
      ),
      default: null,
    },

    acceptedAnswers: { type: [String], default: [] },
    answerMatchMode: { type: String, enum: ['exact', 'normalized'], default: 'normalized' },

    compositionConfig: {
      type: new Schema(
        {
          minChars: Number,
          maxChars: Number,
          requiredGrammarPatterns: [String],
          rubric: [new Schema({ criterion: String, maxPoints: Number }, { _id: false })],
        },
        { _id: false },
      ),
      default: null,
    },

    explanationVi: { type: String, default: '' },
    relatedLessonSlug: { type: String, default: null },

    irt: {
      // Độ khó theo thang -3 (rất dễ) đến +3 (rất khó)
      difficulty: { type: Number, default: 0 },
      discrimination: { type: Number, default: 1 },
      // Xác suất đoán mò: 0.25 với trắc nghiệm 4 đáp án
      guessing: { type: Number, default: 0.25 },
    },

    stats: {
      timesServed: { type: Number, default: 0 },
      timesCorrect: { type: Number, default: 0 },
      correctRate: { type: Number, default: 0 },
      optionDistribution: { type: Schema.Types.Mixed, default: {} },
      flaggedForReview: { type: Boolean, default: false },
      flagReason: { type: String, default: null },
    },

    maxKanjiLevel: { type: String, enum: JLPT_LEVELS, default: null },
    hasFuriganaForAboveLevel: { type: Boolean, default: false },

    status: { type: String, enum: CONTENT_STATUSES, default: 'draft' },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    version: { type: Number, default: 1 },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Truy vấn chính của engine sinh đề
questionSchema.index({ jlptLevel: 1, mondaiCode: 1, status: 1 });
questionSchema.index({ skill: 1, jlptLevel: 1, status: 1 });
questionSchema.index({ 'irt.difficulty': 1 });
questionSchema.index({ 'stats.flaggedForReview': 1 });

export const QuestionItem = model<IQuestionItem>('QuestionItem', questionSchema);

// ---------------------------------------------------------------------------
// Bài đọc
// ---------------------------------------------------------------------------

export interface IPassage extends Document<Types.ObjectId> {
  type: string;
  jlptLevel: JlptLevel;
  title: string;
  body: string;
  bodyB: string | null;
  furiganaSegments: IFuriganaSegment[];
  charCount: number;
  maxKanjiLevel: JlptLevel | null;
  topics: string[];
  translationVi: string;
  vocabularyGlossary: { word: string; reading: string; meaningVi: string }[];
  status: string;
  authorId: Types.ObjectId | null;
}

const passageSchema = new Schema<IPassage>(
  {
    type: {
      type: String,
      enum: ['short', 'medium', 'long', 'info_search', 'integrated_comparison'],
      required: true,
    },
    jlptLevel: { type: String, enum: JLPT_LEVELS, required: true },
    title: { type: String, default: '' },
    body: { type: String, required: true },
    // Văn bản thứ hai cho dạng "đọc hiểu tổng hợp" hai quan điểm đối lập (N2+)
    bodyB: { type: String, default: null },
    furiganaSegments: { type: [furiganaSegmentSchema], default: [] },
    charCount: { type: Number, default: 0 },
    maxKanjiLevel: { type: String, enum: JLPT_LEVELS, default: null },
    topics: { type: [String], default: [] },
    // Chỉ hiện sau khi nộp bài
    translationVi: { type: String, default: '' },
    vocabularyGlossary: {
      type: [new Schema({ word: String, reading: String, meaningVi: String }, { _id: false })],
      default: [],
    },
    status: { type: String, enum: CONTENT_STATUSES, default: 'draft' },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

passageSchema.index({ jlptLevel: 1, type: 1, status: 1 });

export const Passage = model<IPassage>('Passage', passageSchema);

// ---------------------------------------------------------------------------
// Ma trận đề thi
// ---------------------------------------------------------------------------

export interface IExamTemplate extends Document<Types.ObjectId> {
  levelCode: JlptLevel;
  name: string;
  variant: string;
  /** Giải thích mức độ đề cho người học, hiện ngay chỗ chọn đề. */
  descriptionVi: string;
  totalDurationMinutes: number;
  totalMaxScore: number;
  totalRequired: number;
  /** Phần THI — khối thời gian, quyết định lúc nào khoá bài. */
  sections: {
    code: string;
    nameVi: string;
    order: number;
    durationMinutes: number;
    autoLockOnTimeout: boolean;
    mondai: {
      code: string;
      nameVi: string;
      format: string;
      skill: string;
      questionCount: number;
      difficultyTargetMean: number;
      topics: string[];
    }[];
  }[];
  /**
   * Nhóm TÍNH ĐIỂM — quyết định điểm liệt. KHÁC với phần thi.
   * N5 có 3 phần thi nhưng chỉ 2 nhóm điểm. Nhầm chỗ này là sai kết quả đỗ/trượt.
   */
  scoringSections: {
    code: string;
    nameVi: string;
    includesSections: string[];
    maxScore: number;
    minPassScore: number;
  }[];
  antiRepeat: { lookbackAttempts: number; maxOverlapRatio: number };
  isActive: boolean;
}

const examTemplateSchema = new Schema<IExamTemplate>(
  {
    levelCode: { type: String, enum: JLPT_LEVELS, required: true },
    name: { type: String, required: true },
    variant: { type: String, default: 'standard' },
    descriptionVi: { type: String, default: '' },
    totalDurationMinutes: { type: Number, required: true },
    totalMaxScore: { type: Number, default: 180 },
    totalRequired: { type: Number, required: true },

    sections: {
      type: [
        new Schema(
          {
            code: String,
            nameVi: String,
            order: Number,
            durationMinutes: Number,
            autoLockOnTimeout: { type: Boolean, default: true },
            mondai: [
              new Schema(
                {
                  code: String,
                  nameVi: String,
                  format: String,
                  skill: String,
                  questionCount: Number,
                  difficultyTargetMean: { type: Number, default: 0 },
                  topics: { type: [String], default: [] },
                },
                { _id: false },
              ),
            ],
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    scoringSections: {
      type: [
        new Schema(
          {
            code: String,
            nameVi: String,
            includesSections: [String],
            maxScore: Number,
            minPassScore: Number,
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    antiRepeat: {
      lookbackAttempts: { type: Number, default: 3 },
      maxOverlapRatio: { type: Number, default: 0.2 },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

examTemplateSchema.index({ levelCode: 1, variant: 1, isActive: 1 });

export const ExamTemplate = model<IExamTemplate>('ExamTemplate', examTemplateSchema);

// ---------------------------------------------------------------------------
// Lượt làm bài
// ---------------------------------------------------------------------------

export interface IExamAttempt extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  templateId: Types.ObjectId;
  levelCode: JlptLevel;
  code: string;
  startedAt: Date;
  submittedAt: Date | null;
  status: 'in_progress' | 'submitted' | 'graded';
  currentSectionCode: string | null;
  sections: {
    code: string;
    nameVi: string;
    durationMinutes: number;
    startedAt: Date | null;
    endedAt: Date | null;
    lockedByTimeout: boolean;
    questions: {
      questionItemId: Types.ObjectId;
      mondaiCode: string;
      order: number;
      /** Bản sao bất biến — nội dung gốc có thể bị sửa sau này. */
      /**
       * Bản chụp BẤT BIẾN của câu hỏi tại thời điểm sinh đề.
       *
       * Phải TỰ CHỨA mọi thứ cần để làm và chấm lại bài: kể cả nội dung đoạn
       * văn đọc hiểu. Nếu chỉ lưu tham chiếu thì sửa đoạn văn gốc sẽ làm đổi
       * nghĩa những bài thi đã nộp từ trước.
       */
      snapshot: {
        stem: string;
        format: string;
        options: { id: string; text: string }[];
        correctOptionIds: string[];
        acceptedAnswers: string[];
        explanationVi: string;
        passage: { title: string; body: string } | null;
        orderConfig: { correctSequence: string[]; starPosition: number } | null;
      };
      userAnswer: unknown;
      isCorrect: boolean | null;
      flaggedByUser: boolean;
      changedAnswerCount: number;
    }[];
  }[];
  result: unknown;
}

const attemptSchema = new Schema<IExamAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'ExamTemplate', required: true },
    levelCode: { type: String, enum: JLPT_LEVELS, required: true },
    code: { type: String, required: true },

    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'graded'],
      default: 'in_progress',
    },
    currentSectionCode: { type: String, default: null },

    // Kiểu Mixed cho cả mảng: cấu trúc phần thi lồng nhiều tầng và phải giữ
    // nguyên bản sao bất biến, khai báo schema chặt ở đây chỉ gây vướng mà
    // không thêm bảo đảm nào — kiểu đã được ràng buộc ở tầng TypeScript.
    sections: { type: Schema.Types.Mixed, default: () => [] },
    result: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

attemptSchema.index({ userId: 1, createdAt: -1 });
attemptSchema.index({ userId: 1, levelCode: 1, status: 1 });

export const ExamAttempt = model<IExamAttempt>('ExamAttempt', attemptSchema);
