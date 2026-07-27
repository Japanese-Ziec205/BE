/**
 * Dữ liệu gốc bảng chữ cái tiếng Nhật.
 *
 * Chỉ định nghĩa Hiragana; Katakana được suy ra bằng cách cộng 0x60 vào mã
 * Unicode (Hiragana U+3041–U+3096 ↔ Katakana U+30A1–U+30F6). Cách này tránh
 * gõ tay hai lần và loại hẳn khả năng lệch giữa hai bảng.
 */

export interface KanaRowDef {
  row: string;
  /** Ký tự Hiragana theo cột a, i, u, e, o. `null` = ô trống trong bảng. */
  chars: (string | null)[];
  /** Romaji tương ứng. */
  romaji: (string | null)[];
}

export const COLUMNS = ['a', 'i', 'u', 'e', 'o'] as const;

/** Ngũ thập âm — 46 ký tự cơ bản. */
export const GOJUON: KanaRowDef[] = [
  { row: 'a', chars: ['あ', 'い', 'う', 'え', 'お'], romaji: ['a', 'i', 'u', 'e', 'o'] },
  { row: 'ka', chars: ['か', 'き', 'く', 'け', 'こ'], romaji: ['ka', 'ki', 'ku', 'ke', 'ko'] },
  { row: 'sa', chars: ['さ', 'し', 'す', 'せ', 'そ'], romaji: ['sa', 'shi', 'su', 'se', 'so'] },
  { row: 'ta', chars: ['た', 'ち', 'つ', 'て', 'と'], romaji: ['ta', 'chi', 'tsu', 'te', 'to'] },
  { row: 'na', chars: ['な', 'に', 'ぬ', 'ね', 'の'], romaji: ['na', 'ni', 'nu', 'ne', 'no'] },
  { row: 'ha', chars: ['は', 'ひ', 'ふ', 'へ', 'ほ'], romaji: ['ha', 'hi', 'fu', 'he', 'ho'] },
  { row: 'ma', chars: ['ま', 'み', 'む', 'め', 'も'], romaji: ['ma', 'mi', 'mu', 'me', 'mo'] },
  { row: 'ya', chars: ['や', null, 'ゆ', null, 'よ'], romaji: ['ya', null, 'yu', null, 'yo'] },
  { row: 'ra', chars: ['ら', 'り', 'る', 'れ', 'ろ'], romaji: ['ra', 'ri', 'ru', 're', 'ro'] },
  { row: 'wa', chars: ['わ', null, null, null, 'を'], romaji: ['wa', null, null, null, 'wo'] },
  { row: 'n', chars: ['ん', null, null, null, null], romaji: ['n', null, null, null, null] },
];

