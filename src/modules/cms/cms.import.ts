import { AppError } from '../../utils/AppError';
import { getContentConfig } from './cms.registry';
import { checkKanjiLevel } from './cms.service';
import { buildFuriganaSegments, extractKanji } from '../../utils/japanese';

/**
 * Nhập nội dung hàng loạt từ CSV.
 *
 * Soạn từng mục qua giao diện là quá chậm để đạt mục tiêu hàng nghìn câu hỏi.
 * Cộng tác viên điền file offline (quan trọng với người mạng chậm) rồi tải lên;
 * hệ thống kiểm tra từng dòng và chỉ rõ dòng nào sai vì lý do gì.
 */

export interface ImportRowResult {
  line: number;
  ok: boolean;
  errors: string[];
  warnings: string[];
  data?: Record<string, unknown>;
}

export interface ImportResult {
  total: number;
  valid: number;
  invalid: number;
  inserted: number;
  dryRun: boolean;
  rows: ImportRowResult[];
}

/** Định nghĩa cột cho từng loại nội dung. */
const CSV_SCHEMA: Record<
  string,
  { columns: string[]; required: string[]; example: string[] }
> = {
  vocabulary: {
    columns: ['word', 'reading', 'meaningsVi', 'partOfSpeech', 'jlptLevel', 'topics'],
    required: ['word', 'reading', 'meaningsVi', 'jlptLevel'],
    example: ['食べる', 'たべる', 'ăn;dùng bữa', 'verb_ichidan', 'N5', 'ăn uống'],
  },
  grammar: {
    columns: ['pattern', 'titleVi', 'formation', 'meaningVi', 'jlptLevel', 'category'],
    required: ['pattern', 'titleVi', 'formation', 'meaningVi', 'jlptLevel'],
    example: ['～てください', 'Hãy làm gì đó', 'V-て + ください', 'Yêu cầu lịch sự', 'N5', 'Mẫu câu'],
  },
  sentence: {
    columns: ['japanese', 'reading', 'translationVi', 'jlptLevel', 'source'],
    required: ['japanese', 'translationVi', 'jlptLevel'],
    example: ['日本へ勉強しに行きます。', 'にほんへべんきょうしにいきます', 'Tôi đi Nhật để học.', 'N5', 'Tự soạn'],
  },
  kotowaza: {
    columns: ['japanese', 'reading', 'literalVi', 'meaningVi', 'vietnameseEquivalent', 'displayContexts'],
    required: ['japanese', 'reading', 'literalVi', 'meaningVi'],
    example: ['継続は力なり', 'けいぞくはちからなり', 'Sự liên tục là sức mạnh', 'Kiên trì tạo nên sức mạnh', 'Có công mài sắt có ngày nên kim', 'daily_home'],
  },
};

