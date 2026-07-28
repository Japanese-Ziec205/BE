/**
 * Ma trận đề JLPT đầy đủ 5 cấp độ, dựng theo tài liệu
 * "Tổng Hợp Ôn Thi JLPT (N5–N1)" trong thư mục Document.
 *
 * ---------------------------------------------------------------------------
 * VÌ SAO KHÔNG CÓ 20 FILE ĐỀ VIẾT SẴN CHO MỖI CẤP
 * ---------------------------------------------------------------------------
 * Tài liệu gốc gọi thứ nó cung cấp là "Matrix Blueprints" — bản thiết kế ma
 * trận, chứ không phải 100 bộ đề có sẵn câu hỏi. Đó cũng là cách kỳ thi thật
 * vận hành: mỗi kỳ là một lần rút câu hỏi mới theo đúng một khung cố định.
 *
 * Hệ thống làm y như vậy. Mỗi lần bấm "Thi thử", generateExam() rút câu từ
 * ngân hàng theo ma trận bên dưới, kèm cơ chế chống trùng với 3 lần thi gần
 * nhất (antiRepeat). Người học vì thế có được số đề nhiều hơn 20 rất nhiều,
 * mà không cần ai ngồi gõ tay 100 bộ đề — vốn là cách chắc chắn sinh ra lỗi.
 *
 * ---------------------------------------------------------------------------
 * MỘT ĐIỂM PHẢI NÓI RÕ VỀ SỐ LIỆU GỐC
 * ---------------------------------------------------------------------------
 * Tài liệu tự mâu thuẫn ở vài chỗ: ví dụ phần Từ vựng N4 được ghi là "25 câu"
 * nhưng danh sách chi tiết ngay bên dưới lại cộng ra 35 câu. Ở những chỗ đó,
 * bản này lấy theo DANH SÁCH CHI TIẾT chứ không lấy con số tổng, vì danh sách
 * chi tiết khớp với cấu trúc đề thi thật, còn con số tổng thì không.
 */

export type ExamDifficulty = 'easy' | 'medium' | 'hard';

interface MondaiDef {
  code: string;
  nameVi: string;
  format: 'mcq_single' | 'sentence_order' | 'audio_mcq';
  skill: 'language_knowledge' | 'reading' | 'listening';
  questionCount: number;
  difficultyTargetMean: number;
  topics: string[];
}

interface SectionDef {
  code: string;
  nameVi: string;
  order: number;
  durationMinutes: number;
  autoLockOnTimeout: boolean;
  mondai: MondaiDef[];
}

interface ScoringSectionDef {
  code: string;
  nameVi: string;
  includesSections: string[];
  maxScore: number;
  minPassScore: number;
}

export interface LevelMatrix {
  levelCode: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  name: string;
  totalDurationMinutes: number;
  totalMaxScore: number;
  totalRequired: number;
  sections: SectionDef[];
  scoringSections: ScoringSectionDef[];
}

const m = (
  code: string,
  nameVi: string,
  questionCount: number,
  difficultyTargetMean: number,
  format: MondaiDef['format'] = 'mcq_single',
  skill: MondaiDef['skill'] = 'language_knowledge',
): MondaiDef => ({ code, nameVi, format, skill, questionCount, difficultyTargetMean, topics: [] });

/**
 * Hai nhóm điểm (N5, N4): Kiến thức ngôn ngữ + Đọc gộp thành 120 điểm,
 * Nghe hiểu 60 điểm. Ba nhóm điểm (N3, N2, N1): mỗi nhóm 60 điểm.
 *
 * Đây là chỗ dễ làm sai nhất của cả hệ thống chấm: "phần thi" (khối thời gian)
 * và "nhóm tính điểm" KHÔNG trùng nhau. Nhầm là kết quả đỗ/trượt sai hoàn toàn.
 */
const TWO_GROUP_SCORING: ScoringSectionDef[] = [
  {
    code: 'language_reading',
    nameVi: 'Kiến thức ngôn ngữ & Đọc hiểu',
    includesSections: ['vocabulary', 'grammar_reading'],
    maxScore: 120,
    minPassScore: 38,
  },
  {
    code: 'listening',
    nameVi: 'Nghe hiểu',
    includesSections: ['listening'],
    maxScore: 60,
    minPassScore: 19,
  },
];

