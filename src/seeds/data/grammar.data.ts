/**
 * Ngữ pháp trích từ tài liệu "Tổng Hợp Ôn Thi JLPT (N5–N1)".
 *
 * ---------------------------------------------------------------------------
 * PHẠM VI THẬT SỰ CỦA DỮ LIỆU NÀY — ĐỌC TRƯỚC KHI DÙNG
 * ---------------------------------------------------------------------------
 * Tài liệu gốc chỉ liệt kê ĐẦY ĐỦ bảng ngữ pháp N5. Với N4, N3, N2 và N1 nó
 * chỉ đưa ra một lát cắt theo thứ tự chữ cái (phần lớn là các mẫu bắt đầu bằng
 * あ, ば, だ, で…) rồi dừng — khoảng 8–12 mẫu mỗi cấp, trong khi mỗi cấp thật
 * sự có 150–250 mẫu.
 *
 * Vì vậy bộ dữ liệu này KHÔNG phải là giáo trình ngữ pháp hoàn chỉnh cho N4
 * trở lên. Nó là phần đã kiểm chứng được từ nguồn. Thà nạp 11 mẫu đúng còn hơn
 * nạp 200 mẫu tự chế: một câu ví dụ tiếng Nhật sai sẽ được người học chép vào
 * vở và mang theo nhiều năm.
 *
 * Muốn hoàn thiện cần một nguồn khác (giáo trình có bản quyền hoặc do ban biên
 * soạn tự viết) — hệ thống CMS đã sẵn sàng để thêm dần qua giao diện.
 */

export interface GrammarSeed {
  pattern: string;
  patternRomaji: string;
  titleVi: string;
  jlptLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  formation: string;
  meaningVi: string;
  usageNotes: string;
  category: string;
  teachOrder: number;
  formationDetail: { base: string; rule: string; example: string }[];
  nuanceComparison: { comparedWith: string; explanation: string }[];
  commonMistakes: { wrong: string; correct: string; explanation: string }[];
}

const g = (
  pattern: string,
  patternRomaji: string,
  titleVi: string,
  jlptLevel: GrammarSeed['jlptLevel'],
  meaningVi: string,
  formation: string,
  example: string,
  exampleVi: string,
  category: string,
  teachOrder: number,
  usageNotes = '',
): GrammarSeed => ({
  pattern,
  patternRomaji,
  titleVi,
  jlptLevel,
  formation,
  meaningVi,
  usageNotes,
  category,
  teachOrder,
  formationDetail: [{ base: 'Ví dụ', rule: formation, example: `${example} — ${exampleVi}` }],
  nuanceComparison: [],
  commonMistakes: [],
});

