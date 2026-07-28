/**
 * Ngân hàng câu hỏi N5 — phần soạn tay.
 *
 * Chia làm hai nguồn:
 *  - Câu hỏi đọc/viết Kanji được SINH TỰ ĐỘNG từ kho từ vựng (xem
 *    questionBank.seed.ts). Đáp án lấy thẳng từ cặp (word, reading) nên không
 *    thể sai lệch so với dữ liệu gốc.
 *  - Câu hỏi ngữ pháp, ngữ cảnh và đọc hiểu phải soạn tay: chúng cần ngữ cảnh
 *    và phương án nhiễu có chủ đích, không sinh máy móc được.
 *
 * `difficulty` theo thang IRT: âm là dễ, dương là khó, 0 là trung bình. Bộ sinh
 * đề lấy mẫu phân tầng theo tham số này nên đặt sai sẽ làm lệch độ khó cả đề.
 */

export interface SeedQuestion {
  mondaiCode: string;
  skill: 'reading' | 'writing' | 'language_knowledge';
  format: 'mcq_single' | 'sentence_order';
  stem: string;
  options?: string[];
  /** Chỉ số (bắt đầu từ 0) của phương án đúng trong `options`. */
  correct?: number;
  /** Dạng sắp xếp câu: thứ tự đúng của các mảnh, và vị trí dấu ★ (bắt đầu từ 0). */
  sequence?: string[];
  starPosition?: number;
  explanationVi: string;
  difficulty: number;
  passageKey?: string;
}

/** Đoạn văn dùng chung cho nhiều câu hỏi đọc hiểu. */
export interface SeedPassage {
  key: string;
  title: string;
  body: string;
  jlptLevel: 'N5';
}

// ---------------------------------------------------------------------------
// Mondai 3 — Từ trong ngữ cảnh
// ---------------------------------------------------------------------------

const CONTEXT: SeedQuestion[] = [
  {
    mondaiCode: 'N5-VOC-M3', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'まいあさ　６じに（　　）。',
    options: ['おきます', 'ねます', 'ききます', 'かいます'],
    correct: 0,
    explanationVi: 'おきます = thức dậy. Câu nói "mỗi sáng 6 giờ ___", chỉ có "thức dậy" hợp lý.',
    difficulty: -0.5,
  },
  {
    mondaiCode: 'N5-VOC-M3', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'のどが　かわきました。みずを（　　）。',
    options: ['のみます', 'たべます', 'よみます', 'ききます'],
    correct: 0,
    explanationVi: 'Nước thì "uống" (のみます). たべます là ăn, dùng cho đồ ăn.',
    difficulty: -0.6,
  },
  {
    mondaiCode: 'N5-VOC-M3', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'としょかんは　（　　）ですから、べんきょうしやすいです。',
    options: ['しずか', 'にぎやか', 'ゆうめい', 'べんり'],
    correct: 0,
    explanationVi: 'しずか = yên tĩnh. Vế sau nói "nên dễ học", chỉ "yên tĩnh" mới là lý do hợp lý.',
    difficulty: 0.1,
  },
  {
    mondaiCode: 'N5-VOC-M3', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'この　でんしゃは　とても（　　）です。人が　おおいです。',
    options: ['こんでいます', 'すいています', 'しずかです', 'やすいです'],
    correct: 0,
    explanationVi: 'Câu sau giải thích "nhiều người", nên tàu đang đông (こんでいます).',
    difficulty: 0.4,
  },
  {
    mondaiCode: 'N5-VOC-M3', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'デパートで　シャツを（　　）。',
    options: ['かいました', 'つくりました', 'ならいました', 'あるきました'],
    correct: 0,
    explanationVi: 'Ở cửa hàng bách hoá thì "mua" (かいました).',
    difficulty: -0.4,
  },
  {
    mondaiCode: 'N5-VOC-M3', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'きょうは　しごとが　おおくて、とても（　　）です。',
    options: ['いそがしい', 'たのしい', 'すずしい', 'あかるい'],
    correct: 0,
    explanationVi: 'Nhiều việc thì "bận rộn" (いそがしい).',
    difficulty: 0,
  },
  {
    mondaiCode: 'N5-VOC-M3', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'ともだちに　てがみを（　　）。',
    options: ['かきます', 'よみます', ' みます', 'ききます'],
    correct: 0,
    explanationVi: 'Thư thì "viết" (かきます). よみます là đọc — đọc thư của mình gửi đi thì vô lý.',
    difficulty: -0.3,
  },
  {
    mondaiCode: 'N5-VOC-M3', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'えきまで　バスで（　　）ぐらい　かかります。',
    options: ['２０ぷん', '２０まい', '２０さつ', '２０にん'],
    correct: 0,
    explanationVi: 'かかります đi với thời gian. ぷん là đơn vị phút; まい/さつ/にん là lượng từ cho vật và người.',
    difficulty: 0.2,
  },
  {
    mondaiCode: 'N5-VOC-M3', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'この　もんだいは　むずかしいです。せんせいに（　　）。',
    options: ['ききます', 'はなします', 'いいます', 'よびます'],
    correct: 0,
    explanationVi: 'きく vừa nghĩa "nghe" vừa nghĩa "hỏi". Gặp bài khó thì hỏi thầy cô.',
    difficulty: 0.3,
  },
  {
    mondaiCode: 'N5-VOC-M3', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'あした　やすみですから、どこかへ（　　）たいです。',
    options: ['いき', 'いって', 'いく', 'いった'],
    correct: 0,
    explanationVi: '～たい gắn vào thể ます bỏ ます: いきます → いき + たい.',
    difficulty: 0.3,
  },
  {
    mondaiCode: 'N5-VOC-M3', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'へやの　でんきを（　　）ください。くらいです。',
    options: ['つけて', 'けして', 'あけて', 'しめて'],
    correct: 0,
    explanationVi: 'Câu sau nói "tối quá" nên phải BẬT đèn (つけて). けす là tắt.',
    difficulty: 0.2,
  },
  {
    mondaiCode: 'N5-VOC-M3', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'かぞくと　いっしょに　しゃしんを（　　）。',
    options: ['とりました', 'つくりました', 'かきました', 'よみました'],
    correct: 0,
    explanationVi: 'Ảnh thì dùng động từ とる (chụp): しゃしんを とる.',
    difficulty: 0.1,
  },
];

