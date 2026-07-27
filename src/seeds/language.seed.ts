import { logger } from '../config/logger';
import { Radical } from '../models/Radical';
import { Kanji } from '../models/Kanji';
import { Vocabulary } from '../models/Vocabulary';
import { GrammarPoint } from '../models/GrammarPoint';
import { Kotowaza } from '../models/Kotowaza';
import { seedKana } from './kana.seed';
import { RADICALS, RADICAL_POSITIONS } from './data/radicals.data';
import { KANJI_N5, SIMILAR_KANJI_GROUPS } from './data/kanjiN5.data';
import { GRAMMAR_N5, KOTOWAZA, VOCABULARY_N5_SAMPLE } from './data/misc.data';
import { seedExamTemplates } from './examTemplate.seed';
import { seedAchievements } from './achievements.seed';
import { buildFuriganaSegments, extractKanji, computeMaxKanjiLevel } from '../utils/japanese';

export async function seedRadicals(): Promise<number> {
  await Radical.bulkWrite(
    RADICALS.map((r) => ({
      updateOne: {
        filter: { number: r.number },
        update: {
          $set: {
            ...r,
            position: RADICAL_POSITIONS[r.character] ?? 'any',
            meaningEn: '',
            nameJa: '',
            mnemonicVi: '',
            isPublished: true,
          },
        },
        upsert: true,
      },
    })),
  );
  logger.info(`   Bộ thủ: ${RADICALS.length}`);
  return RADICALS.length;
}

/** Chuyển 'やす(む)' → { kana: 'やす', okurigana: 'む' }. */
function parseKunyomi(raw: string): { kana: string; okurigana: string } {
  const match = /^(.+?)\((.+?)\)$/.exec(raw);
  if (match) return { kana: match[1], okurigana: match[2] };
  return { kana: raw, okurigana: '' };
}

function similarKanjiOf(character: string): string[] {
  const out = new Set<string>();
  for (const group of SIMILAR_KANJI_GROUPS) {
    if (group.includes(character)) {
      group.forEach((c) => c !== character && out.add(c));
    }
  }
  return [...out];
}

export async function seedKanji(): Promise<number> {
  await Kanji.bulkWrite(
    KANJI_N5.map((k, index) => ({
      updateOne: {
        filter: { character: k.character },
        update: {
          $set: {
            character: k.character,
            jlptLevel: 'N5',
            strokeCount: k.strokeCount,
            meaningsVi: k.meaningsVi,
            meaningsEn: [],
            sinoVietnamese: k.sinoVietnamese,
            readings: {
              onyomi: k.onyomi.map((kana) => ({ kana, romaji: '', isCommon: true })),
              kunyomi: k.kunyomi.map((raw) => {
                const { kana, okurigana } = parseKunyomi(raw);
                return { kana, okurigana, romaji: '', isCommon: true };
              }),
              nanori: [],
            },
            radicalCharacter: k.radicalCharacter,
            componentCharacters: k.componentCharacters,
            mnemonicVi: k.mnemonicVi,
            similarKanji: similarKanjiOf(k.character),
            // Thứ tự dạy theo độ phổ biến, chữ đứng đầu bảng là chữ hay gặp nhất
            teachOrder: index + 1,
            frequencyRank: index + 1,
            isPublished: true,
          },
        },
        upsert: true,
      },
    })),
  );
  logger.info(`   Kanji N5: ${KANJI_N5.length}`);
  return KANJI_N5.length;
}

export async function seedVocabulary(): Promise<number> {
  // Cần bản đồ Kanji → cấp độ để tính maxKanjiLevel
  const kanjiLevels = new Map<string, string>();
  for (const k of await Kanji.find().select('character jlptLevel').lean()) {
    kanjiLevels.set(k.character, k.jlptLevel);
  }

  await Vocabulary.bulkWrite(
    VOCABULARY_N5_SAMPLE.map((v) => {
      const chars = extractKanji(v.word);
      return {
        updateOne: {
          filter: { word: v.word, reading: v.reading },
          update: {
            $set: {
              word: v.word,
              reading: v.reading,
              romaji: '',
              furiganaSegments: buildFuriganaSegments(v.word, v.reading),
              meaningsVi: v.meaningsVi,
              meaningsEn: [],
              partOfSpeech: v.pos,
              jlptLevel: 'N5',
              topics: v.topics,
              kanjiCharacters: chars,
              maxKanjiLevel: computeMaxKanjiLevel(chars, kanjiLevels),
              status: 'published',
              publishedAt: new Date(),
              version: 1,
            },
          },
          upsert: true,
        },
      };
    }),
  );
  logger.info(`   Từ vựng N5 (mẫu): ${VOCABULARY_N5_SAMPLE.length}`);
  return VOCABULARY_N5_SAMPLE.length;
}

export async function seedGrammar(): Promise<number> {
  await GrammarPoint.bulkWrite(
    GRAMMAR_N5.map((g) => ({
      updateOne: {
        filter: { pattern: g.pattern },
        update: {
          $set: {
            ...g,
            jlptLevel: 'N5',
            status: 'published',
            publishedAt: new Date(),
            version: 1,
          },
        },
        upsert: true,
      },
    })),
  );
  logger.info(`   Ngữ pháp N5: ${GRAMMAR_N5.length}`);
  return GRAMMAR_N5.length;
}

export async function seedKotowaza(): Promise<number> {
  await Kotowaza.bulkWrite(
    KOTOWAZA.map((k) => ({
      updateOne: {
        filter: { japanese: k.japanese },
        update: { $set: { ...k, jlptLevel: 'N3', isPublished: true } },
        upsert: true,
      },
    })),
  );
  logger.info(`   Kotowaza: ${KOTOWAZA.length}`);
  return KOTOWAZA.length;
}

export async function seedAllLanguage() {
  logger.info('🌸 Bắt đầu seed kho tài sản ngôn ngữ...');
  const kana = await seedKana();
  const radicals = await seedRadicals();
  const kanji = await seedKanji();
  const vocabulary = await seedVocabulary();
  const grammar = await seedGrammar();
  const kotowaza = await seedKotowaza();
  const examTemplates = await seedExamTemplates();
  const achievements = await seedAchievements();
  logger.info('✅ Seed kho ngôn ngữ hoàn tất');
  return { kana, radicals, kanji, vocabulary, grammar, kotowaza, examTemplates, achievements };
}