// ---------------------------------------------------------------------------
// N5 — bảng đầy đủ theo tài liệu
// ---------------------------------------------------------------------------
export const GRAMMAR_N5_EXTRA: GrammarSeed[] = [
  g('いちばん', 'ichiban', 'So sánh nhất', 'N5',
    'Trạng từ biểu thị cấp độ cao nhất trong phép so sánh.',
    'いちばん + tính từ',
    'ここがいちばん面白い場面です。', 'Đây là cảnh thú vị nhất.',
    'So sánh', 101),

  g('が', 'ga', 'Trợ từ chủ ngữ / liên từ "nhưng"', 'N5',
    'Xác định chủ thể của câu tồn tại hoặc hiện tượng tự nhiên. Cũng dùng làm liên từ chỉ sự nghịch lý (nhưng).',
    'N + が … / mệnh đề + が + mệnh đề',
    '難しいが、楽しい。', 'Khó nhưng mà vui.',
    'Trợ từ', 102,
    'Khác với は: が đưa thông tin MỚI, は nêu chủ đề đã biết. "誰が来ましたか" hỏi ai đến, "田中さんが来ました" trả lời — không dùng は được.'),

  g('か', 'ka', 'Trợ từ nghi vấn / lựa chọn', 'N5',
    'Đặt cuối câu để tạo câu hỏi. Đặt giữa hai danh từ để chỉ sự lựa chọn (A hoặc B).',
    'Câu + か / N + か + N',
    '雨ですか。', 'Trời mưa phải không?',
    'Trợ từ', 103),

  g('があります / がいます', 'ga arimasu / ga imasu', 'Diễn tả sự tồn tại', 'N5',
    'Biểu thị sự tồn tại. あります dùng cho vật vô tri; います dùng cho người và động vật — thứ tự di chuyển được.',
    'N + があります / N + がいます',
    '川があります。可愛い女の子がいます。', 'Có một dòng sông. Có một cô bé dễ thương.',
    'Tồn tại', 104,
    'Cây cối dùng あります dù là sinh vật sống, vì tiêu chí là "tự di chuyển được" chứ không phải "sống".'),

  g('から', 'kara', 'Bởi vì / từ (điểm xuất phát)', 'N5',
    'Liên từ chỉ nguyên nhân (bởi vì). Cũng là trợ từ chỉ điểm xuất phát về không gian hoặc thời gian (từ).',
    'Mệnh đề + から / N + から',
    '車で来ましたから。西からの風。', 'Vì tôi đến bằng ô tô. Gió thổi từ hướng Tây.',
    'Nguyên nhân', 105),

  g('くらい / ぐらい', 'kurai / gurai', 'Khoảng, xấp xỉ', 'N5',
    'Hậu tố biểu thị mức độ ước lượng về thời gian, khoảng cách hoặc số lượng.',
    'Số từ + くらい',
    '東京まで、３０分くらいです。', 'Đến Tokyo mất khoảng 30 phút.',
    'Ước lượng', 106),

  g('けど / けれども', 'kedo / keredomo', 'Tuy nhiên, nhưng mà', 'N5',
    'Liên từ nối hai mệnh đề mang ý nghĩa tương phản.',
    'Mệnh đề + けど + mệnh đề',
    '早く寝たけれども、まだ眠たいです。', 'Ngủ sớm nhưng vẫn thấy buồn ngủ.',
    'Liên từ', 107,
    'けど thân mật hơn けれども. Trong văn viết trang trọng nên dùng が.'),

  g('だ / です', 'da / desu', 'Trợ động từ khẳng định', 'N5',
    'Biểu thị sự khẳng định danh tính hoặc trạng thái (là). だ dùng trong văn thường, です dùng trong văn lịch sự.',
    'N + です',
    '猫です。', 'Đó là một con mèo.',
    'Cấu trúc cơ bản', 108),

  g('～たい', '~tai', 'Muốn làm gì', 'N5',
    'Hậu tố gắn vào động từ biểu thị mong muốn của chính người nói.',
    'V(masu bỏ ます) + たい',
    '何を食べたいですか。', 'Bạn muốn ăn gì?',
    'Mong muốn', 109,
    'Chỉ dùng cho ngôi thứ nhất (và ngôi thứ hai khi hỏi). Nói về mong muốn của người khác phải dùng ～たがっている.'),

  g('だけ', 'dake', 'Chỉ, duy nhất', 'N5',
    'Trợ từ biểu thị sự giới hạn, loại trừ mọi yếu tố khác.',
    'N + だけ',
    'これは水だけだ。', 'Đây chỉ là nước thôi.',
    'Giới hạn', 110),

  g('～たことがある', '~ta koto ga aru', 'Đã từng làm gì', 'N5',
    'Biểu thị một kinh nghiệm đã từng xảy ra trong quá khứ.',
    'V(thể た) + ことがある',
    '高い肉を食べたことがある。', 'Tôi đã từng ăn loại thịt đắt tiền.',
    'Kinh nghiệm', 111,
    'Nói về trải nghiệm hiếm, đáng kể. Không dùng cho việc thường ngày: "hôm qua tôi đã ăn cơm" không phải là kinh nghiệm.'),

  g('だろう / でしょう', 'darou / deshou', 'Có lẽ, phải không', 'N5',
    'Biểu thị sự suy đoán có căn cứ, hoặc dùng để xác nhận lại thông tin với người nghe.',
    'V/A/N + でしょう',
    'ペンがあるでしょう。', 'Chắc là có bút đấy.',
    'Suy đoán', 112),

  g('～つもり', '~tsumori', 'Dự định', 'N5',
    'Biểu thị ý định, kế hoạch đã được suy nghĩ từ trước.',
    'V(thể từ điển) + つもりだ',
    '日本に行くつもりだ。', 'Tôi dự định sẽ đi Nhật Bản.',
    'Ý định', 113),

  g('で', 'de', 'Tại (nơi diễn ra) / bằng (phương tiện)', 'N5',
    'Chỉ nơi diễn ra hành động, hoặc chỉ phương tiện, công cụ, nguyên liệu.',
    'N + で',
    'バスで帰る。', 'Về nhà bằng xe buýt.',
    'Trợ từ', 114,
    'Phân biệt với に: で là nơi HÀNH ĐỘNG diễn ra, に là nơi TỒN TẠI. 部屋で寝る (ngủ trong phòng) vs 部屋にいる (ở trong phòng).'),

  g('～ている', '~te iru', 'Đang làm / trạng thái kết quả', 'N5',
    'Biểu thị hành động đang diễn ra tại thời điểm nói, hoặc một trạng thái là kết quả của hành động trước đó.',
    'V(thể て) + いる',
    '何をしていますか。', 'Bạn đang làm gì vậy?',
    'Thì và thể', 115,
    'Với động từ chỉ sự thay đổi tức thời (結婚する, 死ぬ, 知る), ～ている chỉ TRẠNG THÁI chứ không phải hành động đang diễn ra: 結婚しています nghĩa là "đã có gia đình".'),

  g('～てから', '~te kara', 'Sau khi làm xong', 'N5',
    'Biểu thị trình tự thời gian nghiêm ngặt: hành động sau chỉ xảy ra khi hành động trước đã hoàn tất.',
    'V(thể て) + から',
    '映画を見てから、帰ります。', 'Sau khi xem phim xong, tôi sẽ về.',
    'Trình tự', 116),

  g('～てください', '~te kudasai', 'Xin hãy làm gì', 'N5',
    'Yêu cầu người khác thực hiện một hành động, giọng điệu nhẹ nhàng.',
    'V(thể て) + ください',
    '食べてください。', 'Xin hãy ăn đi.',
    'Yêu cầu', 117),

  g('～てはいけない', '~te wa ikenai', 'Không được phép làm', 'N5',
    'Cấm đoán mạnh mẽ, biểu thị việc không được phép làm theo quy định hoặc đạo lý.',
    'V(thể て) + はいけない',
    'ここに来てはいけない。', 'Không được phép đến đây.',
    'Cấm đoán', 118),

  g('～てもいい', '~te mo ii', 'Được phép làm', 'N5',
    'Biểu thị sự cho phép, cấp quyền thực hiện hành động.',
    'V(thể て) + もいい',
    '狭くてもいいです。', 'Hẹp một chút cũng không sao.',
    'Cho phép', 119),

  g('と', 'to', 'Và (nối danh từ) / cùng với', 'N5',
    'Nối các danh từ theo kiểu liệt kê đầy đủ, hoặc biểu thị đối tượng cùng thực hiện hành động.',
    'N + と + N',
    '友達と見る。', 'Xem cùng với bạn.',
    'Trợ từ', 120,
    'Khác với や: と liệt kê ĐẦY ĐỦ, や liệt kê chưa hết (còn nữa).'),

  g('な', 'na', 'Thể cấm đoán thô', 'N5',
    'Đặt cuối động từ nguyên dạng để tạo mệnh lệnh cấm, giọng rất thô.',
    'V(thể từ điển) + な',
    '泣くな。', 'Cấm khóc.',
    'Cấm đoán', 121,
    'Rất thô lỗ. Chỉ nghe thấy giữa bạn bè thân, trong phim hoặc lúc khẩn cấp. Người học không nên dùng.'),

  g('～ないでください', '~naide kudasai', 'Xin đừng làm gì', 'N5',
    'Dạng phủ định của yêu cầu lịch sự.',
    'V(thể ない bỏ い) + でください',
    '泣かないでください。', 'Xin đừng khóc.',
    'Yêu cầu', 122),

  g('なる', 'naru', 'Trở nên, trở thành', 'N5',
    'Biểu thị sự biến đổi trạng thái từ A sang B.',
    'N + になる / A(i bỏ い) + くなる',
    '病気になる。', 'Bị ốm.',
    'Biến đổi', 123),

  g('に / へ', 'ni / e', 'Đến (hướng di chuyển)', 'N5',
    'Chỉ hướng di chuyển hoặc điểm đến. へ nhấn mạnh phương hướng, に nhấn mạnh điểm chạm.',
    'N + に / N + へ',
    '駅に行く。', 'Đi đến nhà ga.',
    'Trợ từ', 124,
    'Trợ từ へ khi làm trợ từ đọc là "e" chứ không phải "he".'),

  g('～にいく', '~ni iku', 'Đi để làm gì', 'N5',
    'Biểu thị mục đích của sự di chuyển.',
    'V(masu bỏ ます) + にいく',
    'エレベーターで５かいにいく。', 'Đi thang máy để lên tầng 5.',
    'Mục đích', 125),

  g('～にする', '~ni suru', 'Quyết định chọn', 'N5',
    'Biểu thị sự quyết định, lựa chọn một phương án cụ thể.',
    'N + にする',
    'この音楽にする。', 'Tôi quyết định chọn bản nhạc này.',
    'Quyết định', 126),

  g('の', 'no', 'Sở hữu / danh từ hoá', 'N5',
    'Chỉ sự sở hữu hoặc thuộc tính. Cũng dùng để danh từ hoá động từ hoặc mệnh đề.',
    'N + の + N / V(thể từ điển) + の',
    '彼は走るのが速い。', 'Việc anh ấy chạy thì rất nhanh.',
    'Trợ từ', 127),

  g('～のが上手 / 下手 / 好き', '~no ga jouzu / heta / suki', 'Giỏi / kém / thích làm gì', 'N5',
    'Đánh giá năng lực hoặc sở thích đối với một hành động đã được danh từ hoá.',
    'V(thể từ điển) + のが + 上手/下手/好き',
    '彼女は歌うのが上手です。', 'Cô ấy hát giỏi.',
    'Đánh giá', 128,
    'Không tự khen mình 上手 — người Nhật coi đó là thiếu khiêm tốn. Nói về mình dùng 得意 hoặc chỉ nói 好き.'),

  g('ので', 'node', 'Vì (lịch sự, khách quan)', 'N5',
    'Chỉ nguyên nhân, sắc thái khách quan và lịch sự hơn から.',
    'Mệnh đề + ので',
    '太いので、走るのは遅い。', 'Vì béo nên chạy chậm.',
    'Nguyên nhân', 129,
    'Xin phép hoặc xin lỗi thì dùng ので, vì から nghe như đang biện hộ cho mình.'),

  g('は', 'wa', 'Trợ từ chủ đề', 'N5',
    'Dùng để đưa ra chủ đề của toàn bộ câu văn.',
    'N + は',
    'これは何ですか。', 'Cái này là cái gì?',
    'Trợ từ', 130,
    'Khi làm trợ từ, は đọc là "wa".'),

  g('～ほうがいい', '~hou ga ii', 'Nên làm gì', 'N5',
    'Đưa ra lời khuyên hoặc gợi ý, khuyên nên hoặc không nên làm gì để tránh hậu quả xấu.',
    'V(thể た) + ほうがいい',
    '靴を脱いだほうがいいです。', 'Nên cởi giày ra.',
    'Lời khuyên', 131),

  g('前に', 'mae ni', 'Trước khi', 'N5',
    'Chỉ vị trí phía trước, hoặc thời điểm trước khi một hành động xảy ra.',
    'V(thể từ điển) + 前に / N + の前に',
    '犬が門の前にいる。', 'Có một con chó ở trước cổng.',
    'Thời gian', 132,
    'Vế trước 前に luôn ở thể TỪ ĐIỂN dù cả câu nói về quá khứ.'),

  g('まだ / もう', 'mada / mou', 'Vẫn chưa / đã ... rồi', 'N5',
    'Trạng từ thời gian. まだ nghĩa là vẫn chưa, もう nghĩa là đã ... rồi.',
    'まだ + V(phủ định) / もう + V(quá khứ)',
    '娘はまだ起きていません。', 'Con gái tôi vẫn chưa dậy.',
    'Thời gian', 133),

  g('まで / も', 'made / mo', 'Đến tận / cũng', 'N5',
    'まで biểu thị điểm kết thúc. も biểu thị sự bao hàm, tương đồng.',
    'N + まで / N + も',
    '駅まで歩く。服も古い。', 'Đi bộ đến tận nhà ga. Quần áo cũng cũ.',
    'Trợ từ', 134),

  g('や', 'ya', 'Và (liệt kê chưa hết)', 'N5',
    'Nối các danh từ nhưng mang tính liệt kê không đầy đủ (và, vân vân).',
    'N + や + N + など',
    '鳥や馬が山にいました。', 'Trên núi có chim, ngựa và nhiều loài khác.',
    'Trợ từ', 135),

  g('～より～のほうが', '~yori ~no hou ga', 'So sánh hơn kém', 'N5',
    'So sánh hơn kém giữa hai chủ thể.',
    'A + より + B + のほうが + tính từ',
    '飛行機より電車のほうが遅いです。', 'Tàu hoả thì chậm hơn máy bay.',
    'So sánh', 136),

  g('～と / ～ば / ～たら', '~to / ~ba / ~tara', 'Nhóm câu điều kiện', 'N5',
    'Ba cấu trúc giả định. と cho điều kiện tất yếu, tự nhiên. ば cho giả định điều kiện. たら cho giả định về tương lai.',
    'V + と / ば / たら',
    '春になると、桜が咲きます。', 'Mùa xuân đến thì hoa anh đào nở.',
    'Điều kiện', 137,
    'Vế sau của と KHÔNG được là ý chí, mệnh lệnh hay rủ rê — と chỉ dùng cho quy luật tất yếu.'),

  g('～ほしい', '~hoshii', 'Muốn có / muốn ai làm gì', 'N5',
    'Biểu thị mong muốn sở hữu một sự vật, hoặc mong muốn người khác làm gì cho mình.',
    'N + がほしい / V(thể て) + ほしい',
    '私はあなたに手伝ってほしいです。', 'Tôi muốn bạn giúp tôi.',
    'Mong muốn', 138),
];