// ---------------------------------------------------------------------------
// Mondai 4 — Từ đồng nghĩa / cách nói khác
// ---------------------------------------------------------------------------

const SYNONYM: SeedQuestion[] = [
  {
    mondaiCode: 'N5-VOC-M4', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'この　みせは　やすいです。\n（　　）と　おなじ　いみです。',
    options: ['おかねが　あまり　かかりません', 'おかねが　たくさん　かかります', 'とても　ひろいです', 'とても　あたらしいです'],
    correct: 0,
    explanationVi: 'やすい = rẻ, tức là không tốn nhiều tiền.',
    difficulty: 0.1,
  },
  {
    mondaiCode: 'N5-VOC-M4', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'ちちは　まいにち　はたらいて　います。\n（　　）と　おなじ　いみです。',
    options: ['ちちは　まいにち　しごとを　して　います', 'ちちは　まいにち　やすんで　います', 'ちちは　まいにち　あそんで　います', 'ちちは　まいにち　ねて　います'],
    correct: 0,
    explanationVi: 'はたらく = làm việc, đồng nghĩa với しごとをする.',
    difficulty: 0.2,
  },
  {
    mondaiCode: 'N5-VOC-M4', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'この　へやは　きれいでは　ありません。\n（　　）と　おなじ　いみです。',
    options: ['この　へやは　きたないです', 'この　へやは　ひろいです', 'この　へやは　あかるいです', 'この　へやは　しずかです'],
    correct: 0,
    explanationVi: 'きれいではありません = không sạch/đẹp, tức là きたない (bẩn).',
    difficulty: 0.2,
  },
  {
    mondaiCode: 'N5-VOC-M4', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'あには　だいがくの　がくせいです。\n（　　）と　おなじ　いみです。',
    options: ['あには　だいがくで　べんきょうして　います', 'あには　だいがくで　おしえて　います', 'あには　かいしゃで　はたらいて　います', 'あには　びょういんに　います'],
    correct: 0,
    explanationVi: 'Sinh viên đại học nghĩa là đang học ở đại học. Phương án 2 là "dạy" — đó là giáo viên.',
    difficulty: 0.3,
  },
  {
    mondaiCode: 'N5-VOC-M4', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'まいあさ　７じに　いえを　でます。\n（　　）と　おなじ　いみです。',
    options: ['まいあさ　７じに　いえから　いきます', 'まいあさ　７じに　いえに　かえります', 'まいあさ　７じに　おきます', 'まいあさ　７じに　ねます'],
    correct: 0,
    explanationVi: 'いえを でる = ra khỏi nhà. かえる là về nhà, ngược nghĩa.',
    difficulty: 0.3,
  },
  {
    mondaiCode: 'N5-VOC-M4', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'この　ほんは　つまらないです。\n（　　）と　おなじ　いみです。',
    options: ['この　ほんは　おもしろく　ないです', 'この　ほんは　おもしろいです', 'この　ほんは　むずかしいです', 'この　ほんは　たかいです'],
    correct: 0,
    explanationVi: 'つまらない = chán, tức là không thú vị (おもしろくない).',
    difficulty: 0.1,
  },
];