const THREE_GROUP_SCORING: ScoringSectionDef[] = [
  {
    code: 'language',
    nameVi: 'Kiến thức ngôn ngữ (Từ vựng · Ngữ pháp)',
    includesSections: ['vocabulary'],
    maxScore: 60,
    minPassScore: 19,
  },
  {
    code: 'reading',
    nameVi: 'Đọc hiểu',
    includesSections: ['grammar_reading'],
    maxScore: 60,
    minPassScore: 19,
  },
  {
    code: 'listening',
    nameVi: 'Nghe hiểu',
    includesSections: ['listening'],
    maxScore: 60,
    minPassScore: 19,
  },
];

// ---------------------------------------------------------------------------
// N5 — 90 phút, đỗ từ 80/180
// ---------------------------------------------------------------------------
const N5: LevelMatrix = {
  levelCode: 'N5',
  name: 'Ma trận đề JLPT N5',
  totalDurationMinutes: 90,
  totalMaxScore: 180,
  totalRequired: 80,
  sections: [
    {
      code: 'vocabulary',
      nameVi: 'Kiến thức ngôn ngữ (Từ vựng)',
      order: 1,
      durationMinutes: 20,
      autoLockOnTimeout: true,
      mondai: [
        m('N5-VOC-M1', 'Đọc Hán tự', 7, -0.4),
        m('N5-VOC-M2', 'Viết Hán tự / Katakana', 5, -0.2),
        m('N5-VOC-M3', 'Từ trong ngữ cảnh', 6, 0),
        m('N5-VOC-M4', 'Từ đồng nghĩa', 3, 0.2),
      ],
    },
    {
      code: 'grammar_reading',
      nameVi: 'Ngữ pháp & Đọc hiểu',
      order: 2,
      durationMinutes: 40,
      autoLockOnTimeout: true,
      mondai: [
        m('N5-GRA-M1', 'Điền trợ từ / mẫu câu', 9, 0),
        m('N5-GRA-M2', 'Sắp xếp câu (dấu ★)', 4, 0.3, 'sentence_order'),
        m('N5-GRA-M3', 'Ngữ pháp trong đoạn văn', 4, 0.2, 'mcq_single', 'reading'),
        m('N5-READ-M4', 'Đoạn văn ngắn (~80 chữ)', 2, 0.1, 'mcq_single', 'reading'),
        m('N5-READ-M5', 'Đoạn văn vừa (~250 chữ)', 2, 0.4, 'mcq_single', 'reading'),
        m('N5-READ-M6', 'Tìm kiếm thông tin', 1, 0.3, 'mcq_single', 'reading'),
      ],
    },
    {
      code: 'listening',
      nameVi: 'Nghe hiểu',
      order: 3,
      durationMinutes: 30,
      autoLockOnTimeout: true,
      mondai: [
        m('N5-LIS-M1', 'Nghe hiểu nhiệm vụ', 7, 0, 'audio_mcq', 'listening'),
        m('N5-LIS-M2', 'Nghe hiểu ý chính', 6, 0.1, 'audio_mcq', 'listening'),
        m('N5-LIS-M3', 'Biểu hiện phát thoại (theo tranh)', 5, 0, 'audio_mcq', 'listening'),
        m('N5-LIS-M4', 'Phản xạ tức thời', 6, 0.3, 'audio_mcq', 'listening'),
      ],
    },
  ],
  scoringSections: TWO_GROUP_SCORING,
};

