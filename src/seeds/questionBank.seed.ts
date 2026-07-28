import { Types } from 'mongoose';
import { logger } from '../config/logger';
import { QuestionItem, Passage } from '../models/Assessment';
import { VOCABULARY_N5_SAMPLE } from './data/misc.data';
import { VOCABULARY_N5_EXTRA, type VocabEntry } from './data/vocabularyN5.data';
import {
  HANDWRITTEN_QUESTIONS,
  PASSAGES,
  type SeedQuestion,
} from './data/questionBank.data';

/**
 * Bộ sinh số giả lập có hạt cố định.
 *
 * Dùng thay cho Math.random để mỗi lần chạy seed cho ra đúng một bộ câu hỏi.
 * Nếu để ngẫu nhiên thật thì mỗi lần seed lại sinh phương án nhiễu khác nhau,
 * và không ai tái hiện được một câu hỏi bị báo lỗi.
 */
function makeRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const OPTION_IDS = ['a', 'b', 'c', 'd'];
const hasKanji = (word: string) => /[一-龯]/.test(word);

/**
 * Sinh câu hỏi đọc/viết Kanji từ chính kho từ vựng.
 *
 * Vì cả đáp án lẫn phương án nhiễu đều lấy từ dữ liệu đã được kiểm duyệt, câu
 * hỏi không thể mâu thuẫn với kho từ — khác hẳn việc gõ tay từng câu rồi sai
 * cách đọc mà không ai phát hiện.
 *
 * Phương án nhiễu chọn từ các từ có ĐỘ DÀI CÁCH ĐỌC TƯƠNG ĐƯƠNG. Nhiễu quá lệch
 * (đáp án 6 âm tiết, nhiễu 2 âm tiết) thì thí sinh loại trừ được ngay mà không
 * cần biết nghĩa, câu hỏi mất tác dụng đo lường.
 */
function generateVocabularyQuestions(vocab: VocabEntry[]): SeedQuestion[] {
  const rng = makeRng(20260729);
  const withKanji = vocab.filter((v) => hasKanji(v.word));
  const questions: SeedQuestion[] = [];

  const pickDistractors = (
    correct: VocabEntry,
    field: 'reading' | 'word',
    count: number,
  ): string[] => {
    const target = correct[field].length;
    const candidates = withKanji
      .filter((v) => v.word !== correct.word && v[field] !== correct[field])
      .map((v) => ({ v, gap: Math.abs(v[field].length - target) }))
      .sort((a, b) => a.gap - b.gap)
      // Lấy rộng hơn số cần rồi bốc ngẫu nhiên, tránh mọi câu đều dùng đúng
      // một nhóm từ có độ dài giống nhau
      .slice(0, 20)
      .map((x) => x.v[field]);

    return shuffle([...new Set(candidates)], rng).slice(0, count);
  };

  for (const entry of withKanji) {
    // --- Mondai 1: nhìn Kanji, chọn cách đọc ---
    const readingDistractors = pickDistractors(entry, 'reading', 3);
    if (readingDistractors.length === 3) {
      questions.push({
        mondaiCode: 'N5-VOC-M1',
        skill: 'language_knowledge',
        format: 'mcq_single',
        stem: `${entry.word}\nの　よみかたは　どれですか。`,
        options: [entry.reading, ...readingDistractors],
        correct: 0,
        explanationVi: `${entry.word} đọc là「${entry.reading}」, nghĩa là ${entry.meaningsVi.join(', ')}.`,
        // Từ càng dài càng khó nhớ cách đọc
        difficulty: Math.min(0.8, -0.6 + entry.reading.length * 0.12),
      });
    }

    // --- Mondai 2: nghe cách đọc, chọn Kanji ---
    const wordDistractors = pickDistractors(entry, 'word', 3);
    if (wordDistractors.length === 3) {
      questions.push({
        mondaiCode: 'N5-VOC-M2',
        skill: 'language_knowledge',
        format: 'mcq_single',
        stem: `${entry.reading}\nを　かんじで　かくと　どれですか。`,
        options: [entry.word, ...wordDistractors],
        correct: 0,
        explanationVi: `「${entry.reading}」viết bằng Kanji là ${entry.word} (${entry.meaningsVi.join(', ')}).`,
        difficulty: Math.min(0.9, -0.4 + entry.word.length * 0.18),
      });
    }
  }

  return questions;
}