// ---------------------------------------------------------------------------
// Mondai Ngữ pháp 1 — Điền trợ từ / mẫu câu
// ---------------------------------------------------------------------------

const GRAMMAR: SeedQuestion[] = [
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'わたし（　　）がくせいです。', options: ['は', 'を', 'に', 'へ'], correct: 0,
    explanationVi: 'は đánh dấu chủ đề của câu. Mẫu「AはBです」= A là B.', difficulty: -0.7 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'ごはん（　　）たべます。', options: ['を', 'が', 'は', 'で'], correct: 0,
    explanationVi: 'を đánh dấu tân ngữ trực tiếp của hành động.', difficulty: -0.6 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'がっこう（　　）いきます。', options: ['へ', 'を', 'が', 'も'], correct: 0,
    explanationVi: 'へ (đọc là "e") chỉ hướng di chuyển. に cũng dùng được, nhưng ở đây chỉ có へ.', difficulty: -0.5 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'としょかん（　　）ほんを　よみます。', options: ['で', 'に', 'を', 'へ'], correct: 0,
    explanationVi: 'で chỉ NƠI DIỄN RA hành động. に chỉ nơi tồn tại hoặc đích đến.', difficulty: 0 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'つくえの　うえ（　　）ほんが　あります。', options: ['に', 'で', 'を', 'と'], correct: 0,
    explanationVi: 'Với あります/います chỉ sự tồn tại, dùng に cho vị trí.', difficulty: 0.1 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'ともだち（　　）えいがを　みました。', options: ['と', 'を', 'に', 'が'], correct: 0,
    explanationVi: 'と = cùng với (ai đó).', difficulty: -0.2 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'バス（　　）かいしゃへ　いきます。', options: ['で', 'に', 'を', 'と'], correct: 0,
    explanationVi: 'で còn chỉ PHƯƠNG TIỆN: バスで = bằng xe buýt.', difficulty: 0 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: '７じ（　　）おきます。', options: ['に', 'で', 'を', 'へ'], correct: 0,
    explanationVi: 'に dùng với mốc thời gian cụ thể (giờ, ngày, tháng).', difficulty: -0.3 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'これは　わたし（　　）かばんです。', options: ['の', 'は', 'を', 'が'], correct: 0,
    explanationVi: 'の nối hai danh từ, chỉ sở hữu: わたしの = của tôi.', difficulty: -0.6 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'にほんご（　　）すこし　わかります。', options: ['が', 'を', 'に', 'で'], correct: 0,
    explanationVi: 'わかる, できる, すき, じょうず đi với が chứ không phải を.', difficulty: 0.4 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'あした　あめ（　　）ふるでしょう。', options: ['が', 'を', 'に', 'へ'], correct: 0,
    explanationVi: 'ふる (mưa/tuyết rơi) là nội động từ, chủ ngữ đi với が.', difficulty: 0.4 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'わたしは　コーヒー（　　）すきです。', options: ['が', 'を', 'に', 'で'], correct: 0,
    explanationVi: 'すき là tính từ, đối tượng yêu thích đi với が.', difficulty: 0.3 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'この　りんごは　１つ　１００えん（　　）。', options: ['です', 'ます', 'ある', 'いる'], correct: 0,
    explanationVi: 'Sau danh từ/số lượng dùng です. ます chỉ gắn với động từ.', difficulty: -0.4 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'きのう　えいがを（　　）。', options: ['みました', 'みます', 'みる', 'みて'], correct: 0,
    explanationVi: 'きのう (hôm qua) đòi thì quá khứ: ました.', difficulty: -0.4 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'この　へやは　あまり（　　）。', options: ['ひろく　ありません', 'ひろいです', 'ひろくです', 'ひろいでは　ありません'], correct: 0,
    explanationVi: 'Tính từ đuôi い phủ định: bỏ い thêm くありません. あまり luôn đi với phủ định.', difficulty: 0.5 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'にちようびは　しごとを（　　）。', options: ['しません', 'しないです', 'しなます', 'しませんです'], correct: 0,
    explanationVi: 'する ở thể ます phủ định là しません.', difficulty: 0.1 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'ちょっと　まって（　　）。', options: ['ください', 'です', 'ます', 'あります'], correct: 0,
    explanationVi: 'Mẫu 「Vて + ください」= xin hãy làm gì đó.', difficulty: -0.2 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'ここで　しゃしんを　とっては（　　）。', options: ['いけません', 'いいです', 'あります', 'します'], correct: 0,
    explanationVi: 'Mẫu 「Vては いけません」= cấm làm gì đó.', difficulty: 0.6 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'この　カメラは　あの　カメラ（　　）たかいです。', options: ['より', 'から', 'まで', 'など'], correct: 0,
    explanationVi: 'Mẫu so sánh 「AはBより～」= A hơn B.', difficulty: 0.5 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'あさ　９じ（　　）ごご　５じまで　はたらきます。', options: ['から', 'より', 'ので', 'でも'], correct: 0,
    explanationVi: 'Cặp 「から～まで」= từ… đến…', difficulty: 0.2 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'あたまが　いたいです（　　）、やすみます。', options: ['から', 'が', 'でも', 'まで'], correct: 0,
    explanationVi: 'から nối câu chỉ lý do: vì đau đầu nên nghỉ.', difficulty: 0.3 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'にほんへ　いった　こと（　　）ありますか。', options: ['が', 'を', 'は', 'に'], correct: 0,
    explanationVi: 'Mẫu 「Vた ことが ある」= đã từng làm gì.', difficulty: 0.6 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'へやの　なかに　だれ（　　）いません。', options: ['も', 'が', 'は', 'を'], correct: 0,
    explanationVi: 'だれも + phủ định = không có ai cả.', difficulty: 0.5 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'テレビを　みながら、ごはんを（　　）。', options: ['たべます', 'たべ', 'たべて', 'たべた'], correct: 0,
    explanationVi: 'Mẫu 「Vながら」: hành động chính đứng cuối câu ở thể ます.', difficulty: 0.4 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'まいにち　うんどうした　ほうが（　　）。', options: ['いいです', 'あります', 'します', 'ください'], correct: 0,
    explanationVi: 'Mẫu 「Vた ほうが いい」= nên làm gì.', difficulty: 0.6 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'かばんの　なかに　なに（　　）ありますか。', options: ['が', 'を', 'は', 'も'], correct: 0,
    explanationVi: 'Câu hỏi về sự tồn tại dùng が: なにが ありますか.', difficulty: 0.3 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'せんせいは　きょうしつ（　　）います。', options: ['に', 'で', 'を', 'へ'], correct: 0,
    explanationVi: 'います chỉ sự tồn tại của người, vị trí dùng に.', difficulty: 0.1 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'この　みちを　まっすぐ（　　）ください。', options: ['いって', 'いく', 'いき', 'いった'], correct: 0,
    explanationVi: 'いく → thể て là いって (bất quy tắc, không phải いきて).', difficulty: 0.5 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'あねは　うたが　じょうず（　　）。', options: ['です', 'いです', 'くない', 'ます'], correct: 0,
    explanationVi: 'じょうず là tính từ đuôi な, ở dạng lịch sự đứng trước です.', difficulty: 0.2 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'しずか（　　）へやで　べんきょうします。', options: ['な', 'の', 'い', 'に'], correct: 0,
    explanationVi: 'Tính từ đuôi な bổ nghĩa cho danh từ phải giữ な: しずかな へや.', difficulty: 0.3 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'きょうは　げつようび（　　）、あしたは　かようびです。', options: ['で', 'と', 'を', 'に'], correct: 0,
    explanationVi: 'Nối hai câu danh từ dùng で: 「Nで、～」.', difficulty: 0.5 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'コーヒーと　おちゃと　どちら（　　）すきですか。', options: ['が', 'を', 'は', 'に'], correct: 0,
    explanationVi: 'Mẫu so sánh hai thứ: 「AとBと どちらが～ですか」.', difficulty: 0.6 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'ひらがな（　　）かいて　ください。', options: ['で', 'に', 'を', 'と'], correct: 0,
    explanationVi: 'で chỉ công cụ/phương tiện, ở đây là "viết BẰNG hiragana".', difficulty: 0.4 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'まだ　しゅくだいを（　　）。', options: ['して　いません', 'しました', 'します', 'しません'], correct: 0,
    explanationVi: 'まだ + 「Vて いません」= vẫn chưa làm.', difficulty: 0.7 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'この　ケーキは　やすくて（　　）です。', options: ['おいしい', 'おいしくて', 'おいしいで', 'おいしく'], correct: 0,
    explanationVi: 'Nối hai tính từ い: cái đầu thành くて, cái cuối giữ nguyên.', difficulty: 0.4 },
  { mondaiCode: 'N5-GRA-M1', skill: 'language_knowledge', format: 'mcq_single',
    stem: 'にわに　ねこが　３（　　）います。', options: ['びき', 'まい', 'さつ', 'ほん'], correct: 0,
    explanationVi: '匹 (ひき/びき) là lượng từ cho động vật nhỏ. まい cho vật mỏng, さつ cho sách.', difficulty: 0.5 },
];