// ---------------------------------------------------------------------------
// N4 — phần tài liệu có liệt kê
// ---------------------------------------------------------------------------
export const GRAMMAR_N4: GrammarSeed[] = [
  g('間 / 間に', 'aida / aida ni', 'Trong khi / trong lúc', 'N4',
    'Trong suốt khoảng thời gian A thì B xảy ra.',
    'V(thể ている) + 間 / 間に',
    '母が寝ている間に、掃除をしました。', 'Trong lúc mẹ đang ngủ, tôi đã dọn dẹp.',
    'Thời gian', 201,
    '間 dùng khi hành động B kéo dài song song suốt khoảng thời gian đó. 間に dùng khi B xảy ra và kết thúc gọn trong khoảng đó. Đây là điểm phân biệt hay bị hỏi trong đề thi.'),

  g('あまり～ない', 'amari ~nai', 'Không ... lắm', 'N4',
    'Phủ định bán phần, giảm nhẹ mức độ của trạng thái hoặc hành động.',
    'あまり + V/A (thể phủ định)',
    'この料理はあまり辛くないです。', 'Món này không cay lắm.',
    'Mức độ', 202,
    'Bắt buộc đi với thể phủ định. Dùng với thể khẳng định là sai ngữ pháp.'),

  g('後で', 'ato de', 'Sau khi / lát nữa', 'N4',
    'Chỉ định trình tự thời gian: hành động sau diễn ra sau khi hành động trước kết thúc.',
    'V(thể た) + 後で / N + の後で',
    '仕事の後で、飲みに行きませんか。', 'Sau giờ làm, đi uống một chút nhé?',
    'Trình tự', 203),

  g('ば / 場合', 'ba / baai', 'Nếu / trong trường hợp', 'N4',
    'ば là thể điều kiện giả định. 場合 dùng để thiết lập một bối cảnh cụ thể rồi đưa ra hướng giải quyết.',
    'V(thể ば) / N + の場合',
    '雨の場合は、中止します。', 'Trong trường hợp trời mưa thì sẽ huỷ.',
    'Điều kiện', 204),

  g('ばかり', 'bakari', 'Chỉ toàn là / vừa mới xong', 'N4',
    'Biểu thị sự lặp đi lặp lại của một hành động, hoặc chỉ một hành động vừa mới hoàn tất theo cảm nhận chủ quan của người nói.',
    'V(thể た) + ばかり / N + ばかり',
    '彼はゲームばかりしている。', 'Nó chỉ toàn chơi game.',
    'Mức độ', 205,
    'Khác với ～たところ: ばかり phụ thuộc CẢM NHẬN của người nói (có thể đã một tháng vẫn nói "vừa mới"), còn ～たところ bám vào thời gian vật lý thật.'),

  g('出す', 'dasu', 'Đột nhiên bắt đầu', 'N4',
    'Động từ phụ trợ gắn sau động từ chính, biểu thị sự bùng phát đột ngột và thường là không kiểm soát được.',
    'V(masu bỏ ます) + 出す',
    '急に雨が降り出した。', 'Trời đột nhiên đổ mưa.',
    'Thể động từ', 206,
    'Không dùng cho hành động có chủ ý của chính mình. "Tôi bắt đầu học" phải dùng 始める.'),

  g('でございます', 'de gozaimasu', 'Là (cực kỳ trang trọng)', 'N4',
    'Biểu hiện trang trọng tuyệt đối của です, dùng trong dịch vụ khách hàng hoặc thông báo công cộng chính thức.',
    'N + でございます',
    'こちらが会議室でございます。', 'Đây là phòng họp ạ.',
    'Kính ngữ', 207),

  g('でも', 'demo', 'Hay là / cho dù', 'N4',
    'Gợi ý một ví dụ không mang tính ép buộc, hoặc mang nghĩa nhượng bộ.',
    'N + でも',
    'お茶でも飲みませんか。', 'Hay là mình uống trà nhé?',
    'Gợi ý', 208,
    'Sắc thái "đại loại thế, không nhất thiết phải đúng thứ đó" — cách rủ rê rất nhẹ nhàng, không tạo áp lực cho người nghe.'),
];