/** Âm đục — thêm dấu ゛ (dakuten). 20 ký tự. */
export const DAKUTEN: KanaRowDef[] = [
  { row: 'ga', chars: ['が', 'ぎ', 'ぐ', 'げ', 'ご'], romaji: ['ga', 'gi', 'gu', 'ge', 'go'] },
  { row: 'za', chars: ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'], romaji: ['za', 'ji', 'zu', 'ze', 'zo'] },
  { row: 'da', chars: ['だ', 'ぢ', 'づ', 'で', 'ど'], romaji: ['da', 'ji', 'zu', 'de', 'do'] },
  { row: 'ba', chars: ['ば', 'び', 'ぶ', 'べ', 'ぼ'], romaji: ['ba', 'bi', 'bu', 'be', 'bo'] },
];

/** Âm nửa đục — thêm dấu ゜ (handakuten). 5 ký tự. */
export const HANDAKUTEN: KanaRowDef[] = [
  { row: 'pa', chars: ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'], romaji: ['pa', 'pi', 'pu', 'pe', 'po'] },
];

/** Ký tự gốc của âm đục/nửa đục: が → か. Dùng để dạy quy tắc thay vì học vẹt. */
export const DAKUTEN_BASE: Record<string, string> = {
  が: 'か', ぎ: 'き', ぐ: 'く', げ: 'け', ご: 'こ',
  ざ: 'さ', じ: 'し', ず: 'す', ぜ: 'せ', ぞ: 'そ',
  だ: 'た', ぢ: 'ち', づ: 'つ', で: 'て', ど: 'と',
  ば: 'は', び: 'ひ', ぶ: 'ふ', べ: 'へ', ぼ: 'ほ',
  ぱ: 'は', ぴ: 'ひ', ぷ: 'ふ', ぺ: 'へ', ぽ: 'ほ',
  ゔ: 'う',
};

/** Âm ghép — phụ âm hàng i + や/ゆ/よ nhỏ. 12 nhóm × 3 = 36 ký tự. */
export const YOON_BASES: { base: string; prefix: string }[] = [
  { base: 'き', prefix: 'ky' },
  { base: 'し', prefix: 'sh' },
  { base: 'ち', prefix: 'ch' },
  { base: 'に', prefix: 'ny' },
  { base: 'ひ', prefix: 'hy' },
  { base: 'み', prefix: 'my' },
  { base: 'り', prefix: 'ry' },
  { base: 'ぎ', prefix: 'gy' },
  { base: 'じ', prefix: 'j' },
  { base: 'ぢ', prefix: 'j' },
  { base: 'び', prefix: 'by' },
  { base: 'ぴ', prefix: 'py' },
];

export const YOON_SUFFIXES = [
  { small: 'ゃ', vowel: 'a' },
  { small: 'ゅ', vowel: 'u' },
  { small: 'ょ', vowel: 'o' },
];

/**
 * Romaji của âm ghép không đều: しゃ là "sha" chứ không phải "shya",
 * ちゃ là "cha", じゃ là "ja". Bảng này ghi đè các trường hợp ngoại lệ.
 */
export const YOON_ROMAJI_OVERRIDE: Record<string, string> = {
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo',
  ぢゃ: 'ja', ぢゅ: 'ju', ぢょ: 'jo',
};

/** Cách phiên âm thay thế được chấp nhận khi chấm bài. */
export const ROMAJI_ALT: Record<string, string[]> = {
  し: ['si'], しゃ: ['sya'], しゅ: ['syu'], しょ: ['syo'],
  ち: ['ti'], ちゃ: ['tya'], ちゅ: ['tyu'], ちょ: ['tyo'],
  つ: ['tu'],
  ふ: ['hu'],
  じ: ['zi'], じゃ: ['zya'], じゅ: ['zyu'], じょ: ['zyo'],
  ぢ: ['di'], づ: ['du'],
  を: ['o'],
  ん: ['nn'],
};

/** Số nét của Hiragana. */
export const HIRAGANA_STROKES: Record<string, number> = {
  あ: 3, い: 2, う: 2, え: 2, お: 3,
  か: 3, き: 4, く: 1, け: 3, こ: 2,
  さ: 3, し: 1, す: 2, せ: 3, そ: 1,
  た: 4, ち: 2, つ: 1, て: 1, と: 2,
  な: 4, に: 3, ぬ: 2, ね: 2, の: 1,
  は: 3, ひ: 1, ふ: 4, へ: 1, ほ: 4,
  ま: 3, み: 2, む: 3, め: 2, も: 3,
  や: 3, ゆ: 2, よ: 2,
  ら: 2, り: 2, る: 1, れ: 2, ろ: 1,
  わ: 2, を: 3, ん: 1,
};

/** Số nét của Katakana. */
export const KATAKANA_STROKES: Record<string, number> = {
  ア: 2, イ: 2, ウ: 3, エ: 3, オ: 3,
  カ: 2, キ: 3, ク: 2, ケ: 3, コ: 2,
  サ: 3, シ: 3, ス: 2, セ: 2, ソ: 2,
  タ: 3, チ: 3, ツ: 3, テ: 3, ト: 2,
  ナ: 2, ニ: 2, ヌ: 2, ネ: 4, ノ: 1,
  ハ: 2, ヒ: 2, フ: 1, ヘ: 1, ホ: 4,
  マ: 2, ミ: 3, ム: 2, メ: 2, モ: 3,
  ヤ: 2, ユ: 2, ヨ: 3,
  ラ: 2, リ: 2, ル: 2, レ: 1, ロ: 3,
  ワ: 2, ヲ: 3, ン: 2,
};

/**
 * Ký tự dễ nhầm. Hệ thống CHỦ ĐỘNG đưa cả cặp vào cùng một câu hỏi phân biệt
 * thay vì né tránh — người học sớm muộn cũng gặp, thà gặp trong bài tập.
 */
export const SIMILAR_PAIRS: [string, string][] = [
  ['あ', 'お'], ['い', 'り'], ['く', 'へ'], ['け', 'は'], ['さ', 'ち'],
  ['す', 'む'], ['そ', 'ろ'], ['ぬ', 'め'], ['ね', 'れ'], ['ね', 'わ'],
  ['は', 'ほ'], ['る', 'ろ'], ['つ', 'て'],
  ['シ', 'ツ'], ['ソ', 'ン'], ['ク', 'ワ'], ['ク', 'ケ'], ['ノ', 'ソ'],
  ['ア', 'マ'], ['チ', 'テ'], ['ス', 'ヌ'], ['コ', 'ユ'], ['ラ', 'う'],
  ['ロ', '口'], ['カ', '力'], ['ニ', '二'],
];

/** Mẹo nhớ mặt chữ bằng tiếng Việt. */
export const MNEMONICS: Record<string, string> = {
  あ: 'Chữ あ trông như chữ A viết hoa có thêm đuôi ngoáy phía dưới.',
  い: 'Hai nét đứng song song như hai chữ i nằm cạnh nhau.',
  う: 'Giống chữ U nghiêng, có dấu mũ nhỏ ở trên.',
  え: 'Trông như người đang cúi chào — "ê" một tiếng.',
  お: 'Giống あ nhưng có thêm một dấu chấm bên phải.',
  か: 'Trông như con dao (ka-tana) cắm xuống.',
  き: 'Giống chiếc chìa khoá (key) có hai răng.',
  く: 'Một nét gấp như cái mỏ chim đang kêu "ku".',
  け: 'Giống chữ H nghiêng, có nét đứng bên trái.',
  こ: 'Hai nét ngang như hai sợi dây thừng.',
  さ: 'Giống lưỡi câu cá móc sang trái.',
  し: 'Một nét cong như lưỡi câu — dễ nhớ nhất bảng.',
  す: 'Có vòng xoáy ở dưới như cái lò xo.',
  せ: 'Giống chữ tiếng Anh "se" viết dính vào nhau.',
  そ: 'Đường zigzag như tia chớp.',
  た: 'Ghép từ た = ナ + こ.',
  ち: 'Giống さ nhưng lật ngược lại.',
  つ: 'Một nét cong như miệng cười, cũng như sóng biển.',
  て: 'Giống bàn tay (te nghĩa là "tay") đưa ra.',
  と: 'Giống mũi tên nhỏ đâm vào cây kim.',
  な: 'Có nét ngang, nét đứng và vòng tròn nhỏ ở dưới.',
  に: 'Giống chữ に = イ + 二 (số hai).',
  ぬ: 'Giống め nhưng có thêm vòng xoáy phía sau — nhớ "nu có đuôi".',
  ね: 'Giống れ nhưng có vòng xoáy — con mèo (neko) có đuôi cuộn.',
  の: 'Một vòng xoáy duy nhất, như chữ "no" trong biển cấm.',
  は: 'Ghép từ は = に + nét đứng dài.',
  ひ: 'Giống nụ cười rộng.',
  ふ: 'Trông như núi Phú Sĩ (Fuji) có mây hai bên.',
  へ: 'Một nét như ngọn đồi thoai thoải.',
  ほ: 'Giống は nhưng có thêm một nét ngang trên cùng.',
  ま: 'Giống は nhưng nét dưới cuộn lại.',
  み: 'Có số 3 ẩn trong đó — "mi" gần với "mì" ba sợi.',
  む: 'Giống con bò có sừng, kêu "mu".',
  め: 'Giống ぬ nhưng KHÔNG có đuôi — mắt (me) thì không có đuôi.',
  も: 'Giống lưỡi câu có hai nét ngang.',
  や: 'Giống mũi tên (ya nghĩa là "mũi tên").',
  ゆ: 'Giống con cá đang bơi.',
  よ: 'Giống chữ thập có vòng dưới.',
  ら: 'Giống chữ 5 hoặc người đang ngồi.',
  り: 'Hai nét đứng, nét phải dài hơn.',
  る: 'Giống ろ nhưng có vòng thắt ở cuối.',
  れ: 'Giống ね nhưng đuôi thẳng ra ngoài.',
  ろ: 'Giống る nhưng KHÔNG có vòng thắt — nhớ "ro rỗng".',
  わ: 'Giống ね nhưng đuôi cong vào trong.',
  を: 'Chỉ dùng làm trợ từ chỉ tân ngữ, đọc là "o".',
  ん: 'Một nét như chữ n viết tay nhanh.',
  ア: 'Giống chữ A thiếu nét ngang.',
  イ: 'Giống bộ Nhân đứng 亻.',
  ウ: 'Giống mái nhà có chấm.',
  シ: 'Ba nét, hai chấm nằm NGANG, nét cuối vuốt từ DƯỚI LÊN.',
  ツ: 'Ba nét, hai chấm nằm DỌC, nét cuối vuốt từ TRÊN XUỐNG.',
  ソ: 'Hai nét, nét cuối vuốt từ TRÊN XUỐNG (giống ツ thu nhỏ).',
  ン: 'Hai nét, nét cuối vuốt từ DƯỚI LÊN (giống シ thu nhỏ).',
  フ: 'Một nét gấp, giống núi Phú Sĩ nhìn nghiêng.',
  ヘ: 'Giống hệt へ của Hiragana.',
};

/** Katakana đặc biệt — dùng phiên âm từ ngoại lai. */
export const KATAKANA_SPECIAL: { char: string; romaji: string; note: string }[] = [
  { char: 'ヴ', romaji: 'vu', note: 'Âm V, không có trong tiếng Nhật gốc' },
  { char: 'ファ', romaji: 'fa', note: 'ファミリー (gia đình)' },
  { char: 'フィ', romaji: 'fi', note: 'フィルム (phim)' },
  { char: 'フェ', romaji: 'fe', note: 'カフェ (quán cà phê)' },
  { char: 'フォ', romaji: 'fo', note: 'フォーク (nĩa)' },
  { char: 'ウィ', romaji: 'wi', note: 'ウィスキー (rượu whisky)' },
  { char: 'ウェ', romaji: 'we', note: 'ウェブ (web)' },
  { char: 'ウォ', romaji: 'wo', note: 'ウォーター (nước)' },
  { char: 'ティ', romaji: 'ti', note: 'パーティー (bữa tiệc)' },
  { char: 'ディ', romaji: 'di', note: 'ディズニー (Disney)' },
  { char: 'トゥ', romaji: 'tu', note: 'トゥース (răng)' },
  { char: 'ドゥ', romaji: 'du', note: 'ヒンドゥー (Hindu)' },
  { char: 'チェ', romaji: 'che', note: 'チェック (kiểm tra)' },
  { char: 'シェ', romaji: 'she', note: 'シェフ (đầu bếp)' },
  { char: 'ジェ', romaji: 'je', note: 'ジェット (phản lực)' },
];

/**
 * Thứ tự DẠY, khác thứ tự bảng.
 *
 * Lý do sư phạm: dạy đúng thứ tự あいうえお/かきくけこ thì hợp lý về mặt bảng
 * biểu, nhưng các cặp dễ nhầm sẽ rơi vào cùng một buổi học. Danh sách này tách
 * chúng ra xa nhau — ví dụ không dạy シ ngay cạnh ツ.
 */
export const HIRAGANA_TEACH_ORDER: string[] = [
  'あ', 'い', 'う', 'え', 'お',
  'か', 'き', 'く', 'け', 'こ',
  'さ', 'し', 'す', 'せ', 'そ',
  'た', 'ち', 'つ', 'て', 'と',
  'な', 'に', 'ぬ', 'ね', 'の',
  'は', 'ひ', 'ふ', 'へ', 'ほ',
  'ま', 'み', 'む', 'め', 'も',
  'や', 'ゆ', 'よ',
  'ら', 'り', 'る', 'れ', 'ろ',
  'わ', 'を', 'ん',
];

/** Từ ví dụ cho một số ký tự tiêu biểu (dữ liệu mẫu, sẽ mở rộng qua CMS). */
export const EXAMPLE_WORDS: Record<string, { word: string; reading: string; meaningVi: string }[]> = {
  あ: [{ word: 'あめ', reading: 'あめ', meaningVi: 'mưa / kẹo' }],
  い: [{ word: 'いぬ', reading: 'いぬ', meaningVi: 'con chó' }],
  う: [{ word: 'うみ', reading: 'うみ', meaningVi: 'biển' }],
  え: [{ word: 'えき', reading: 'えき', meaningVi: 'nhà ga' }],
  お: [{ word: 'おかね', reading: 'おかね', meaningVi: 'tiền' }],
  か: [{ word: 'かさ', reading: 'かさ', meaningVi: 'cái ô' }],
  き: [{ word: 'きって', reading: 'きって', meaningVi: 'con tem' }],
  さ: [{ word: 'さかな', reading: 'さかな', meaningVi: 'con cá' }],
  し: [{ word: 'しろ', reading: 'しろ', meaningVi: 'màu trắng' }],
  た: [{ word: 'たまご', reading: 'たまご', meaningVi: 'quả trứng' }],
  な: [{ word: 'なつ', reading: 'なつ', meaningVi: 'mùa hè' }],
  は: [{ word: 'はな', reading: 'はな', meaningVi: 'bông hoa' }],
  ま: [{ word: 'まど', reading: 'まど', meaningVi: 'cửa sổ' }],
  や: [{ word: 'やま', reading: 'やま', meaningVi: 'ngọn núi' }],
  ら: [{ word: 'らいねん', reading: 'らいねん', meaningVi: 'năm sau' }],
  わ: [{ word: 'わたし', reading: 'わたし', meaningVi: 'tôi' }],
};