// ---------------------------------------------------------------------------
// Mondai Ngữ pháp 2 — Sắp xếp câu (dấu ★)
// ---------------------------------------------------------------------------

const SENTENCE_ORDER: SeedQuestion[] = [
  { mondaiCode: 'N5-GRA-M2', skill: 'language_knowledge', format: 'sentence_order',
    stem: 'わたしは　＿＿　＿＿　★　＿＿　います。',
    sequence: ['まいにち', 'にほんごを', 'べんきょうして'], starPosition: 2,
    explanationVi: 'Câu đúng: わたしは まいにち にほんごを べんきょうして います。Vị trí ★ là べんきょうして.',
    difficulty: 0.3 },
  { mondaiCode: 'N5-GRA-M2', skill: 'language_knowledge', format: 'sentence_order',
    stem: 'つくえの　＿＿　＿＿　★　＿＿　あります。',
    sequence: ['うえに', 'ほんが', 'さんさつ'], starPosition: 2,
    explanationVi: 'Câu đúng: つくえの うえに ほんが さんさつ あります。Lượng từ đứng ngay trước động từ.',
    difficulty: 0.4 },
  { mondaiCode: 'N5-GRA-M2', skill: 'language_knowledge', format: 'sentence_order',
    stem: 'きのう　＿＿　＿＿　★　＿＿　いきました。',
    sequence: ['ともだちと', 'えいがを', 'みに'], starPosition: 2,
    explanationVi: 'Câu đúng: きのう ともだちと えいがを みに いきました。Mẫu 「Vます + に いく」= đi để làm gì.',
    difficulty: 0.5 },
  { mondaiCode: 'N5-GRA-M2', skill: 'language_knowledge', format: 'sentence_order',
    stem: 'この　＿＿　＿＿　★　＿＿　です。',
    sequence: ['へやは', 'とても', 'しずか'], starPosition: 2,
    explanationVi: 'Câu đúng: この へやは とても しずか です。Trạng từ mức độ đứng trước tính từ.',
    difficulty: 0.2 },
  { mondaiCode: 'N5-GRA-M2', skill: 'language_knowledge', format: 'sentence_order',
    stem: 'あした　＿＿　＿＿　★　＿＿　ください。',
    sequence: ['８じに', 'ここへ', 'きて'], starPosition: 2,
    explanationVi: 'Câu đúng: あした ８じに ここへ きて ください。Thời gian trước, nơi chốn sau, động từ cuối.',
    difficulty: 0.3 },
  { mondaiCode: 'N5-GRA-M2', skill: 'language_knowledge', format: 'sentence_order',
    stem: 'わたしは　＿＿　＿＿　★　＿＿　です。',
    sequence: ['あたらしい', 'くるまが', 'ほしい'], starPosition: 2,
    explanationVi: 'Câu đúng: わたしは あたらしい くるまが ほしい です。ほしい đi với が.',
    difficulty: 0.6 },
  { mondaiCode: 'N5-GRA-M2', skill: 'language_knowledge', format: 'sentence_order',
    stem: 'たなかさんは　＿＿　＿＿　★　＿＿　います。',
    sequence: ['ぎんこうで', 'はたらいて'], starPosition: 1,
    explanationVi: 'Câu đúng: たなかさんは ぎんこうで はたらいて います。で chỉ nơi diễn ra hành động.',
    difficulty: 0.2 },
  { mondaiCode: 'N5-GRA-M2', skill: 'language_knowledge', format: 'sentence_order',
    stem: 'この　＿＿　＿＿　★　＿＿　ですか。',
    sequence: ['りょうりは', 'どうやって', 'つくるん'], starPosition: 2,
    explanationVi: 'Câu đúng: この りょうりは どうやって つくるん ですか。',
    difficulty: 0.7 },
  { mondaiCode: 'N5-GRA-M2', skill: 'language_knowledge', format: 'sentence_order',
    stem: 'あめが　＿＿　＿＿　★　＿＿　いきません。',
    sequence: ['ふって', 'いますから', 'どこも'], starPosition: 2,
    explanationVi: 'Câu đúng: あめが ふって いますから どこも いきません。から chỉ lý do.',
    difficulty: 0.6 },
  { mondaiCode: 'N5-GRA-M2', skill: 'language_knowledge', format: 'sentence_order',
    stem: 'わたしの　＿＿　＿＿　★　＿＿　います。',
    sequence: ['あには', 'とうきょうに', 'すんで'], starPosition: 2,
    explanationVi: 'Câu đúng: わたしの あには とうきょうに すんで います。すむ chỉ nơi ở dùng に.',
    difficulty: 0.4 },
];