// ---------------------------------------------------------------------------
// N3 — phần tài liệu có liệt kê
// ---------------------------------------------------------------------------
export const GRAMMAR_N3: GrammarSeed[] = [
  g('～上げる', '~ageru', 'Hoàn thành trọn vẹn', 'N3',
    'Hậu tố động từ biểu thị sự hoàn thành dứt điểm một quá trình mang tính chế tạo, sáng tác.',
    'V(masu bỏ ます) + 上げる',
    '小説を書き上げた。', 'Tôi đã viết xong cuốn tiểu thuyết.',
    'Thể động từ', 301),

  g('～合う', '~au', 'Làm gì đó lẫn nhau', 'N3',
    'Hậu tố động từ mang ý nghĩa tương tác qua lại, hai chủ thể cùng tác động lẫn nhau.',
    'V(masu bỏ ます) + 合う',
    '意見を出し合いましょう。', 'Chúng ta cùng đưa ra ý kiến với nhau nhé.',
    'Thể động từ', 302),

  g('あまり / あまりにも', 'amari / amari ni mo', 'Vì quá ... nên', 'N3',
    'Chỉ nguyên nhân bắt nguồn từ một trạng thái thái quá, dẫn tới kết quả thường là tiêu cực hoặc mất kiểm soát.',
    'N + のあまり / A + あまり',
    '嬉しさのあまり、泣いてしまった。', 'Vì quá vui nên tôi đã bật khóc.',
    'Nguyên nhân', 303,
    'Đừng nhầm với あまり～ない của N4 — cùng một từ nhưng chức năng ngược hẳn nhau.'),

  g('～ばいい', '~ba ii', 'Chỉ cần làm ... là được', 'N3',
    'Đưa ra lời khuyên hoặc gợi ý một giải pháp lý tưởng cho vấn đề.',
    'V(thể ば) + いい',
    '分からなければ、先生に聞けばいい。', 'Không hiểu thì cứ hỏi thầy là được.',
    'Lời khuyên', 304),

  g('ばかりで / ばかりでなく', 'bakari de / bakari de naku', 'Chỉ toàn / không chỉ ... mà còn', 'N3',
    'ばかりで diễn tả sự lặp lại của một trạng thái tiêu cực. ばかりでなく là liên từ tăng tiến, bổ sung thêm thông tin.',
    'N/V + ばかりでなく',
    '彼は日本語ばかりでなく、英語も話せる。', 'Anh ấy không chỉ nói được tiếng Nhật mà còn nói được tiếng Anh.',
    'Liên từ', 305),

  g('べきだ / べきではない', 'beki da / beki de wa nai', 'Nên / không nên (về đạo lý)', 'N3',
    'Diễn tả nghĩa vụ, bổn phận hoặc phán xét mạnh mẽ dựa trên đạo đức, lẽ thường hoặc quy định xã hội.',
    'V(thể từ điển) + べきだ',
    '約束は守るべきだ。', 'Đã hứa thì phải giữ lời.',
    'Nghĩa vụ', 306,
    'する thành するべき hoặc すべき — cả hai đều đúng, dạng すべき trang trọng hơn.'),

  g('別に～ない', 'betsu ni ~nai', 'Không hẳn là', 'N3',
    'Phủ định một sự mong đợi hoặc phán đoán của người đối diện một cách nhẹ nhàng.',
    '別に + V/A (thể phủ định)',
    '別に嫌いじゃないよ。', 'Không hẳn là tôi ghét đâu.',
    'Mức độ', 307),

  g('ぶりに', 'buri ni', 'Lần đầu tiên sau khoảng ...', 'N3',
    'Biểu thị cảm xúc về một sự kiện lặp lại sau khoảng thời gian dài bị gián đoạn.',
    'Khoảng thời gian + ぶりに',
    '３年ぶりに故郷へ帰った。', 'Sau ba năm tôi mới về lại quê.',
    'Thời gian', 308),

  g('中 (ちゅう / じゅう)', 'chuu / juu', 'Đang trong / khắp, suốt', 'N3',
    'Hậu tố không gian và thời gian. ちゅう diễn tả trạng thái đang tiến hành. じゅう diễn tả sự lan toả khắp không gian hoặc suốt thời gian.',
    'N + 中',
    '会議中です。町中が大騒ぎだ。', 'Đang họp. Cả thị trấn náo loạn.',
    'Thời gian', 309,
    'Cùng một chữ Hán nhưng hai cách đọc mang hai nghĩa khác nhau — đề thi rất hay khai thác điểm này.'),

  g('だけあって', 'dake atte', 'Quả đúng là ... xứng đáng với', 'N3',
    'Diễn tả sự khen ngợi: kết quả hoàn toàn xứng đáng với bản chất hoặc nỗ lực đã bỏ ra.',
    'N/V + だけあって',
    '毎日練習しただけあって、上手になった。', 'Quả đúng là đã luyện tập mỗi ngày nên giỏi hẳn lên.',
    'Đánh giá', 310,
    'Chỉ dùng cho kết quả TÍCH CỰC. Kết quả xấu thì dùng cấu trúc khác.'),

  g('だらけ', 'darake', 'Đầy rẫy toàn là', 'N3',
    'Hậu tố gắn vào danh từ, biểu thị trạng thái bị bao phủ đầy rẫy bởi những thứ không mong muốn.',
    'N + だらけ',
    'この作文は間違いだらけだ。', 'Bài văn này sai đầy rẫy.',
    'Mức độ', 311,
    'Luôn mang sắc thái TIÊU CỰC: bùn, rác, lỗi, máu. Không nói 花だらけ để khen hoa nhiều.'),

  g('どんなに～ても', 'donna ni ~te mo', 'Cho dù đến mấy đi nữa', 'N3',
    'Nhượng bộ cực đoan, khẳng định kết quả không thay đổi bất chấp điều kiện khắc nghiệt tới đâu.',
    'どんなに + V(thể て) + も',
    'どんなに頑張っても、間に合わない。', 'Cho dù cố gắng đến mấy cũng không kịp.',
    'Nhượng bộ', 312),
];

