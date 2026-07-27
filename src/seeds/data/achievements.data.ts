/** Định nghĩa huy hiệu — theo tài liệu thiết kế 07 mục 5.1. */
export const ACHIEVEMENTS = [
  // --- Học tập ---
  { code: 'FIRST_LESSON', nameVi: 'Bước chân đầu tiên', descriptionVi: 'Hoàn thành bài học đầu tiên', tier: 'bronze', category: 'learning', metric: 'lesson.count', threshold: 1, xpReward: 30, order: 1 },
  { code: 'LESSON_10', nameVi: 'Chăm chỉ', descriptionVi: 'Hoàn thành 10 bài học', tier: 'bronze', category: 'learning', metric: 'lesson.count', threshold: 10, xpReward: 80, order: 2 },
  { code: 'LESSON_40', nameVi: 'Trọn bộ N5', descriptionVi: 'Hoàn thành 40 bài học', tier: 'gold', category: 'learning', metric: 'lesson.count', threshold: 40, xpReward: 400, order: 3 },
  { code: 'HIRAGANA_MASTER', nameVi: 'Bậc thầy Hiragana', descriptionVi: 'Thành thạo 46 ký tự Hiragana cơ bản', tier: 'silver', category: 'learning', metric: 'kana.count', threshold: 46, xpReward: 200, order: 10 },
  { code: 'KANA_COMPLETE', nameVi: 'Trọn bộ chữ cái', descriptionVi: 'Thành thạo cả Hiragana và Katakana', tier: 'gold', category: 'learning', metric: 'kana.count', threshold: 92, xpReward: 500, order: 11 },
  { code: 'KANJI_10', nameVi: 'Chạm ngõ Hán tự', descriptionVi: 'Học 10 chữ Kanji', tier: 'bronze', category: 'learning', metric: 'kanji.count', threshold: 10, xpReward: 50, order: 20 },
  { code: 'KANJI_50', nameVi: 'Người sưu tầm Hán tự', descriptionVi: 'Học 50 chữ Kanji', tier: 'silver', category: 'learning', metric: 'kanji.count', threshold: 50, xpReward: 200, order: 21 },
  { code: 'KANJI_100', nameVi: 'Trăm chữ Hán', descriptionVi: 'Học 100 chữ Kanji', tier: 'gold', category: 'learning', metric: 'kanji.count', threshold: 100, xpReward: 400, order: 22 },
  { code: 'VOCAB_100', nameVi: 'Kho từ vựng', descriptionVi: 'Học 100 từ vựng', tier: 'bronze', category: 'learning', metric: 'vocabulary.count', threshold: 100, xpReward: 100, order: 30 },
  { code: 'VOCAB_500', nameVi: 'Vốn từ dày dặn', descriptionVi: 'Học 500 từ vựng', tier: 'gold', category: 'learning', metric: 'vocabulary.count', threshold: 500, xpReward: 500, order: 31 },
  { code: 'GRAMMAR_N5', nameVi: 'Nền móng vững', descriptionVi: 'Học hết ngữ pháp N5', tier: 'gold', category: 'learning', metric: 'grammar.count', threshold: 12, xpReward: 300, order: 40 },

  // --- Chuỗi ngày ---
  { code: 'STREAK_3', nameVi: 'Khởi đầu', descriptionVi: 'Học 3 ngày liên tiếp', tier: 'bronze', category: 'streak', metric: 'streak.current', threshold: 3, xpReward: 30, order: 50 },
  { code: 'STREAK_7', nameVi: 'Một tuần bền bỉ', descriptionVi: 'Học 7 ngày liên tiếp', tier: 'bronze', category: 'streak', metric: 'streak.current', threshold: 7, xpReward: 80, order: 51 },
  { code: 'STREAK_30', nameVi: 'Một tháng kiên trì', descriptionVi: 'Học 30 ngày liên tiếp', tier: 'silver', category: 'streak', metric: 'streak.current', threshold: 30, xpReward: 300, order: 52 },
  { code: 'STREAK_100', nameVi: 'Trăm ngày', descriptionVi: 'Học 100 ngày liên tiếp', tier: 'gold', category: 'streak', metric: 'streak.current', threshold: 100, xpReward: 1000, order: 53 },
  { code: 'STREAK_365', nameVi: 'Trọn một năm 🕊️', descriptionVi: 'Học 365 ngày liên tiếp', tier: 'platinum', category: 'streak', metric: 'streak.current', threshold: 365, xpReward: 3000, order: 54 },

  // --- Ôn tập ---
  { code: 'REVIEW_100', nameVi: 'Ôn tập đều đặn', descriptionVi: 'Ôn 100 lượt thẻ', tier: 'bronze', category: 'skill', metric: 'review.count', threshold: 100, xpReward: 80, order: 60 },
  { code: 'REVIEW_1000', nameVi: 'Nghìn lượt ôn', descriptionVi: 'Ôn 1.000 lượt thẻ', tier: 'silver', category: 'skill', metric: 'review.count', threshold: 1000, xpReward: 300, order: 61 },
  { code: 'MASTERED_50', nameVi: 'Nhớ lâu', descriptionVi: 'Có 50 thẻ đạt mức nhớ lâu (chu kỳ trên 21 ngày)', tier: 'silver', category: 'skill', metric: 'srs.mastered', threshold: 50, xpReward: 250, order: 62 },

  // --- Thi thử ---
  { code: 'FIRST_MOCK', nameVi: 'Lần đầu thử sức', descriptionVi: 'Hoàn thành đề thi thử đầu tiên', tier: 'bronze', category: 'exam', metric: 'exam.count', threshold: 1, xpReward: 100, order: 70 },
  { code: 'MOCK_5', nameVi: 'Luyện thi chăm chỉ', descriptionVi: 'Hoàn thành 5 đề thi thử', tier: 'silver', category: 'exam', metric: 'exam.count', threshold: 5, xpReward: 250, order: 71 },

  // --- Giờ học ---
  { code: 'HOURS_10', nameVi: 'Mười giờ đầu tiên', descriptionVi: 'Tích luỹ 10 giờ học', tier: 'bronze', category: 'skill', metric: 'study.hours', threshold: 10, xpReward: 100, order: 80 },
  { code: 'HOURS_100', nameVi: 'Trăm giờ miệt mài', descriptionVi: 'Tích luỹ 100 giờ học', tier: 'gold', category: 'skill', metric: 'study.hours', threshold: 100, xpReward: 600, order: 81 },
  { code: 'HOURS_250', nameVi: 'Đủ giờ cho N5', descriptionVi: 'Tích luỹ 250 giờ — mốc tối thiểu của cấp N5', tier: 'platinum', category: 'skill', metric: 'study.hours', threshold: 250, xpReward: 1500, order: 82 },
];