// ---------------------------------------------------------------------------
// Đoạn văn đọc hiểu
// ---------------------------------------------------------------------------

export const PASSAGES: SeedPassage[] = [
  {
    key: 'p-tanaka-asa',
    title: 'Buổi sáng của Tanaka',
    jlptLevel: 'N5',
    body:
      'たなかさんは　まいあさ　６じに　おきます。かおを　あらってから、パンと　たまごを　たべます。' +
      'コーヒーも　のみます。７じはんに　いえを　でて、でんしゃで　かいしゃへ　いきます。' +
      'かいしゃまで　４０ぷん　かかります。でんしゃの　なかで　しんぶんを　よみます。',
  },
  {
    key: 'p-watashi-heya',
    title: 'Phòng của tôi',
    jlptLevel: 'N5',
    body:
      'わたしの　へやは　あまり　ひろく　ありませんが、とても　あかるいです。まどが　おおきいですから。' +
      'へやの　なかに　つくえと　いすが　あります。つくえの　うえに　コンピューターと　ほんが　あります。' +
      'ほんは　ぜんぶで　２０さつぐらい　あります。まどの　そばに　ちいさい　はなが　あります。' +
      'まいあさ　その　はなに　みずを　やります。よるは　へやで　おんがくを　ききながら、にほんごを　べんきょうします。',
  },
  {
    key: 'p-toshokan-annai',
    title: 'Hướng dẫn sử dụng thư viện',
    jlptLevel: 'N5',
    body:
      '【としょかんの　あんない】\n' +
      'ひらいて　いる　じかん：げつようび〜きんようび　９じ〜２０じ／どようび　１０じ〜１７じ\n' +
      'やすみ：にちようび\n' +
      'ほんを　かりる：ひとり　５さつまで、２しゅうかん\n' +
      'としょかんの　なかで　たべものを　たべては　いけません。のみものは　いいです。',
  },
];