// ---------------------------------------------------------------------------
// N2 — phần tài liệu có liệt kê
// ---------------------------------------------------------------------------
export const GRAMMAR_N2: GrammarSeed[] = [
  g('あげく', 'ageku', 'Rốt cuộc thì (kết quả xấu)', 'N2',
    'Chỉ kết quả mang tính bi kịch: một kết cục tồi tệ sau quá trình dài nỗ lực, đắn đo hoặc chịu đựng phiền toái.',
    'V(thể た) + あげく',
    '長時間悩んだあげく、諦めた。', 'Sau khi trăn trở rất lâu, rốt cuộc tôi đã bỏ cuộc.',
    'Kết quả', 401,
    'Vế sau bắt buộc là kết quả TIÊU CỰC. Kết quả tốt thì dùng 末に.'),

  g('あるいは', 'aruiwa', 'Hoặc là, có khả năng là', 'N2',
    'Liên từ học thuật kết nối các mệnh đề, biểu thị các khả năng tương đương hoặc lựa chọn thay thế trong văn bản phân tích.',
    'A あるいは B',
    'メールあるいは電話でご連絡ください。', 'Xin liên hệ qua email hoặc điện thoại.',
    'Liên từ', 402),

  g('ばかりか', 'bakari ka', 'Không chỉ ... mà còn', 'N2',
    'Liên từ tăng tiến: không những bao hàm yếu tố A mà còn lan rộng sang yếu tố B, thường có quy mô lớn hơn hoặc tệ hơn.',
    'N/V + ばかりか',
    '彼は遅刻したばかりか、謝りもしなかった。', 'Nó không chỉ đi muộn mà còn chẳng thèm xin lỗi.',
    'Liên từ', 403),

  g('ばかりに', 'bakari ni', 'Chỉ vì ... mà dẫn đến cơ sự', 'N2',
    'Chỉ nguyên nhân duy nhất dẫn đến hậu quả tiêu cực hoặc sự hối hận, nhấn mạnh vào sự tự trách.',
    'V/A + ばかりに',
    '嘘をついたばかりに、信用を失った。', 'Chỉ vì nói dối mà tôi mất hết lòng tin của mọi người.',
    'Nguyên nhân', 404,
    'Khác với ばかりか ở ngay một chữ cuối nhưng nghĩa hoàn toàn khác — một chỗ gài bẫy kinh điển của đề N2.'),

  g('ちなみに', 'chinami ni', 'Nhân tiện, nói thêm', 'N2',
    'Liên từ chuyển hướng hội thoại hoặc bổ sung thông tin phụ trợ có liên quan trực tiếp đến chủ đề vừa đề cập.',
    'ちなみに + câu',
    'ちなみに、この店は日曜休みです。', 'Nhân tiện, quán này nghỉ Chủ nhật.',
    'Liên từ', 405),

  g('ちっとも～ない', 'chittomo ~nai', 'Hoàn toàn không một chút nào', 'N2',
    'Phó từ kết hợp với thể phủ định tuyệt đối, nhấn mạnh sự hoàn toàn không có một chút nào của trạng thái hay cảm xúc.',
    'ちっとも + V/A (thể phủ định)',
    'ちっとも面白くない。', 'Chẳng thú vị một chút nào.',
    'Mức độ', 406),

  g('だって', 'datte', 'Bởi vì mà (biện minh)', 'N2',
    'Liên từ dùng ở đầu câu để biện minh, đưa ra lý do. Thường dùng trong văn nói mang tính phàn nàn hoặc nũng nịu.',
    'だって + lý do',
    'だって、疲れていたんだもん。', 'Tại vì em mệt mà.',
    'Liên từ', 407,
    'Rất thân mật. Dùng với cấp trên là thất lễ.'),

  g('でしかない', 'de shika nai', 'Chỉ đơn thuần là', 'N2',
    'Khẳng định bản chất tầm thường, vô giá trị hoặc giới hạn cuối cùng của một sự vật, bác bỏ mọi kỳ vọng cao hơn.',
    'N + でしかない',
    'それは言い訳でしかない。', 'Đó chỉ là cái cớ mà thôi.',
    'Đánh giá', 408),

  g('どころか', 'dokoro ka', 'Nói gì đến ... trái lại còn', 'N2',
    'Bác bỏ hoàn toàn vế trước và đưa ra sự thật ở vế sau với mức độ khác hẳn, có thể tốt hơn hoặc tệ hơn nhiều.',
    'N/V/A + どころか',
    '謝るどころか、逆に怒り出した。', 'Nói gì đến xin lỗi, nó còn quay ra nổi giận.',
    'Liên từ', 409),

  g('どうやら', 'douyara', 'Có vẻ như là', 'N2',
    'Phó từ biểu thị sự suy đoán dựa trên cảm nhận khách quan, hoặc diễn tả một kết quả đạt được một cách khó khăn.',
    'どうやら + câu + ようだ/らしい',
    'どうやら道に迷ったようだ。', 'Có vẻ như chúng ta lạc đường rồi.',
    'Suy đoán', 410),

  g('～かねる / ～かねない', '~kaneru / ~kanenai', 'Không thể làm được / rất có thể xảy ra', 'N2',
    'かねる nghĩa là không thể làm được vì rào cản tâm lý. かねない nghĩa là rất có thể sẽ xảy ra một hậu quả xấu.',
    'V(masu bỏ ます) + かねる / かねない',
    'その件については、お答えしかねます。', 'Về việc đó, chúng tôi khó lòng trả lời được.',
    'Khả năng', 411,
    'Hai mẫu này nhìn gần như giống hệt nhau nhưng nghĩa gần như ngược nhau — trọng điểm ôn luyện của N2.'),
];