/** Tách một dòng CSV, hỗ trợ dấu ngoặc kép và dấu phẩy bên trong ô. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'; // dấu ngoặc kép thoát: ""
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
}

export function buildCsvTemplate(type: string): string {
  const schema = CSV_SCHEMA[type];
  if (!schema) {
    throw AppError.badRequest('CONTENT_UNKNOWN_TYPE', `Chưa hỗ trợ nhập hàng loạt cho "${type}"`);
  }
  const header = schema.columns.join(',');
  const example = schema.example.map((v) => (v.includes(',') ? `"${v}"` : v)).join(',');
  return `${header}\n${example}\n`;
}

const VALID_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

export async function importFromCsv(
  type: string,
  csv: string,
  authorId: string,
  dryRun: boolean,
): Promise<ImportResult> {
  const config = getContentConfig(type);
  const schema = CSV_SCHEMA[type];
  if (!config || !schema) {
    throw AppError.badRequest('CONTENT_UNKNOWN_TYPE', `Chưa hỗ trợ nhập hàng loạt cho "${type}"`);
  }

  // Bỏ BOM nếu file xuất từ Excel
  const lines = csv.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    throw AppError.badRequest('IMPORT_EMPTY', 'File chỉ có dòng tiêu đề, không có dữ liệu');
  }

  const header = parseCsvLine(lines[0]);
  const missingColumns = schema.required.filter((c) => !header.includes(c));
  if (missingColumns.length) {
    throw AppError.unprocessable(
      'IMPORT_MISSING_COLUMNS',
      `Thiếu cột bắt buộc: ${missingColumns.join(', ')}`,
      { missingColumns, expected: schema.columns },
    );
  }

  const rows: ImportRowResult[] = [];
  const seenKeys = new Set<string>();

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    const errors: string[] = [];
    const warnings: string[] = [];

    const record: Record<string, string> = {};
    header.forEach((col, idx) => {
      record[col] = values[idx] ?? '';
    });

    for (const col of schema.required) {
      if (!record[col]) errors.push(`Thiếu giá trị bắt buộc ở cột "${col}"`);
    }

    if (record.jlptLevel && !VALID_LEVELS.includes(record.jlptLevel)) {
      errors.push(`Cấp độ "${record.jlptLevel}" không hợp lệ (phải là N5..N1)`);
    }

    // Phát hiện trùng ngay trong chính file
    const key = `${record[schema.required[0]]}|${record.reading ?? ''}`;
    if (seenKeys.has(key)) {
      errors.push('Trùng lặp với một dòng phía trên trong cùng file');
    }
    seenKeys.add(key);

    let data: Record<string, unknown> | undefined;

    if (errors.length === 0) {
      data = buildDocument(type, record);

      // Trùng với dữ liệu đã có trong hệ thống
      const dupFilter = buildDuplicateFilter(type, data);
      if (dupFilter && (await config.model.exists(dupFilter))) {
        errors.push('Đã tồn tại trong hệ thống');
      }

      const check = await checkKanjiLevel(type, data);
      if (!check.passed) {
        errors.push(
          `Chứa Kanji vượt cấp ${data.jlptLevel} mà thiếu Furigana: ${check.aboveLevelKanji.join(', ')}`,
        );
      }
      if (check.maxKanjiLevel) data.maxKanjiLevel = check.maxKanjiLevel;

      if (type === 'vocabulary' && !record.topics) {
        warnings.push('Chưa gán chủ đề — nên bổ sung để hệ thống sinh bài tập theo chủ đề');
      }
    }

    rows.push({ line: i + 1, ok: errors.length === 0, errors, warnings, data });
  }

  const validRows = rows.filter((r) => r.ok);
  let inserted = 0;

  // Chỉ ghi khi TOÀN BỘ file hợp lệ: nhập một nửa rồi báo lỗi khiến cộng tác
  // viên không biết phần nào đã vào, phần nào chưa.
  if (!dryRun && validRows.length === rows.length && validRows.length > 0) {
    await config.model.insertMany(
      validRows.map((r) => ({ ...r.data, authorId, status: 'draft', version: 1 })),
      { ordered: false },
    );
    inserted = validRows.length;
  }

  return {
    total: rows.length,
    valid: validRows.length,
    invalid: rows.length - validRows.length,
    inserted,
    dryRun,
    rows,
  };
}

function buildDocument(type: string, record: Record<string, string>): Record<string, unknown> {
  // Dùng dấu chấm phẩy để tách nhiều giá trị, vì dấu phẩy đã dành cho CSV
  const multi = (v: string) => (v ? v.split(';').map((s) => s.trim()).filter(Boolean) : []);

  switch (type) {
    case 'vocabulary': {
      const chars = extractKanji(record.word);
      return {
        word: record.word,
        reading: record.reading,
        meaningsVi: multi(record.meaningsVi),
        partOfSpeech: multi(record.partOfSpeech),
        jlptLevel: record.jlptLevel,
        topics: multi(record.topics),
        kanjiCharacters: chars,
        furiganaSegments: buildFuriganaSegments(record.word, record.reading),
      };
    }
    case 'grammar':
      return {
        pattern: record.pattern,
        titleVi: record.titleVi,
        formation: record.formation,
        meaningVi: record.meaningVi,
        jlptLevel: record.jlptLevel,
        category: record.category ?? '',
      };
    case 'sentence':
      return {
        japanese: record.japanese,
        translationVi: record.translationVi,
        jlptLevel: record.jlptLevel,
        source: record.source ?? '',
        furiganaSegments: record.reading
          ? buildFuriganaSegments(record.japanese, record.reading)
          : [],
      };
    case 'kotowaza':
      return {
        japanese: record.japanese,
        reading: record.reading,
        literalVi: record.literalVi,
        meaningVi: record.meaningVi,
        vietnameseEquivalent: record.vietnameseEquivalent ?? '',
        displayContexts: multi(record.displayContexts).length
          ? multi(record.displayContexts)
          : ['daily_home'],
      };
    default:
      return { ...record };
  }
}

function buildDuplicateFilter(
  type: string,
  data: Record<string, unknown>,
): Record<string, unknown> | null {
  switch (type) {
    case 'vocabulary':
      return { word: data.word, reading: data.reading };
    case 'grammar':
      return { pattern: data.pattern };
    case 'sentence':
      return { japanese: data.japanese };
    case 'kotowaza':
      return { japanese: data.japanese };
    default:
      return null;
  }
}