const READING: SeedQuestion[] = [
  // --- Mondai 3: điền từ vào đoạn văn ---
  { mondaiCode: 'N5-GRA-M3', skill: 'reading', format: 'mcq_single',
    stem: 'たなかさんは　でんしゃ（　　）かいしゃへ　いきます。',
    options: ['で', 'に', 'を', 'へ'], correct: 0, passageKey: 'p-tanaka-asa',
    explanationVi: 'Phương tiện đi lại dùng で.', difficulty: 0.1 },
  { mondaiCode: 'N5-GRA-M3', skill: 'reading', format: 'mcq_single',
    stem: 'かおを　あらって（　　）、あさごはんを　たべます。',
    options: ['から', 'まで', 'ので', 'のに'], correct: 0, passageKey: 'p-tanaka-asa',
    explanationVi: 'Mẫu 「Vてから」= sau khi làm gì thì…', difficulty: 0.4 },
  { mondaiCode: 'N5-GRA-M3', skill: 'reading', format: 'mcq_single',
    stem: 'わたしの　へやは　あまり　ひろく（　　）。',
    options: ['ありません', 'あります', 'です', 'ないです'], correct: 0, passageKey: 'p-watashi-heya',
    explanationVi: 'あまり đi với phủ định; tính từ い phủ định là ～くありません.', difficulty: 0.3 },
  { mondaiCode: 'N5-GRA-M3', skill: 'reading', format: 'mcq_single',
    stem: 'おんがくを　ききな（　　）、べんきょうします。',
    options: ['がら', 'ので', 'から', 'ても'], correct: 0, passageKey: 'p-watashi-heya',
    explanationVi: 'Mẫu 「Vながら」= vừa làm A vừa làm B.', difficulty: 0.4 },
  { mondaiCode: 'N5-GRA-M3', skill: 'reading', format: 'mcq_single',
    stem: 'つくえの　うえ（　　）ほんが　あります。',
    options: ['に', 'で', 'を', 'と'], correct: 0, passageKey: 'p-watashi-heya',
    explanationVi: 'Vị trí tồn tại dùng に.', difficulty: 0.1 },
  { mondaiCode: 'N5-GRA-M3', skill: 'reading', format: 'mcq_single',
    stem: 'まど（　　）おおきいですから、へやは　あかるいです。',
    options: ['が', 'を', 'に', 'へ'], correct: 0, passageKey: 'p-watashi-heya',
    explanationVi: 'Chủ ngữ của mệnh đề lý do dùng が.', difficulty: 0.2 },
  { mondaiCode: 'N5-GRA-M3', skill: 'reading', format: 'mcq_single',
    stem: 'としょかんの　なかで　たべものを　たべては（　　）。',
    options: ['いけません', 'いいです', 'ください', 'あります'], correct: 0, passageKey: 'p-toshokan-annai',
    explanationVi: 'Mẫu cấm đoán 「Vては いけません」.', difficulty: 0.4 },
  { mondaiCode: 'N5-GRA-M3', skill: 'reading', format: 'mcq_single',
    stem: 'ほんは　ひとり　５さつ（　　）かりる　ことが　できます。',
    options: ['まで', 'から', 'より', 'ほど'], correct: 0, passageKey: 'p-toshokan-annai',
    explanationVi: 'まで chỉ giới hạn trên: tối đa 5 quyển.', difficulty: 0.5 },

  // --- Mondai 4: đoạn văn ngắn ---
  { mondaiCode: 'N5-READ-M4', skill: 'reading', format: 'mcq_single',
    stem: 'たなかさんは　なんじに　いえを　でますか。',
    options: ['７じはん', '６じ', '７じ', '８じ'], correct: 0, passageKey: 'p-tanaka-asa',
    explanationVi: 'Bài viết rõ「７じはんに いえを でて」. ６じ là giờ thức dậy — đây là bẫy hay gặp.',
    difficulty: 0 },
  { mondaiCode: 'N5-READ-M4', skill: 'reading', format: 'mcq_single',
    stem: 'たなかさんは　でんしゃの　なかで　なにを　しますか。',
    options: ['しんぶんを　よみます', 'コーヒーを　のみます', 'パンを　たべます', 'かおを　あらいます'], correct: 0,
    passageKey: 'p-tanaka-asa',
    explanationVi: 'Câu cuối: 「でんしゃの なかで しんぶんを よみます」. Các việc khác đều làm ở nhà.',
    difficulty: 0.1 },
  { mondaiCode: 'N5-READ-M4', skill: 'reading', format: 'mcq_single',
    stem: 'かいしゃまで　どのぐらい　かかりますか。',
    options: ['４０ぷん', '３０ぷん', '１じかん', '２０ぷん'], correct: 0, passageKey: 'p-tanaka-asa',
    explanationVi: 'Bài viết「かいしゃまで ４０ぷん かかります」.', difficulty: 0 },
  { mondaiCode: 'N5-READ-M4', skill: 'reading', format: 'mcq_single',
    stem: 'たなかさんは　あさ　なにを　たべますか。',
    options: ['パンと　たまご', 'ごはんと　さかな', 'パンだけ', 'なにも　たべません'], correct: 0,
    passageKey: 'p-tanaka-asa',
    explanationVi: 'Bài viết「パンと たまごを たべます」. コーヒー là đồ uống, không phải đồ ăn.',
    difficulty: 0.2 },
  { mondaiCode: 'N5-READ-M4', skill: 'reading', format: 'mcq_single',
    stem: 'この　ひとの　へやは　どうして　あかるいですか。',
    options: ['まどが　おおきいから', 'へやが　ひろいから', 'でんきが　おおいから', 'はなが　あるから'], correct: 0,
    passageKey: 'p-watashi-heya',
    explanationVi: 'Bài viết nêu lý do ngay sau đó:「まどが おおきいですから」.', difficulty: 0.1 },
  { mondaiCode: 'N5-READ-M4', skill: 'reading', format: 'mcq_single',
    stem: 'この　ひとは　よる　なにを　しますか。',
    options: ['おんがくを　ききながら　べんきょうします', 'はなに　みずを　やります', 'ほんを　かいます', 'ともだちと　あいます'], correct: 0,
    passageKey: 'p-watashi-heya',
    explanationVi: 'Tưới hoa là việc buổi sáng (まいあさ), học là việc buổi tối (よるは).',
    difficulty: 0.3 },

  // --- Mondai 5: đoạn văn vừa ---
  { mondaiCode: 'N5-READ-M5', skill: 'reading', format: 'mcq_single',
    stem: 'この　ひとの　へやに　ついて、ただしい　ものは　どれですか。',
    options: [
      'ひろく　ないですが、あかるいです',
      'ひろくて、あかるいです',
      'ひろいですが、くらいです',
      'ひろく　なくて、くらいです',
    ],
    correct: 0, passageKey: 'p-watashi-heya',
    explanationVi: 'Câu đầu:「あまり ひろく ありませんが、とても あかるいです」— không rộng NHƯNG sáng.',
    difficulty: 0.4 },
  { mondaiCode: 'N5-READ-M5', skill: 'reading', format: 'mcq_single',
    stem: 'つくえの　うえに　ある　ものは　なんですか。',
    options: ['コンピューターと　ほん', 'はなと　ほん', 'いすと　つくえ', 'コンピューターと　はな'], correct: 0,
    passageKey: 'p-watashi-heya',
    explanationVi: 'Hoa đặt cạnh cửa sổ (まどの そばに), không phải trên bàn.', difficulty: 0.5 },
  { mondaiCode: 'N5-READ-M5', skill: 'reading', format: 'mcq_single',
    stem: 'まいあさ　この　ひとは　なにを　しますか。',
    options: ['はなに　みずを　やります', 'にほんごを　べんきょうします', 'おんがくを　ききます', 'ほんを　よみます'], correct: 0,
    passageKey: 'p-watashi-heya',
    explanationVi: '「まいあさ その はなに みずを やります」. Học tiếng Nhật và nghe nhạc là buổi tối.',
    difficulty: 0.4 },
  { mondaiCode: 'N5-READ-M5', skill: 'reading', format: 'mcq_single',
    stem: 'たなかさんの　あさに　ついて、ただしくない　ものは　どれですか。',
    options: [
      'ろくじはんに　いえを　でます',
      'ろくじに　おきます',
      'コーヒーを　のみます',
      'でんしゃで　かいしゃへ　いきます',
    ],
    correct: 0, passageKey: 'p-tanaka-asa',
    explanationVi: 'Câu hỏi tìm ý SAI. Bài viết là ７じはん (7 rưỡi), không phải ６じはん.',
    difficulty: 0.7 },

  // --- Mondai 6: tìm kiếm thông tin ---
  { mondaiCode: 'N5-READ-M6', skill: 'reading', format: 'mcq_single',
    stem: 'どようびの　ごご　６じに　としょかんへ　いきたいです。どうですか。',
    options: [
      'としょかんは　しまって　います',
      'としょかんは　あいて　います',
      'ほんを　かりる　ことが　できます',
      'にちようびなら　いいです',
    ],
    correct: 0, passageKey: 'p-toshokan-annai',
    explanationVi: 'Thứ Bảy chỉ mở đến 17 giờ, nên 18 giờ đã đóng cửa.', difficulty: 0.4 },
  { mondaiCode: 'N5-READ-M6', skill: 'reading', format: 'mcq_single',
    stem: 'ほんを　６さつ　かりたいです。どうですか。',
    options: [
      'かりる　ことが　できません',
      'かりる　ことが　できます',
      '２しゅうかんなら　いいです',
      'にちようびに　かりて　ください',
    ],
    correct: 0, passageKey: 'p-toshokan-annai',
    explanationVi: 'Quy định là tối đa 5 quyển một người, nên 6 quyển thì không được.', difficulty: 0.3 },
  { mondaiCode: 'N5-READ-M6', skill: 'reading', format: 'mcq_single',
    stem: 'としょかんの　なかで　して　いい　ことは　どれですか。',
    options: ['おちゃを　のむ', 'パンを　たべる', 'にちようびに　はいる', 'ほんを　１０さつ　かりる'], correct: 0,
    passageKey: 'p-toshokan-annai',
    explanationVi: '「のみものは いいです」— đồ uống thì được, chỉ cấm đồ ăn.', difficulty: 0.4 },
  { mondaiCode: 'N5-READ-M6', skill: 'reading', format: 'mcq_single',
    stem: 'げつようびの　あさ　８じに　としょかんへ　いきました。どうですか。',
    options: [
      'まだ　あいて　いません',
      'あいて　います',
      'やすみです',
      'ほんを　かえす　ことが　できます',
    ],
    correct: 0, passageKey: 'p-toshokan-annai',
    explanationVi: 'Thứ Hai mở từ 9 giờ, nên 8 giờ vẫn chưa mở cửa.', difficulty: 0.4 },
];

export const HANDWRITTEN_QUESTIONS: SeedQuestion[] = [
  ...CONTEXT,
  ...SYNONYM,
  ...GRAMMAR,
  ...SENTENCE_ORDER,
  ...READING,
];