// ---------------------------------------------------------------------------
// N1 — phần tài liệu có liệt kê
// ---------------------------------------------------------------------------
export const GRAMMAR_N1: GrammarSeed[] = [
  g('敢えて', 'aete', 'Dám, cố tình (dù biết khó)', 'N1',
    'Trạng từ biểu thị sự táo bạo, cố tình thực hiện một hành động rủi ro, không cần thiết hoặc gây tranh cãi để đạt mục đích.',
    '敢えて + V',
    '敢えて苦言を呈します。', 'Tôi xin mạn phép nói thẳng điều khó nghe.',
    'Trạng từ', 501),

  g('あくまでも', 'akumademo', 'Cho đến cùng, tuyệt đối là', 'N1',
    'Trạng từ nhấn mạnh sự kiên định tuyệt đối, giữ vững lập trường cho đến cùng, không khoan nhượng.',
    'あくまでも + N/V',
    'あくまでも個人的な意見です。', 'Đây tuyệt đối chỉ là ý kiến cá nhân.',
    'Trạng từ', 502),

  g('案の定', 'an no jou', 'Quả đúng như dự đoán', 'N1',
    'Trạng từ chỉ kết quả xảy ra đúng y như đã dự đoán từ trước, thường mang sắc thái tiêu cực.',
    '案の定 + câu',
    '案の定、彼は遅刻した。', 'Y như rằng, nó đến muộn.',
    'Trạng từ', 503),

  g('あらかじめ', 'arakajime', 'Chuẩn bị sẵn từ trước', 'N1',
    'Trạng từ chỉ sự chuẩn bị, thực hiện một hành động từ trước để đón đầu sự kiện trong tương lai.',
    'あらかじめ + V',
    'あらかじめご了承ください。', 'Kính mong quý vị thông cảm trước.',
    'Trạng từ', 504),

  g('～あっての', '~atte no', 'Chính vì có ... nên mới có', 'N1',
    'Nhấn mạnh sự phụ thuộc tuyệt đối: sự tồn tại hoặc thành công của B hoàn toàn nhờ vào A.',
    'N + あっての + N',
    'お客様あっての商売です。', 'Có khách hàng thì mới có công việc kinh doanh.',
    'Phụ thuộc', 505),

  g('～べからず / ～べからざる', '~bekarazu / ~bekarazaru', 'Tuyệt đối cấm', 'N1',
    'Lệnh cấm đoán cực kỳ cứng rắn, mang tính luật pháp, quy định nghiêm ngặt hoặc cấm kỵ đạo đức.',
    'V(thể từ điển) + べからず',
    '芝生に入るべからず。', 'Cấm giẫm lên bãi cỏ.',
    'Cấm đoán', 506,
    'Văn phong cổ, hầu như chỉ gặp trên biển cảnh báo và văn bản quy định.'),

  g('～べく / ～べくして / ～べくもない', '~beku / ~beku shite / ~beku mo nai', 'Để / tất yếu / không thể nào', 'N1',
    'べく chỉ mục đích cao cả. べくして chỉ kết quả tất yếu của lịch sử hoặc tự nhiên. べくもない là phủ định hoàn toàn khả năng.',
    'V(thể từ điển) + べく',
    '真実を知るべく、調査を続けた。', 'Để biết được sự thật, tôi tiếp tục điều tra.',
    'Mục đích', 507),

  g('～びる / ～ぶる', '~biru / ~buru', 'Có vẻ như / cố tỏ vẻ', 'N1',
    'Hậu tố gắn vào danh từ hoặc tính từ. びる mang nghĩa trông có vẻ giống nhưng thực tế không phải. ぶる mang nghĩa cố tình tỏ vẻ, ra vẻ.',
    'N + びる / ぶる',
    '彼は偉ぶった態度を取る。', 'Anh ta có thái độ ra vẻ ta đây.',
    'Hậu tố', 508,
    'ぶる luôn mang sắc thái chê bai người bị nói tới.'),

  g('～だに / ～だにしない', '~dani / ~dani shinai', 'Chỉ cần nghĩ tới đã / hoàn toàn không mảy may', 'N1',
    'Nhấn mạnh sự cực đoan: chỉ cần nghĩ đến thôi đã thấy sợ, hoặc hoàn toàn không mảy may suy nghĩ, để ý.',
    'V(thể từ điển) + だに',
    '想像だにしなかった結果だ。', 'Đó là kết quả tôi chưa từng mảy may tưởng tượng tới.',
    'Nhấn mạnh', 509),

  g('～であれ～であれ', '~de are ~de are', 'Bất kể là A hay B', 'N1',
    'Liên từ biểu thị sự không phân biệt đối xử giữa các lựa chọn, kết quả vẫn như vậy.',
    'N + であれ + N + であれ',
    '大人であれ子供であれ、規則は同じだ。', 'Bất kể người lớn hay trẻ em, quy định đều như nhau.',
    'Nhượng bộ', 510),

  g('～でもあり～でもある', '~de mo ari ~de mo aru', 'Vừa là ... lại cũng vừa là', 'N1',
    'Khẳng định sự tồn tại song song của hai thuộc tính tưởng chừng đối lập trong cùng một chủ thể.',
    'N + でもあり + N + でもある',
    '彼は医者でもあり、作家でもある。', 'Ông ấy vừa là bác sĩ, lại cũng vừa là nhà văn.',
    'Song song', 511),

  g('～どうにも～ない', '~dou ni mo ~nai', 'Dù làm mọi cách cũng không thể', 'N1',
    'Diễn tả sự bất lực tuyệt đối trước một tình huống, dù huy động mọi nguồn lực cũng không lay chuyển được.',
    'どうにも + V(thể phủ định)',
    'どうにも納得できない。', 'Dù thế nào tôi cũng không thể chấp nhận được.',
    'Bất lực', 512),

  g('～だろうに', '~darou ni', 'Đáng lẽ ra đã ... thế mà', 'N1',
    'Biểu thị sự nuối tiếc sâu sắc về một kết quả đáng lẽ đã khác đi nếu điều kiện trong quá khứ thay đổi.',
    'V/A + だろうに',
    '早く言えば助かっただろうに。', 'Đáng lẽ nói sớm thì đã cứu được rồi, thế mà...',
    'Nuối tiếc', 513),
];

export const ALL_GRAMMAR: GrammarSeed[] = [
  ...GRAMMAR_N5_EXTRA,
  ...GRAMMAR_N4,
  ...GRAMMAR_N3,
  ...GRAMMAR_N2,
  ...GRAMMAR_N1,
];
