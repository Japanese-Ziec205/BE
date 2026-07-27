import { LEVEL_ORDER, type JlptLevel } from '../models/Kanji';

const KANJI_RE = /[一-龯㐀-䶿]/g;
const HIRAGANA_RE = /^[぀-ゟ]+$/;
const KATAKANA_RE = /^[゠-ヿ]+$/;

export function isKanji(ch: string): boolean {
  return /[一-龯㐀-䶿]/.test(ch);
}

export function isHiragana(text: string): boolean {
  return HIRAGANA_RE.test(text);
}

export function isKatakana(text: string): boolean {
  return KATAKANA_RE.test(text);
}

/** Lấy danh sách Kanji xuất hiện trong một chuỗi, không trùng lặp. */
export function extractKanji(text: string): string[] {
  return [...new Set(text.match(KANJI_RE) ?? [])];
}

/**
 * Tính cấp độ Kanji CAO NHẤT trong một chuỗi.
 *
 * Dùng cho quy tắc BR-10: không được đưa Kanji vượt cấp vào bài của cấp thấp hơn
 * trừ khi có Furigana. Kanji không có trong từ điển được coi là N1 (khó nhất),
 * vì thà chặn nhầm còn hơn để nội dung quá khó lọt tới người mới học.
 */
export function computeMaxKanjiLevel(
  characters: string[],
  levelMap: Map<string, string>,
): JlptLevel | null {
  if (characters.length === 0) return null;

  let maxIndex = -1;
  for (const ch of characters) {
    const level = levelMap.get(ch);
    const index = level ? LEVEL_ORDER.indexOf(level as JlptLevel) : LEVEL_ORDER.length - 1;
    if (index > maxIndex) maxIndex = index;
  }
  return maxIndex >= 0 ? LEVEL_ORDER[maxIndex] : null;
}

/**
 * Tách từ thành các đoạn furigana để render thẻ ruby.
 *
 * Ví dụ: 食べる + たべる → [{text:'食',reading:'た'},{text:'べる',reading:null}]
 *
 * Thuật toán khớp phần kana ở đuôi và đầu (okurigana) rồi gán phần đọc còn lại
 * cho khối Kanji ở giữa. Cách này xử lý đúng phần lớn trường hợp thực tế; các
 * trường hợp phức tạp (nhiều khối Kanji xen kẽ) sẽ gộp chung một đoạn — chấp
 * nhận được vì người soạn nội dung có thể chỉnh tay trong CMS.
 */
export function buildFuriganaSegments(
  word: string,
  reading: string,
): { text: string; reading: string | null }[] {
  if (!word || !reading) return [{ text: word, reading: null }];

  // Không có Kanji thì không cần furigana
  const kanjiChars = word.match(KANJI_RE);
  if (!kanjiChars) return [{ text: word, reading: null }];

  const chars = [...word];

  // Đếm số kana ở đầu và đuôi trùng khớp giữa word và reading
  let prefixLen = 0;
  while (
    prefixLen < chars.length &&
    !isKanji(chars[prefixLen]) &&
    chars[prefixLen] === reading[prefixLen]
  ) {
    prefixLen += 1;
  }

  let suffixLen = 0;
  while (
    suffixLen < chars.length - prefixLen &&
    !isKanji(chars[chars.length - 1 - suffixLen]) &&
    chars[chars.length - 1 - suffixLen] === reading[reading.length - 1 - suffixLen]
  ) {
    suffixLen += 1;
  }

  const segments: { text: string; reading: string | null }[] = [];

  if (prefixLen > 0) {
    segments.push({ text: chars.slice(0, prefixLen).join(''), reading: null });
  }

  const middleText = chars.slice(prefixLen, chars.length - suffixLen).join('');
  const middleReading = reading.slice(prefixLen, reading.length - suffixLen);
  if (middleText) {
    segments.push({ text: middleText, reading: middleReading || null });
  }

  if (suffixLen > 0) {
    segments.push({ text: chars.slice(chars.length - suffixLen).join(''), reading: null });
  }

  return segments.length > 0 ? segments : [{ text: word, reading }];
}

/** Chuẩn hoá đáp án trước khi so khớp: bỏ khoảng trắng, dấu câu, thống nhất chữ thường. */
export function normalizeAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s　]/g, '')
    .replace(/[。、．，.,!?！？]/g, '');
}

/** Chuyển Katakana sang Hiragana để so khớp linh hoạt khi chấm bài. */
export function katakanaToHiragana(text: string): string {
  return [...text]
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      return code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : ch;
    })
    .join('');
}

/** Đếm ký tự thực (bỏ khoảng trắng) — dùng kiểm tra độ dài bài viết sakubun. */
export function countJapaneseChars(text: string): number {
  return text.replace(/[\s　]/g, '').length;
}