// ---------------------------------------------------------------------------
// N4 — 115 phút, đỗ từ 90/180
// ---------------------------------------------------------------------------
const N4: LevelMatrix = {
  levelCode: 'N4',
  name: 'Ma trận đề JLPT N4',
  totalDurationMinutes: 115,
  totalMaxScore: 180,
  totalRequired: 90,
  sections: [
    {
      code: 'vocabulary',
      nameVi: 'Kiến thức ngôn ngữ (Từ vựng)',
      order: 1,
      durationMinutes: 25,
      autoLockOnTimeout: true,
      mondai: [
        m('N4-VOC-M1', 'Đọc Hán tự', 9, -0.3),
        m('N4-VOC-M2', 'Viết Hán tự', 6, -0.1),
        m('N4-VOC-M3', 'Từ trong ngữ cảnh', 10, 0.1),
        m('N4-VOC-M4', 'Từ đồng nghĩa', 5, 0.2),
        // Dạng "Cách dùng từ" xuất hiện lần đầu ở N4: biết nghĩa từ điển là
        // chưa đủ, phải đặt được từ vào đúng văn cảnh.
        m('N4-VOC-M5', 'Cách dùng từ', 5, 0.4),
      ],
    },
    {
      code: 'grammar_reading',
      nameVi: 'Ngữ pháp & Đọc hiểu',
      order: 2,
      durationMinutes: 55,
      autoLockOnTimeout: true,
      mondai: [
        m('N4-GRA-M1', 'Chọn dạng ngữ pháp', 15, 0.1),
        m('N4-GRA-M2', 'Thành lập cú pháp (dấu ★)', 5, 0.3, 'sentence_order'),
        m('N4-GRA-M3', 'Ngữ pháp trong đoạn văn', 5, 0.2, 'mcq_single', 'reading'),
        m('N4-READ-M4', 'Đoạn văn ngắn (100–200 chữ)', 4, 0.2, 'mcq_single', 'reading'),
        m('N4-READ-M5', 'Đoạn văn trung bình (~350 chữ)', 4, 0.4, 'mcq_single', 'reading'),
        m('N4-READ-M6', 'Tìm kiếm thông tin', 2, 0.3, 'mcq_single', 'reading'),
      ],
    },
    {
      code: 'listening',
      nameVi: 'Nghe hiểu',
      order: 3,
      durationMinutes: 35,
      autoLockOnTimeout: true,
      mondai: [
        m('N4-LIS-M1', 'Nghe hiểu nhiệm vụ', 8, 0.1, 'audio_mcq', 'listening'),
        m('N4-LIS-M2', 'Nghe hiểu ý chính', 7, 0.2, 'audio_mcq', 'listening'),
        m('N4-LIS-M3', 'Biểu hiện phát thoại', 5, 0.1, 'audio_mcq', 'listening'),
        m('N4-LIS-M4', 'Phản xạ tức thời', 8, 0.4, 'audio_mcq', 'listening'),
      ],
    },
  ],
  scoringSections: TWO_GROUP_SCORING,
};

// ---------------------------------------------------------------------------
// N3 — 140 phút, đỗ từ 95/180. Cấp cuối còn giữ cấu trúc ba phần thi.
// ---------------------------------------------------------------------------
const N3: LevelMatrix = {
  levelCode: 'N3',
  name: 'Ma trận đề JLPT N3',
  totalDurationMinutes: 140,
  totalMaxScore: 180,
  totalRequired: 95,
  sections: [
    {
      code: 'vocabulary',
      nameVi: 'Kiến thức ngôn ngữ (Từ vựng)',
      order: 1,
      durationMinutes: 30,
      autoLockOnTimeout: true,
      mondai: [
        m('N3-VOC-M1', 'Đọc Hán tự', 8, -0.2),
        m('N3-VOC-M2', 'Viết Hán tự', 6, 0),
        m('N3-VOC-M3', 'Từ trong ngữ cảnh', 11, 0.2),
        m('N3-VOC-M4', 'Từ đồng nghĩa', 5, 0.3),
        m('N3-VOC-M5', 'Cách dùng từ', 5, 0.5),
      ],
    },
    {
      code: 'grammar_reading',
      nameVi: 'Ngữ pháp & Đọc hiểu',
      order: 2,
      durationMinutes: 70,
      autoLockOnTimeout: true,
      mondai: [
        m('N3-GRA-M1', 'Chọn dạng ngữ pháp', 13, 0.2),
        m('N3-GRA-M2', 'Sắp xếp trật tự từ', 5, 0.4, 'sentence_order'),
        m('N3-GRA-M3', 'Ngữ pháp mạch văn', 5, 0.3, 'mcq_single', 'reading'),
        m('N3-READ-M4', 'Đoạn văn ngắn', 4, 0.2, 'mcq_single', 'reading'),
        m('N3-READ-M5', 'Đoạn văn trung bình', 6, 0.4, 'mcq_single', 'reading'),
        // Bài đọc đoạn dài xuất hiện lần đầu ở N3 — bước ngoặt về sức bền đọc
        m('N3-READ-M6', 'Đoạn văn dài', 4, 0.6, 'mcq_single', 'reading'),
        m('N3-READ-M7', 'Tìm kiếm thông tin', 2, 0.3, 'mcq_single', 'reading'),
      ],
    },
    {
      code: 'listening',
      nameVi: 'Nghe hiểu',
      order: 3,
      durationMinutes: 40,
      autoLockOnTimeout: true,
      mondai: [
        m('N3-LIS-M1', 'Nghe hiểu nhiệm vụ', 6, 0.2, 'audio_mcq', 'listening'),
        m('N3-LIS-M2', 'Nghe hiểu điểm mấu chốt', 6, 0.3, 'audio_mcq', 'listening'),
        m('N3-LIS-M3', 'Nghe hiểu khái quát', 3, 0.4, 'audio_mcq', 'listening'),
        m('N3-LIS-M4', 'Biểu hiện phát thoại', 4, 0.2, 'audio_mcq', 'listening'),
        m('N3-LIS-M5', 'Phản xạ tức thời', 9, 0.5, 'audio_mcq', 'listening'),
      ],
    },
  ],
  scoringSections: THREE_GROUP_SCORING,
};