/**
 * Xáo trộn vị trí đáp án đúng.
 *
 * Dữ liệu nguồn luôn đặt đáp án đúng ở vị trí đầu cho dễ soạn và dễ soát. Nếu
 * giữ nguyên khi lưu thì mọi đáp án đều là phương án A — thí sinh đoán bừa cũng
 * đúng hết. Xáo bằng RNG có hạt cố định để kết quả tái hiện được.
 */
function buildOptions(question: SeedQuestion, rng: () => number) {
  const options = question.options ?? [];
  const correctText = options[question.correct ?? 0];
  return shuffle(options, rng).map((text, i) => ({
    id: OPTION_IDS[i],
    text,
    furiganaSegments: [],
    isCorrect: text === correctText,
  }));
}

export async function seedQuestionBank(): Promise<number> {
  // --- Đoạn văn đọc hiểu ---
  await Passage.bulkWrite(
    PASSAGES.map((p) => ({
      updateOne: {
        filter: { title: p.title, jlptLevel: p.jlptLevel },
        update: {
          $set: {
            type: p.body.length > 200 ? 'medium' : p.body.includes('【') ? 'info_search' : 'short',
            jlptLevel: p.jlptLevel,
            title: p.title,
            body: p.body,
            charCount: p.body.length,
            topics: [],
            status: 'published',
          },
        },
        upsert: true,
      },
    })),
  );

  const passageIds = new Map<string, Types.ObjectId>();
  for (const p of PASSAGES) {
    const doc = await Passage.findOne({ title: p.title, jlptLevel: p.jlptLevel }).select('_id').lean();
    if (doc) passageIds.set(p.key, doc._id);
  }

  // --- Câu hỏi ---
  const generated = generateVocabularyQuestions([
    ...VOCABULARY_N5_SAMPLE,
    ...VOCABULARY_N5_EXTRA,
  ]);
  const all = [...generated, ...HANDWRITTEN_QUESTIONS];
  const rng = makeRng(773311);

  await QuestionItem.bulkWrite(
    all.map((q) => ({
      updateOne: {
        // stem + mondaiCode đủ để nhận diện: cùng một câu hỏi trong cùng một
        // mondai thì không thể có hai bản khác nhau
        filter: { stem: q.stem, mondaiCode: q.mondaiCode },
        update: {
          $set: {
            skill: q.skill,
            format: q.format,
            jlptLevel: 'N5',
            mondaiCode: q.mondaiCode,
            topics: [],
            stem: q.stem,
            passageId: q.passageKey ? passageIds.get(q.passageKey) ?? null : null,
            options: q.format === 'sentence_order' ? [] : buildOptions(q, rng),
            orderConfig:
              q.format === 'sentence_order' && q.sequence
                ? {
                    template: q.stem,
                    correctSequence: q.sequence,
                    starPosition: q.starPosition ?? 0,
                  }
                : null,
            acceptedAnswers: [],
            explanationVi: q.explanationVi,
            irt: { difficulty: q.difficulty, discrimination: 1, guessing: 0.25 },
            status: 'published',
            publishedAt: new Date(),
            version: 1,
          },
        },
        upsert: true,
      },
    })),
  );

  const byMondai = await QuestionItem.aggregate([
    { $match: { status: 'published', jlptLevel: 'N5' } },
    { $group: { _id: '$mondaiCode', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  logger.info(`   Đoạn văn đọc hiểu: ${PASSAGES.length}`);
  logger.info(`   Câu hỏi: ${all.length} (${generated.length} sinh tự động, ${HANDWRITTEN_QUESTIONS.length} soạn tay)`);
  for (const m of byMondai) {
    logger.info(`     ${m._id}: ${m.count} câu`);
  }

  return all.length;
}
