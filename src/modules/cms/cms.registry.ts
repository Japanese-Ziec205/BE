import type { Model } from 'mongoose';
import { Vocabulary } from '../../models/Vocabulary';
import { GrammarPoint } from '../../models/GrammarPoint';
import { Sentence } from '../../models/Sentence';
import { Kanji } from '../../models/Kanji';
import { Kana } from '../../models/Kana';
import { Kotowaza } from '../../models/Kotowaza';
import type { ContentType } from '../../models/ContentRevision';

/**
 * Đăng ký các loại nội dung đi qua quy trình duyệt.
 *
 * Dùng một registry chung thay vì viết CRUD riêng cho từng loại: 9 loại nội dung
 * × 8 thao tác = 72 handler gần như giống hệt nhau. Cách này giữ workflow duyệt
 * nhất quán tuyệt đối — thêm loại mới chỉ cần thêm một dòng vào bảng.
 */
export interface ContentTypeConfig {
  model: Model<any>;
  /** Trường dùng để hiển thị trong danh sách và tìm kiếm. */
  labelField: string;
  searchFields: string[];
  /** Có đi qua quy trình duyệt hay không. Kana/Radical là dữ liệu hệ thống, không duyệt. */
  hasWorkflow: boolean;
  /** Các trường chứa tiếng Nhật, dùng để tự tính maxKanjiLevel (BR-10). */
  japaneseFields: string[];
}

export const CONTENT_REGISTRY: Partial<Record<ContentType, ContentTypeConfig>> = {
  vocabulary: {
    model: Vocabulary,
    labelField: 'word',
    searchFields: ['word', 'reading', 'meaningsVi'],
    hasWorkflow: true,
    japaneseFields: ['word'],
  },
  grammar: {
    model: GrammarPoint,
    labelField: 'pattern',
    searchFields: ['pattern', 'titleVi', 'meaningVi'],
    hasWorkflow: true,
    japaneseFields: ['pattern', 'formation'],
  },
  sentence: {
    model: Sentence,
    labelField: 'japanese',
    searchFields: ['japanese', 'translationVi'],
    hasWorkflow: true,
    japaneseFields: ['japanese'],
  },
  kanji: {
    model: Kanji,
    labelField: 'character',
    searchFields: ['character', 'sinoVietnamese', 'meaningsVi'],
    hasWorkflow: false,
    japaneseFields: [],
  },
  kana: {
    model: Kana,
    labelField: 'character',
    searchFields: ['character', 'romaji'],
    hasWorkflow: false,
    japaneseFields: [],
  },
  kotowaza: {
    model: Kotowaza,
    labelField: 'japanese',
    searchFields: ['japanese', 'meaningVi', 'vietnameseEquivalent'],
    hasWorkflow: false,
    japaneseFields: ['japanese'],
  },
};

export function getContentConfig(type: string): ContentTypeConfig | null {
  return CONTENT_REGISTRY[type as ContentType] ?? null;
}