// ---------------------------------------------------------------------------
// N2 — 155 phút, đỗ từ 90/180.
// Từ N2 trở lên đề gộp còn HAI phần thi: Từ vựng/Ngữ pháp/Đọc chung một khối
// 105 phút liên tục. Đây là bài kiểm tra sức bền chứ không chỉ kiểm tra kiến thức.
// ---------------------------------------------------------------------------
const N2: LevelMatrix = {
  levelCode: 'N2',
  name: 'Ma trận đề JLPT N2',
  totalDurationMinutes: 155,
  totalMaxScore: 180,
  totalRequired: 90,
  sections: [
    {
      code: 'vocabulary',
      nameVi: 'Kiến thức ngôn ngữ (Từ vựng & Ngữ pháp)',
      order: 1,
      durationMinutes: 40,
      autoLockOnTimeout: false,
      mondai: [
        m('N2-VOC-M1', 'Đọc Hán tự', 5, 0),
        m('N2-VOC-M2', 'Viết Hán tự', 5, 0.1),
        m('N2-VOC-M3', 'Cấu tạo từ', 5, 0.3),
        m('N2-VOC-M4', 'Từ trong ngữ cảnh', 7, 0.3),
        m('N2-VOC-M5', 'Từ đồng nghĩa', 5, 0.4),
        m('N2-VOC-M6', 'Cách dùng từ', 5, 0.6),
        m('N2-GRA-M7', 'Chọn dạng ngữ pháp', 12, 0.4),
        m('N2-GRA-M8', 'Thành lập cú pháp', 5, 0.6, 'sentence_order'),
        m('N2-GRA-M9', 'Ngữ pháp mạch văn', 5, 0.5, 'mcq_single', 'reading'),
      ],
    },
    {
      code: 'grammar_reading',
      nameVi: 'Đọc hiểu',
      order: 2,
      durationMinutes: 65,
      autoLockOnTimeout: false,
      mondai: [
        m('N2-READ-M1', 'Đoạn văn ngắn', 5, 0.4, 'mcq_single', 'reading'),
        m('N2-READ-M2', 'Đoạn văn trung bình', 9, 0.5, 'mcq_single', 'reading'),
        m('N2-READ-M3', 'Đoạn văn dài', 4, 0.7, 'mcq_single', 'reading'),
        // Đọc hiểu tổng hợp: hai đoạn văn ĐỐI LẬP quan điểm, phải so sánh
        m('N2-READ-M4', 'Đọc hiểu tổng hợp (so sánh)', 2, 0.8, 'mcq_single', 'reading'),
        m('N2-READ-M5', 'Đọc hiểu chủ đề', 3, 0.8, 'mcq_single', 'reading'),
        m('N2-READ-M6', 'Tìm kiếm thông tin', 2, 0.5, 'mcq_single', 'reading'),
      ],
    },
    {
      code: 'listening',
      nameVi: 'Nghe hiểu',
      order: 3,
      durationMinutes: 50,
      autoLockOnTimeout: true,
      mondai: [
        m('N2-LIS-M1', 'Nghe hiểu nhiệm vụ', 5, 0.4, 'audio_mcq', 'listening'),
        m('N2-LIS-M2', 'Nghe hiểu điểm mấu chốt', 6, 0.5, 'audio_mcq', 'listening'),
        m('N2-LIS-M3', 'Nghe hiểu khái quát', 5, 0.6, 'audio_mcq', 'listening'),
        m('N2-LIS-M4', 'Phản xạ tức thời', 12, 0.5, 'audio_mcq', 'listening'),
        m('N2-LIS-M5', 'Nghe hiểu tổng hợp', 4, 0.8, 'audio_mcq', 'listening'),
      ],
    },
  ],
  scoringSections: THREE_GROUP_SCORING,
};

