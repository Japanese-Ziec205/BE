/**
 * Mẩu văn hoá truyền thống Nhật Bản, hiện xen kẽ với kiến thức ôn lại ở trang chính.
 *
 * Vì sao dạy văn hoá giữa lúc học ngữ pháp: rất nhiều thứ trong tiếng Nhật chỉ
 * hợp lý khi biết bối cảnh văn hoá đằng sau. Người học thắc mắc tại sao phải
 * nói お疲れ様 mỗi lần rời văn phòng sẽ nhớ mẫu câu đó lâu hơn nhiều nếu hiểu
 * quan niệm về lao động tập thể của người Nhật.
 *
 * Mỗi mục cố ý ngắn — đây là thứ đọc lướt trong 15 giây giữa hai lần ôn thẻ,
 * không phải bài giảng.
 */

export interface CultureNote {
  key: string;
  title: string;
  japanese: string;
  reading: string;
  body: string;
  /** Mùa hoặc dịp liên quan, để sau này ưu tiên hiển thị đúng thời điểm trong năm. */
  season: 'xuan' | 'ha' | 'thu' | 'dong' | 'quanh_nam';
  emoji: string;
}

export const CULTURE_NOTES: CultureNote[] = [
  {
    key: 'hanami',
    title: 'Ngắm hoa anh đào',
    japanese: '花見',
    reading: 'はなみ',
    body: 'Cuối tháng 3 đầu tháng 4, cả nước Nhật trải bạt dưới gốc anh đào để ăn uống cùng nhau. Điều đẹp nhất của phong tục này nằm ở chỗ hoa chỉ nở khoảng một tuần — người Nhật gọi cảm thức ấy là 物の哀れ, vẻ đẹp đến từ chính sự ngắn ngủi.',
    season: 'xuan',
    emoji: '🌸',
  },
  {
    key: 'omotenashi',
    title: 'Tinh thần hiếu khách',
    japanese: 'おもてなし',
    reading: 'おもてなし',
    body: 'Không chỉ là phục vụ tốt, mà là đoán trước nhu cầu của khách trước khi khách kịp nói ra — và làm mà không mong được đền đáp hay khen ngợi. Đây là lý do nhà hàng Nhật không có văn hoá tiền boa.',
    season: 'quanh_nam',
    emoji: '🍵',
  },
  {
    key: 'otsukaresama',
    title: 'Lời chào khi tan làm',
    japanese: 'お疲れ様です',
    reading: 'おつかれさまです',
    body: 'Nghĩa đen là "anh/chị đã vất vả rồi". Người Nhật nói câu này khi gặp nhau ở công ty, khi rời phòng họp, khi tan làm. Nó thừa nhận công sức của người kia trước khi nói bất cứ chuyện gì khác — và nó phổ biến hơn cả こんにちは trong môi trường công sở.',
    season: 'quanh_nam',
    emoji: '🏢',
  },
  {
    key: 'itadakimasu',
    title: 'Lời trước bữa ăn',
    japanese: 'いただきます',
    reading: 'いただきます',
    body: 'Nói trước khi ăn, nghĩa gốc là "tôi xin nhận". Không phải cảm ơn người nấu, mà cảm ơn cả sinh mạng của thức ăn và mọi người trong chuỗi đưa nó tới bàn. Ăn xong thì nói ごちそうさまでした.',
    season: 'quanh_nam',
    emoji: '🍚',
  },
  {
    key: 'oshogatsu',
    title: 'Tết Nhật Bản',
    japanese: 'お正月',
    reading: 'おしょうがつ',
    body: 'Nhật Bản ăn Tết theo dương lịch từ năm 1873. Đêm giao thừa người ta ăn mì 年越しそば — sợi mì dài tượng trưng cho tuổi thọ, và dễ cắn đứt để tượng trưng cho việc cắt bỏ xui xẻo năm cũ.',
    season: 'dong',
    emoji: '🎍',
  },
  {
    key: 'obon',
    title: 'Lễ Vu Lan Nhật Bản',
    japanese: 'お盆',
    reading: 'おぼん',
    body: 'Giữa tháng 8, người Nhật tin tổ tiên trở về thăm nhà. Họ treo đèn lồng dẫn đường, và cuối lễ thả đèn trôi sông để tiễn linh hồn về lại. Đây là dịp cả nước về quê, tàu xe đông nhất năm.',
    season: 'ha',
    emoji: '🏮',
  },
  {
    key: 'momiji',
    title: 'Ngắm lá đỏ',
    japanese: '紅葉狩り',
    reading: 'もみじがり',
    body: 'Mùa thu, người Nhật đi ngắm lá phong đỏ y như ngắm hoa anh đào mùa xuân. Chữ 狩り nghĩa gốc là "đi săn" — ngày xưa quý tộc thật sự đi hái cành lá đẹp mang về.',
    season: 'thu',
    emoji: '🍁',
  },
  {
    key: 'kintsugi',
    title: 'Hàn gốm bằng vàng',
    japanese: '金継ぎ',
    reading: 'きんつぎ',
    body: 'Bát vỡ được gắn lại bằng sơn trộn bột vàng, để vết nứt hiện rõ thành đường vàng thay vì giấu đi. Triết lý đằng sau: thứ từng vỡ và được hàn lại thì đẹp hơn thứ chưa từng vỡ. Nghĩ tới điều này mỗi khi bạn quên mất một chữ đã học.',
    season: 'quanh_nam',
    emoji: '🏺',
  },
  {
    key: 'ojigi',
    title: 'Nghệ thuật cúi chào',
    japanese: 'お辞儀',
    reading: 'おじぎ',
    body: 'Góc cúi mang nghĩa khác nhau: 15 độ là chào hỏi thường ngày, 30 độ là lịch sự với khách hàng, 45 độ là xin lỗi nghiêm túc hoặc biết ơn sâu sắc. Cúi sai góc không sai ngữ pháp, nhưng người Nhật nhận ra ngay.',
    season: 'quanh_nam',
    emoji: '🙇',
  },
  {
    key: 'ganbaru',
    title: 'Tinh thần cố gắng',
    japanese: '頑張る',
    reading: 'がんばる',
    body: 'Từ khó dịch nhất sang tiếng Việt. Không hẳn là "cố lên", mà gần với "kiên trì bám trụ tới cùng". 頑張って là câu người Nhật nói nhiều nhất khi tiễn ai đó đi làm việc khó.',
    season: 'quanh_nam',
    emoji: '💪',
  },
  {
    key: 'wabisabi',
    title: 'Vẻ đẹp của sự không hoàn hảo',
    japanese: '侘寂',
    reading: 'わびさび',
    body: 'Quan niệm thẩm mỹ coi trọng cái mộc mạc, cũ kỹ, không cân đối. Một chén trà méo mó, men rạn được quý hơn chén tròn trịa hoàn hảo. Ứng vào việc học: phát âm chưa chuẩn vẫn cứ nói, đừng đợi tới lúc hoàn hảo.',
    season: 'quanh_nam',
    emoji: '🍂',
  },
  {
    key: 'meishi',
    title: 'Trao danh thiếp',
    japanese: '名刺交換',
    reading: 'めいしこうかん',
    body: 'Đưa và nhận danh thiếp bằng HAI tay, chữ hướng về phía người nhận. Nhận xong phải đọc và đặt lên bàn suốt buổi họp, không nhét ngay vào túi — tấm thiếp được coi như đại diện cho chính con người đó.',
    season: 'quanh_nam',
    emoji: '💼',
  },
  {
    key: 'onsen',
    title: 'Tắm suối nước nóng',
    japanese: '温泉',
    reading: 'おんせん',
    body: 'Phải tắm sạch hoàn toàn TRƯỚC khi bước xuống bồn, vì nước bồn dùng chung. Khăn nhỏ không được nhúng vào nước — người Nhật thường gấp và đặt lên đầu.',
    season: 'dong',
    emoji: '♨️',
  },
  {
    key: 'tanabata',
    title: 'Lễ hội Thất Tịch',
    japanese: '七夕',
    reading: 'たなばた',
    body: 'Ngày 7 tháng 7, người ta viết điều ước lên giấy màu 短冊 rồi treo lên cành tre. Truyền thuyết kể về Ngưu Lang và Chức Nữ mỗi năm chỉ được gặp nhau một lần qua dải Ngân Hà.',
    season: 'ha',
    emoji: '🎋',
  },
  {
    key: 'senpai',
    title: 'Quan hệ tiền bối – hậu bối',
    japanese: '先輩・後輩',
    reading: 'せんぱい・こうはい',
    body: 'Ai vào trước là 先輩, dù chỉ hơn một năm. Hậu bối dùng kính ngữ với tiền bối, đổi lại tiền bối có trách nhiệm chỉ dạy và che chở. Hiểu quan hệ này là hiểu vì sao tiếng Nhật có tới ba tầng kính ngữ.',
    season: 'quanh_nam',
    emoji: '🎓',
  },
];
