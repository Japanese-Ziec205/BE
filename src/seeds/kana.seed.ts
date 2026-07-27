import { Kana } from '../models/Kana';
import { logger } from '../config/logger';
import {
  COLUMNS,
  DAKUTEN,
  DAKUTEN_BASE,
  EXAMPLE_WORDS,
  GOJUON,
  HANDAKUTEN,
  HIRAGANA_STROKES,
  HIRAGANA_TEACH_ORDER,
  KATAKANA_SPECIAL,
  KATAKANA_STROKES,
  MNEMONICS,
  ROMAJI_ALT,
  SIMILAR_PAIRS,
  YOON_BASES,
  YOON_ROMAJI_OVERRIDE,
  YOON_SUFFIXES,
  type KanaRowDef,
} from './data/kana.data';

/** Hiragana U+3041–U+3096 ↔ Katakana U+30A1–U+30F6, lệch đúng 0x60. */
const KATAKANA_OFFSET = 0x60;

export function toKatakana(hiragana: string): string {
  return [...hiragana]
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      return code >= 0x3041 && code <= 0x3096
        ? String.fromCodePoint(code + KATAKANA_OFFSET)
        : ch;
    })
    .join('');
}

interface KanaDoc {
  script: 'hiragana' | 'katakana';
  group: 'gojuon' | 'dakuten' | 'handakuten' | 'yoon' | 'special';
  row: string;
  column: string;
  order: number;
  character: string;
  romaji: string;
  romajiAlt: string[];
  strokeCount: number;
  mnemonicVi: string;
  similarTo: string[];
  exampleWords: { word: string; reading: string; meaningVi: string }[];
  composedOf: string[];
  baseCharacter: string | null;
  teachOrder: number;
  isPublished: boolean;
}

/** Tra bảng cặp dễ nhầm theo cả hai chiều. */
function similarOf(character: string): string[] {
  const out = new Set<string>();
  for (const [a, b] of SIMILAR_PAIRS) {
    if (a === character) out.add(b);
    if (b === character) out.add(a);
  }
  return [...out];
}

function strokeCountOf(character: string, script: 'hiragana' | 'katakana'): number {
  const table = script === 'hiragana' ? HIRAGANA_STROKES : KATAKANA_STROKES;
  if (table[character]) return table[character];

  // Âm đục cộng 2 nét (゛), nửa đục cộng 1 nét (゜)
  const hiraBase = DAKUTEN_BASE[script === 'katakana' ? toHiragana(character) : character];
  if (hiraBase) {
    const baseChar = script === 'katakana' ? toKatakana(hiraBase) : hiraBase;
    const baseCount = table[baseChar] ?? 0;
    const isHandakuten = 'ぱぴぷぺぽパピプペポ'.includes(character);
    return baseCount + (isHandakuten ? 1 : 2);
  }

  // Âm ghép: cộng số nét của hai thành phần
  if (character.length === 2) {
    const [big, small] = [...character];
    return strokeCountOf(big, script) + strokeCountOf(small, script);
  }
  return 0;
}

function toHiragana(katakana: string): string {
  return [...katakana]
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      return code >= 0x30a1 && code <= 0x30f6
        ? String.fromCodePoint(code - KATAKANA_OFFSET)
        : ch;
    })
    .join('');
}

function buildFromRows(
  rows: KanaRowDef[],
  group: 'gojuon' | 'dakuten' | 'handakuten',
  script: 'hiragana' | 'katakana',
  startOrder: number,
): KanaDoc[] {
  const docs: KanaDoc[] = [];
  let order = startOrder;

  for (const def of rows) {
    def.chars.forEach((hiraChar, i) => {
      if (!hiraChar) return; // ô trống trong bảng (や hàng thiếu i và e)
      const character = script === 'hiragana' ? hiraChar : toKatakana(hiraChar);
      const romaji = def.romaji[i]!;
      const baseHira = DAKUTEN_BASE[hiraChar] ?? null;

      docs.push({
        script,
        group,
        row: def.row,
        column: COLUMNS[i],
        order: order++,
        character,
        romaji,
        romajiAlt: ROMAJI_ALT[hiraChar] ?? [],
        strokeCount: strokeCountOf(character, script),
        mnemonicVi: MNEMONICS[character] ?? '',
        similarTo: similarOf(character),
        exampleWords: script === 'hiragana' ? (EXAMPLE_WORDS[character] ?? []) : [],
        composedOf: [],
        baseCharacter: baseHira ? (script === 'hiragana' ? baseHira : toKatakana(baseHira)) : null,
        teachOrder:
          script === 'hiragana'
            ? HIRAGANA_TEACH_ORDER.indexOf(hiraChar) + 1 || order
            : order,
        isPublished: true,
      });
    });
  }
  return docs;
}