// ---------------------------------------------------------------------------
// N1 — 165 phút, đỗ từ 100/180.
// Phần Nghe hiểu đã được rút từ 60 xuống 55 phút kể từ kỳ thi tháng 12/2022.
// ---------------------------------------------------------------------------
const N1: LevelMatrix = {
  levelCode: 'N1',
  name: 'Ma trận đề JLPT N1',
  totalDurationMinutes: 165,
  totalMaxScore: 180,
  totalRequired: 100,
  sections: [
    {
      code: 'vocabulary',
      nameVi: 'Kiến thức ngôn ngữ (Từ vựng & Ngữ pháp)',
      order: 1,
      durationMinutes: 35,
      autoLockOnTimeout: false,
      mondai: [
        m('N1-VOC-M1', 'Đọc Hán tự', 6, 0.3),
        m('N1-VOC-M2', 'Từ trong ngữ cảnh', 7, 0.6),
        m('N1-VOC-M3', 'Từ đồng nghĩa', 6, 0.7),
        m('N1-VOC-M4', 'Cách dùng từ', 6, 0.9),
        m('N1-GRA-M5', 'Chọn dạng ngữ pháp', 10, 0.7),
        m('N1-GRA-M6', 'Thành lập cú pháp', 5, 0.9, 'sentence_order'),
        m('N1-GRA-M7', 'Ngữ pháp mạch văn', 5, 0.8, 'mcq_single', 'reading'),
      ],
    },
    {
      code: 'grammar_reading',
      nameVi: 'Đọc hiểu',
      order: 2,
      durationMinutes: 75,
      autoLockOnTimeout: false,
      mondai: [
        m('N1-READ-M1', 'Đoạn văn ngắn', 4, 0.7, 'mcq_single', 'reading'),
        m('N1-READ-M2', 'Đoạn văn trung bình', 9, 0.8, 'mcq_single', 'reading'),
        m('N1-READ-M3', 'Đoạn văn dài', 4, 1.0, 'mcq_single', 'reading'),
        m('N1-READ-M4', 'Đọc hiểu tổng hợp (so sánh)', 3, 1.1, 'mcq_single', 'reading'),
        // Văn bản lý luận triết học / xã hội học — phần khó nhất của cả kỳ thi
        m('N1-READ-M5', 'Đọc hiểu chủ đề (văn bản lý luận)', 4, 1.2, 'mcq_single', 'reading'),
        m('N1-READ-M6', 'Tìm kiếm thông tin', 2, 0.8, 'mcq_single', 'reading'),
      ],
    },
    {
      code: 'listening',
      nameVi: 'Nghe hiểu',
      order: 3,
      durationMinutes: 55,
      autoLockOnTimeout: true,
      mondai: [
        m('N1-LIS-M1', 'Nghe hiểu nhiệm vụ', 6, 0.7, 'audio_mcq', 'listening'),
        m('N1-LIS-M2', 'Nghe hiểu điểm mấu chốt', 7, 0.8, 'audio_mcq', 'listening'),
        m('N1-LIS-M3', 'Nghe hiểu khái quát', 6, 0.9, 'audio_mcq', 'listening'),
        m('N1-LIS-M4', 'Phản xạ tức thời', 14, 0.8, 'audio_mcq', 'listening'),
        m('N1-LIS-M5', 'Nghe hiểu tổng hợp', 4, 1.1, 'audio_mcq', 'listening'),
      ],
    },
  ],
  scoringSections: THREE_GROUP_SCORING,
};

