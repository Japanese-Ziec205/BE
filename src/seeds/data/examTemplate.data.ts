// Dữ liệu thuần, không phụ thuộc logger hay model — nhờ vậy test import trực
// tiếp được mà không kéo theo cả tầng cấu hình môi trường.

/**
 * Ma trận đề JLPT N5 — bám sát mục 3.2 tài liệu thiết kế 06.
 *
 * Điểm dễ nhầm nhất: "phần thi" và "nhóm tính điểm" KHÔNG trùng nhau.
 *  - N5 có 3 PHẦN THI (khối thời gian 20 / 40 / 30 phút)
 *  - nhưng chỉ 2 NHÓM TÍNH ĐIỂM (Kiến thức ngôn ngữ & Đọc gộp thành 120 điểm,
 *    Nghe hiểu 60 điểm)
 * Nhầm chỗ này là kết quả đỗ/trượt sai hoàn toàn.
 */
export const N5_TEMPLATE = {
  levelCode: 'N5' as const,
  name: 'Ma trận đề JLPT N5 chuẩn',
  variant: 'standard',
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
        {
          code: 'N5-VOC-M1', nameVi: 'Đọc Kanji', format: 'mcq_single',
          skill: 'language_knowledge', questionCount: 12,
          difficultyTargetMean: -0.4, topics: [],
        },
        {
          code: 'N5-VOC-M2', nameVi: 'Viết Kanji', format: 'mcq_single',
          skill: 'language_knowledge', questionCount: 8,
          difficultyTargetMean: -0.2, topics: [],
        },
        {
          code: 'N5-VOC-M3', nameVi: 'Từ trong ngữ cảnh', format: 'mcq_single',
          skill: 'language_knowledge', questionCount: 10,
          difficultyTargetMean: 0, topics: [],
        },
        {
          code: 'N5-VOC-M4', nameVi: 'Từ đồng nghĩa', format: 'mcq_single',
          skill: 'language_knowledge', questionCount: 2,
          difficultyTargetMean: 0.2, topics: [],
        },
      ],
    },
    {
      code: 'grammar_reading',
      nameVi: 'Ngữ pháp & Đọc hiểu',
      order: 2,
      durationMinutes: 40,
      autoLockOnTimeout: true,
      mondai: [
        {
          code: 'N5-GRA-M1', nameVi: 'Điền trợ từ / mẫu câu', format: 'mcq_single',
          skill: 'language_knowledge', questionCount: 16,
          difficultyTargetMean: 0, topics: [],
        },
        {
          code: 'N5-GRA-M2', nameVi: 'Sắp xếp câu (dấu ★)', format: 'sentence_order',
          skill: 'language_knowledge', questionCount: 5,
          difficultyTargetMean: 0.3, topics: [],
        },
        {
          code: 'N5-GRA-M3', nameVi: 'Điền từ vào đoạn văn', format: 'mcq_single',
          skill: 'reading', questionCount: 5,
          difficultyTargetMean: 0.2, topics: [],
        },
        {
          code: 'N5-READ-M4', nameVi: 'Đoạn văn ngắn (~80 chữ)', format: 'mcq_single',
          skill: 'reading', questionCount: 3,
          difficultyTargetMean: 0.1, topics: [],
        },
        {
          code: 'N5-READ-M5', nameVi: 'Đoạn văn vừa (~250 chữ)', format: 'mcq_single',
          skill: 'reading', questionCount: 2,
          difficultyTargetMean: 0.4, topics: [],
        },
        {
          code: 'N5-READ-M6', nameVi: 'Tìm kiếm thông tin', format: 'mcq_single',
          skill: 'reading', questionCount: 1,
          difficultyTargetMean: 0.3, topics: [],
        },
      ],
    },
    {
      code: 'listening',
      nameVi: 'Nghe hiểu',
      order: 3,
      durationMinutes: 30,
      autoLockOnTimeout: true,
      mondai: [
        {
          code: 'N5-LIS-M1', nameVi: 'Nghe tìm thông tin', format: 'audio_mcq',
          skill: 'listening', questionCount: 7, difficultyTargetMean: 0, topics: [],
        },
        {
          code: 'N5-LIS-M2', nameVi: 'Nghe ý chính', format: 'audio_mcq',
          skill: 'listening', questionCount: 6, difficultyTargetMean: 0.1, topics: [],
        },
        {
          code: 'N5-LIS-M3', nameVi: 'Nghe đối đáp qua tranh', format: 'audio_mcq',
          skill: 'listening', questionCount: 5, difficultyTargetMean: 0, topics: [],
        },
        {
          code: 'N5-LIS-M4', nameVi: 'Phản xạ tức thời', format: 'audio_mcq',
          skill: 'listening', questionCount: 6, difficultyTargetMean: 0.3, topics: [],
        },
      ],
    },
  ],

  scoringSections: [
    {
      code: 'language_reading',
      nameVi: 'Kiến thức ngôn ngữ & Đọc hiểu',
      // Gộp HAI phần thi thành MỘT nhóm điểm — đây là chỗ hay bị làm sai
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
  ],

  antiRepeat: { lookbackAttempts: 3, maxOverlapRatio: 0.2 },
  isActive: true,
};

/** Ngưỡng đỗ và điểm liệt của cả 5 cấp, theo mục 5.1 giáo trình. */
export const PASSING_THRESHOLDS = {
  N5: { total: 80, sections: [{ max: 120, min: 38 }, { max: 60, min: 19 }] },
  N4: { total: 90, sections: [{ max: 120, min: 38 }, { max: 60, min: 19 }] },
  N3: { total: 95, sections: [{ max: 60, min: 19 }, { max: 60, min: 19 }, { max: 60, min: 19 }] },
  N2: { total: 90, sections: [{ max: 60, min: 19 }, { max: 60, min: 19 }, { max: 60, min: 19 }] },
  N1: { total: 100, sections: [{ max: 60, min: 19 }, { max: 60, min: 19 }, { max: 60, min: 19 }] },
};