function buildYoon(script: 'hiragana' | 'katakana', startOrder: number): KanaDoc[] {
  const docs: KanaDoc[] = [];
  let order = startOrder;

  for (const { base, prefix } of YOON_BASES) {
    for (const { small, vowel } of YOON_SUFFIXES) {
      const hiraChar = base + small;
      const character = script === 'hiragana' ? hiraChar : toKatakana(hiraChar);
      const romaji = YOON_ROMAJI_OVERRIDE[hiraChar] ?? `${prefix}${vowel}`;

      docs.push({
        script,
        group: 'yoon',
        row: prefix,
        column: vowel,
        order: order++,
        character,
        romaji,
        romajiAlt: ROMAJI_ALT[hiraChar] ?? [],
        strokeCount: strokeCountOf(character, script),
        mnemonicVi: `Ghép ${script === 'hiragana' ? base : toKatakana(base)} với ${
          script === 'hiragana' ? small : toKatakana(small)
        } viết nhỏ, đọc liền thành một âm.`,
        similarTo: [],
        exampleWords: [],
        composedOf:
          script === 'hiragana' ? [base, small] : [toKatakana(base), toKatakana(small)],
        baseCharacter: null,
        teachOrder: order + 200,
        isPublished: true,
      });
    }
  }
  return docs;
}

export function buildAllKana(): KanaDoc[] {
  const docs: KanaDoc[] = [];

  for (const script of ['hiragana', 'katakana'] as const) {
    docs.push(...buildFromRows(GOJUON, 'gojuon', script, 1));
    docs.push(...buildFromRows(DAKUTEN, 'dakuten', script, 100));
    docs.push(...buildFromRows(HANDAKUTEN, 'handakuten', script, 200));
    docs.push(...buildYoon(script, 300));
  }

  // ゔ — chỉ Hiragana mới cần khai báo riêng vì không nằm trong bảng gốc
  docs.push({
    script: 'hiragana', group: 'special', row: 'v', column: 'u', order: 400,
    character: 'ゔ', romaji: 'vu', romajiAlt: [],
    strokeCount: HIRAGANA_STROKES['う'] + 2,
    mnemonicVi: 'う thêm dấu đục, dùng cho âm V vay mượn. Rất hiếm gặp ở Hiragana.',
    similarTo: [], exampleWords: [], composedOf: [], baseCharacter: 'う',
    teachOrder: 999, isPublished: true,
  });

  // Katakana đặc biệt cho từ ngoại lai
  KATAKANA_SPECIAL.forEach((item, i) => {
    docs.push({
      script: 'katakana', group: 'special', row: 'special', column: '',
      order: 400 + i,
      character: item.char, romaji: item.romaji, romajiAlt: [],
      strokeCount: strokeCountOf(item.char, 'katakana'),
      mnemonicVi: `Dùng cho từ vay mượn. Ví dụ: ${item.note}`,
      similarTo: [], exampleWords: [],
      composedOf: item.char.length === 2 ? [...item.char] : [],
      baseCharacter: null,
      teachOrder: 900 + i, isPublished: true,
    });
  });

  return docs;
}

export async function seedKana(): Promise<{ hiragana: number; katakana: number }> {
  const docs = buildAllKana();

  // upsert theo ký tự: chạy lại nhiều lần không tạo bản ghi trùng
  await Kana.bulkWrite(
    docs.map((doc) => ({
      updateOne: {
        filter: { character: doc.character },
        update: { $set: doc },
        upsert: true,
      },
    })),
  );

  const hiragana = docs.filter((d) => d.script === 'hiragana').length;
  const katakana = docs.filter((d) => d.script === 'katakana').length;
  logger.info(`   Kana: ${hiragana} Hiragana + ${katakana} Katakana = ${docs.length}`);
  return { hiragana, katakana };
}