export const LEVEL_MATRICES: LevelMatrix[] = [N5, N4, N3, N2, N1];

// ---------------------------------------------------------------------------
// Ba mức độ đề
// ---------------------------------------------------------------------------

/**
 * Ba mức "dễ – trung bình – khó" KHÔNG đổi cấu trúc đề, chỉ đổi độ khó của
 * những câu được rút ra.
 *
 * Cấu trúc phải giữ nguyên vì đó chính là thứ người học cần làm quen: số câu,
 * áp lực thời gian, thứ tự các dạng bài. Một "đề dễ" mà ít câu hơn đề thật thì
 * luyện xong vào phòng thi vẫn sốc. Cái thay đổi là độ khó trung bình mục tiêu
 * (thang IRT) mà bộ rút câu nhắm tới cho từng nhóm câu hỏi.
 *
 * Mức "dễ" cũng nới thời gian thêm 20%: người mới cần chỗ thở để đọc kỹ, còn
 * việc bị thời gian bóp nghẹt sẽ luyện ở hai mức sau.
 */
export const DIFFICULTY_TIERS: Record<
  ExamDifficulty,
  { nameVi: string; descriptionVi: string; difficultyShift: number; durationScale: number }
> = {
  easy: {
    nameVi: 'Dễ',
    descriptionVi:
      'Câu hỏi nằm ở nửa dễ của cấp độ, thời gian nới thêm 20%. Dùng để làm quen cấu trúc đề.',
    difficultyShift: -0.5,
    durationScale: 1.2,
  },
  medium: {
    nameVi: 'Trung bình',
    descriptionVi: 'Độ khó và thời gian đúng như kỳ thi thật. Đây là mức nên dùng để tự đánh giá.',
    difficultyShift: 0,
    durationScale: 1,
  },
  hard: {
    nameVi: 'Khó',
    descriptionVi:
      'Câu hỏi nằm ở nửa khó của cấp độ, thời gian rút bớt 10%. Luyện cho chắc trước ngày thi.',
    difficultyShift: 0.5,
    durationScale: 0.9,
  },
};

export const DIFFICULTY_ORDER: ExamDifficulty[] = ['easy', 'medium', 'hard'];

/** Số đề khác nhau mà hệ thống hứa hẹn cho mỗi cấp độ × mức độ. */
export const EXAMS_PER_TIER = 20;

/** Dựng một bản ghi ExamTemplate hoàn chỉnh từ ma trận gốc + mức độ. */
export function buildTemplate(matrix: LevelMatrix, difficulty: ExamDifficulty) {
  const tier = DIFFICULTY_TIERS[difficulty];

  return {
    levelCode: matrix.levelCode,
    name: `${matrix.name} — mức ${tier.nameVi}`,
    variant: difficulty,
    descriptionVi: tier.descriptionVi,
    totalDurationMinutes: Math.round(matrix.totalDurationMinutes * tier.durationScale),
    totalMaxScore: matrix.totalMaxScore,
    totalRequired: matrix.totalRequired,
    sections: matrix.sections.map((s) => ({
      ...s,
      durationMinutes: Math.round(s.durationMinutes * tier.durationScale),
      mondai: s.mondai.map((mondai) => ({
        ...mondai,
        difficultyTargetMean: mondai.difficultyTargetMean + tier.difficultyShift,
      })),
    })),
    scoringSections: matrix.scoringSections,
    antiRepeat: { lookbackAttempts: 3, maxOverlapRatio: 0.2 },
    isActive: true,
  };
}

/** Tổng số câu của một ma trận — dùng cho phần tóm tắt hiển thị cho người học. */
export function countQuestions(matrix: LevelMatrix): number {
  return matrix.sections.reduce(
    (sum, s) => sum + s.mondai.reduce((a, mondai) => a + mondai.questionCount, 0),
    0,
  );
}
