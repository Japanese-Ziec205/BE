/**
 * Từ vựng N5 mở rộng.
 *
 * Dữ liệu thuần, không phụ thuộc logger hay model — nhờ vậy test và bộ sinh câu
 * hỏi import trực tiếp được mà không kéo theo cả tầng cấu hình môi trường.
 *
 * Đây cũng là NGUỒN sinh câu hỏi thi thử phần Từ vựng: câu hỏi "đọc Kanji" và
 * "viết Kanji" được tạo tự động từ cặp (word, reading) ở đây, nên đáp án luôn
 * đúng theo dữ liệu chứ không do người soạn gõ tay rồi sai sót.
 *
 * `hasKanji` được suy ra lúc chạy, không lưu ở đây, để tránh sai lệch khi sửa từ.
 */
export interface VocabEntry {
  word: string;
  reading: string;
  meaningsVi: string[];
  pos: string[];
  topics: string[];
}

export const VOCABULARY_N5_EXTRA: VocabEntry[] = [
  // --- Người & gia đình ---
  { word: '人', reading: 'ひと', meaningsVi: ['người'], pos: ['noun'], topics: ['bản thân'] },
  { word: '男', reading: 'おとこ', meaningsVi: ['nam', 'đàn ông'], pos: ['noun'], topics: ['bản thân'] },
  { word: '女', reading: 'おんな', meaningsVi: ['nữ', 'phụ nữ'], pos: ['noun'], topics: ['bản thân'] },
  { word: '子供', reading: 'こども', meaningsVi: ['trẻ con', 'con cái'], pos: ['noun'], topics: ['gia đình'] },
  { word: '兄', reading: 'あに', meaningsVi: ['anh trai (của tôi)'], pos: ['noun'], topics: ['gia đình'] },
  { word: '姉', reading: 'あね', meaningsVi: ['chị gái (của tôi)'], pos: ['noun'], topics: ['gia đình'] },
  { word: '弟', reading: 'おとうと', meaningsVi: ['em trai'], pos: ['noun'], topics: ['gia đình'] },
  { word: '妹', reading: 'いもうと', meaningsVi: ['em gái'], pos: ['noun'], topics: ['gia đình'] },
  { word: '名前', reading: 'なまえ', meaningsVi: ['tên'], pos: ['noun'], topics: ['bản thân'] },

  // --- Trường học & công việc ---
  { word: '本', reading: 'ほん', meaningsVi: ['sách'], pos: ['noun'], topics: ['trường học'] },
  { word: '先週', reading: 'せんしゅう', meaningsVi: ['tuần trước'], pos: ['noun'], topics: ['thời gian'] },
  { word: '会社', reading: 'かいしゃ', meaningsVi: ['công ty'], pos: ['noun'], topics: ['công việc'] },
  { word: '仕事', reading: 'しごと', meaningsVi: ['công việc'], pos: ['noun'], topics: ['công việc'] },
  { word: '勉強', reading: 'べんきょう', meaningsVi: ['việc học', 'học tập'], pos: ['noun'], topics: ['trường học'] },
  { word: '言葉', reading: 'ことば', meaningsVi: ['từ ngữ', 'lời nói'], pos: ['noun'], topics: ['ngôn ngữ'] },
  { word: '大学', reading: 'だいがく', meaningsVi: ['trường đại học'], pos: ['noun'], topics: ['trường học'] },
  { word: '教室', reading: 'きょうしつ', meaningsVi: ['phòng học'], pos: ['noun'], topics: ['trường học'] },

  // --- Nơi chốn ---
  { word: '家', reading: 'いえ', meaningsVi: ['nhà'], pos: ['noun'], topics: ['nơi chốn'] },
  { word: '国', reading: 'くに', meaningsVi: ['đất nước'], pos: ['noun'], topics: ['nơi chốn'] },
  { word: '駅', reading: 'えき', meaningsVi: ['nhà ga'], pos: ['noun'], topics: ['di chuyển'] },
  { word: '店', reading: 'みせ', meaningsVi: ['cửa hàng'], pos: ['noun'], topics: ['nơi chốn'] },
  { word: '道', reading: 'みち', meaningsVi: ['con đường'], pos: ['noun'], topics: ['nơi chốn'] },
  { word: '町', reading: 'まち', meaningsVi: ['thị trấn', 'phố'], pos: ['noun'], topics: ['nơi chốn'] },
  { word: '外', reading: 'そと', meaningsVi: ['bên ngoài'], pos: ['noun'], topics: ['vị trí'] },
  { word: '中', reading: 'なか', meaningsVi: ['bên trong', 'ở giữa'], pos: ['noun'], topics: ['vị trí'] },
  { word: '上', reading: 'うえ', meaningsVi: ['phía trên'], pos: ['noun'], topics: ['vị trí'] },
  { word: '下', reading: 'した', meaningsVi: ['phía dưới'], pos: ['noun'], topics: ['vị trí'] },
  { word: '右', reading: 'みぎ', meaningsVi: ['bên phải'], pos: ['noun'], topics: ['vị trí'] },
  { word: '左', reading: 'ひだり', meaningsVi: ['bên trái'], pos: ['noun'], topics: ['vị trí'] },

  // --- Thiên nhiên & thời gian ---
  { word: '山', reading: 'やま', meaningsVi: ['núi'], pos: ['noun'], topics: ['thiên nhiên'] },
  { word: '川', reading: 'かわ', meaningsVi: ['sông'], pos: ['noun'], topics: ['thiên nhiên'] },
  { word: '空', reading: 'そら', meaningsVi: ['bầu trời'], pos: ['noun'], topics: ['thiên nhiên'] },
  { word: '花', reading: 'はな', meaningsVi: ['hoa'], pos: ['noun'], topics: ['thiên nhiên'] },
  { word: '雨', reading: 'あめ', meaningsVi: ['mưa'], pos: ['noun'], topics: ['thời tiết'] },
  { word: '雪', reading: 'ゆき', meaningsVi: ['tuyết'], pos: ['noun'], topics: ['thời tiết'] },
  { word: '天気', reading: 'てんき', meaningsVi: ['thời tiết'], pos: ['noun'], topics: ['thời tiết'] },
  { word: '朝', reading: 'あさ', meaningsVi: ['buổi sáng'], pos: ['noun'], topics: ['thời gian'] },
  { word: '昼', reading: 'ひる', meaningsVi: ['buổi trưa'], pos: ['noun'], topics: ['thời gian'] },
  { word: '夜', reading: 'よる', meaningsVi: ['buổi tối', 'ban đêm'], pos: ['noun'], topics: ['thời gian'] },
  { word: '毎日', reading: 'まいにち', meaningsVi: ['hằng ngày'], pos: ['noun'], topics: ['thời gian'] },
  { word: '今年', reading: 'ことし', meaningsVi: ['năm nay'], pos: ['noun'], topics: ['thời gian'] },
  { word: '来年', reading: 'らいねん', meaningsVi: ['năm sau'], pos: ['noun'], topics: ['thời gian'] },

  // --- Đồ vật & ăn uống ---
  { word: '手', reading: 'て', meaningsVi: ['bàn tay'], pos: ['noun'], topics: ['cơ thể'] },
  { word: '目', reading: 'め', meaningsVi: ['mắt'], pos: ['noun'], topics: ['cơ thể'] },
  { word: '口', reading: 'くち', meaningsVi: ['miệng'], pos: ['noun'], topics: ['cơ thể'] },
  { word: '耳', reading: 'みみ', meaningsVi: ['tai'], pos: ['noun'], topics: ['cơ thể'] },
  { word: '魚', reading: 'さかな', meaningsVi: ['cá'], pos: ['noun'], topics: ['ăn uống'] },
  { word: '肉', reading: 'にく', meaningsVi: ['thịt'], pos: ['noun'], topics: ['ăn uống'] },
  { word: '牛乳', reading: 'ぎゅうにゅう', meaningsVi: ['sữa bò'], pos: ['noun'], topics: ['ăn uống'] },
  { word: '野菜', reading: 'やさい', meaningsVi: ['rau'], pos: ['noun'], topics: ['ăn uống'] },
  { word: 'お金', reading: 'おかね', meaningsVi: ['tiền'], pos: ['noun'], topics: ['mua sắm'] },
  { word: '電話', reading: 'でんわ', meaningsVi: ['điện thoại'], pos: ['noun'], topics: ['đồ vật'] },
  { word: '新聞', reading: 'しんぶん', meaningsVi: ['báo'], pos: ['noun'], topics: ['đồ vật'] },
  { word: '写真', reading: 'しゃしん', meaningsVi: ['ảnh chụp'], pos: ['noun'], topics: ['đồ vật'] },
  { word: '音楽', reading: 'おんがく', meaningsVi: ['âm nhạc'], pos: ['noun'], topics: ['giải trí'] },
  { word: '映画', reading: 'えいが', meaningsVi: ['phim'], pos: ['noun'], topics: ['giải trí'] },

  // --- Động từ ---
  { word: '話す', reading: 'はなす', meaningsVi: ['nói chuyện'], pos: ['verb_godan'], topics: ['hành động'] },
  { word: '買う', reading: 'かう', meaningsVi: ['mua'], pos: ['verb_godan'], topics: ['mua sắm'] },
  { word: '待つ', reading: 'まつ', meaningsVi: ['chờ', 'đợi'], pos: ['verb_godan'], topics: ['hành động'] },
  { word: '入る', reading: 'はいる', meaningsVi: ['đi vào'], pos: ['verb_godan'], topics: ['di chuyển'] },
  { word: '出る', reading: 'でる', meaningsVi: ['đi ra'], pos: ['verb_ichidan'], topics: ['di chuyển'] },
  { word: '休む', reading: 'やすむ', meaningsVi: ['nghỉ ngơi'], pos: ['verb_godan'], topics: ['hành động'] },
  { word: '働く', reading: 'はたらく', meaningsVi: ['làm việc'], pos: ['verb_godan'], topics: ['công việc'] },
  { word: '住む', reading: 'すむ', meaningsVi: ['sống', 'cư trú'], pos: ['verb_godan'], topics: ['hành động'] },
  { word: '作る', reading: 'つくる', meaningsVi: ['làm', 'chế tạo'], pos: ['verb_godan'], topics: ['hành động'] },
  { word: '使う', reading: 'つかう', meaningsVi: ['dùng', 'sử dụng'], pos: ['verb_godan'], topics: ['hành động'] },
  { word: '立つ', reading: 'たつ', meaningsVi: ['đứng'], pos: ['verb_godan'], topics: ['hành động'] },
  { word: '座る', reading: 'すわる', meaningsVi: ['ngồi'], pos: ['verb_godan'], topics: ['hành động'] },
  { word: '起きる', reading: 'おきる', meaningsVi: ['thức dậy'], pos: ['verb_ichidan'], topics: ['sinh hoạt'] },
  { word: '寝る', reading: 'ねる', meaningsVi: ['ngủ'], pos: ['verb_ichidan'], topics: ['sinh hoạt'] },
  { word: '帰る', reading: 'かえる', meaningsVi: ['trở về'], pos: ['verb_godan'], topics: ['di chuyển'] },
  { word: '歩く', reading: 'あるく', meaningsVi: ['đi bộ'], pos: ['verb_godan'], topics: ['di chuyển'] },
  { word: '会う', reading: 'あう', meaningsVi: ['gặp'], pos: ['verb_godan'], topics: ['quan hệ'] },
  { word: '教える', reading: 'おしえる', meaningsVi: ['dạy', 'chỉ bảo'], pos: ['verb_ichidan'], topics: ['trường học'] },
  { word: '習う', reading: 'ならう', meaningsVi: ['học (từ ai đó)'], pos: ['verb_godan'], topics: ['trường học'] },
  { word: '分かる', reading: 'わかる', meaningsVi: ['hiểu'], pos: ['verb_godan'], topics: ['hành động'] },

  // --- Tính từ ---
  { word: '長い', reading: 'ながい', meaningsVi: ['dài'], pos: ['i_adjective'], topics: ['tính chất'] },
  { word: '短い', reading: 'みじかい', meaningsVi: ['ngắn'], pos: ['i_adjective'], topics: ['tính chất'] },
  { word: '早い', reading: 'はやい', meaningsVi: ['sớm'], pos: ['i_adjective'], topics: ['tính chất'] },
  { word: '遅い', reading: 'おそい', meaningsVi: ['muộn', 'chậm'], pos: ['i_adjective'], topics: ['tính chất'] },
  { word: '多い', reading: 'おおい', meaningsVi: ['nhiều'], pos: ['i_adjective'], topics: ['tính chất'] },
  { word: '少ない', reading: 'すくない', meaningsVi: ['ít'], pos: ['i_adjective'], topics: ['tính chất'] },
  { word: '暑い', reading: 'あつい', meaningsVi: ['nóng (thời tiết)'], pos: ['i_adjective'], topics: ['thời tiết'] },
  { word: '寒い', reading: 'さむい', meaningsVi: ['lạnh (thời tiết)'], pos: ['i_adjective'], topics: ['thời tiết'] },
  { word: '白い', reading: 'しろい', meaningsVi: ['trắng'], pos: ['i_adjective'], topics: ['màu sắc'] },
  { word: '黒い', reading: 'くろい', meaningsVi: ['đen'], pos: ['i_adjective'], topics: ['màu sắc'] },
  { word: '赤い', reading: 'あかい', meaningsVi: ['đỏ'], pos: ['i_adjective'], topics: ['màu sắc'] },
  { word: '青い', reading: 'あおい', meaningsVi: ['xanh dương'], pos: ['i_adjective'], topics: ['màu sắc'] },
  { word: '楽しい', reading: 'たのしい', meaningsVi: ['vui', 'thú vị'], pos: ['i_adjective'], topics: ['cảm xúc'] },
  { word: '忙しい', reading: 'いそがしい', meaningsVi: ['bận rộn'], pos: ['i_adjective'], topics: ['cảm xúc'] },
  { word: '元気', reading: 'げんき', meaningsVi: ['khoẻ mạnh', 'phấn chấn'], pos: ['na_adjective'], topics: ['cảm xúc'] },
  { word: '静か', reading: 'しずか', meaningsVi: ['yên tĩnh'], pos: ['na_adjective'], topics: ['tính chất'] },
  { word: '有名', reading: 'ゆうめい', meaningsVi: ['nổi tiếng'], pos: ['na_adjective'], topics: ['tính chất'] },
  { word: '便利', reading: 'べんり', meaningsVi: ['tiện lợi'], pos: ['na_adjective'], topics: ['tính chất'] },
  { word: '好き', reading: 'すき', meaningsVi: ['thích'], pos: ['na_adjective'], topics: ['cảm xúc'] },
  { word: '嫌い', reading: 'きらい', meaningsVi: ['ghét'], pos: ['na_adjective'], topics: ['cảm xúc'] },
];
