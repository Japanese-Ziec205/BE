/**
 * Kanji cấp độ N5 — 112 chữ.
 *
 * Trường `sinoVietnamese` (âm Hán-Việt) là lợi thế riêng của người học Việt Nam:
 * biết 休 = HƯU thì liên hệ ngay "nghỉ hưu, hưu trí", nhớ nhanh hơn nhiều so với
 * học qua tiếng Anh. Vì vậy trường này bắt buộc phải có.
 *
 * Định dạng: ký tự|Hán-Việt|số nét|nghĩa tiếng Việt|âm On|âm Kun|bộ thủ|thành phần|mẹo nhớ
 * Âm Kun ghi kèm okurigana trong ngoặc: やす(む)
 */
const RAW = `
日|NHẬT|4|mặt trời, ngày|ニチ,ジツ|ひ,か|日||Hình mặt trời có chấm ở giữa
一|NHẤT|1|một|イチ,イツ|ひと(つ)|一||Một nét ngang duy nhất
国|QUỐC|8|đất nước|コク|くに|囗|囗,玉|Viên ngọc 玉 quý được vây 囗 lại thành ĐẤT NƯỚC
人|NHÂN|2|người|ジン,ニン|ひと|人||Hình người đang dang hai chân bước đi
年|NIÊN|6|năm|ネン|とし|干||Cây lúa chín một lần là hết một NĂM
大|ĐẠI|3|to lớn|ダイ,タイ|おお(きい)|大||Người dang rộng cả tay lẫn chân cho thật TO
十|THẬP|2|mười|ジュウ|とお|十||Hai nét bắt chéo như chữ thập, số MƯỜI
二|NHỊ|2|hai|ニ|ふた(つ)|二||Hai nét ngang, nét dưới dài hơn
本|BẢN|5|gốc, quyển sách|ホン|もと|木|木|Cây 木 có vạch ở GỐC rễ
中|TRUNG|4|ở giữa|チュウ|なか|丨|口,丨|Một nét sổ xuyên qua GIỮA cái khung
長|TRƯỜNG|8|dài, trưởng|チョウ|なが(い)|長||Tóc DÀI của người già rủ xuống
出|XUẤT|5|ra, đi ra|シュツ|で(る),だ(す)|凵|山|Hai ngọn núi chồng lên, mầm cây trồi RA
三|TAM|3|ba|サン|みっ(つ)|一||Ba nét ngang
時|THỜI|10|thời gian, giờ|ジ|とき|日|日,寺|Mặt trời 日 trên chùa 寺 báo THỜI khắc
行|HÀNH|6|đi, thi hành|コウ,ギョウ|い(く),おこな(う)|行||Ngã tư đường, nơi người ta ĐI qua
見|KIẾN|7|nhìn thấy|ケン|み(る)|見|目,儿|Con mắt 目 đặt trên đôi chân 儿 để đi NHÌN
月|NGUYỆT|4|mặt trăng, tháng|ゲツ,ガツ|つき|月||Hình trăng lưỡi liềm
後|HẬU|9|sau|ゴ,コウ|あと,うし(ろ)|彳|彳,幺,夂|Bước nhỏ 彳 rồi kéo lê chân, nên đi SAU
前|TIỀN|9|trước|ゼン|まえ|刀|丷,月,刂|Dùng dao cắt phần phía TRƯỚC
生|SINH|5|sống, sinh ra|セイ,ショウ|い(きる),う(まれる)|生||Mầm cây nhú lên khỏi mặt đất, SỰ SỐNG
五|NGŨ|4|năm (số 5)|ゴ|いつ(つ)|二||Giữa hai vạch trời đất có nét xoắn
間|GIAN|12|khoảng, giữa|カン,ケン|あいだ|門|門,日|Mặt trời 日 lọt qua khe cửa 門, đó là KHOẢNG hở
上|THƯỢNG|3|trên|ジョウ|うえ,あ(がる)|一||Vạch mốc, phần nhô lên là TRÊN
東|ĐÔNG|8|phía đông|トウ|ひがし|木|木,日|Mặt trời 日 mắc trên cây 木 lúc mọc hướng ĐÔNG
四|TỨ|5|bốn|シ|よっ(つ)|囗||Cái miệng 囗 có hai chân bên trong
今|KIM|4|bây giờ|コン,キン|いま|人|人|Mái che 人 trùm lên khoảnh khắc HIỆN TẠI
金|KIM|8|vàng, kim loại|キン|かね|金||Kho báu chôn dưới mái nhà
九|CỬU|2|chín|キュウ,ク|ここの(つ)|乙||Nét móc cong như số 9
入|NHẬP|2|vào|ニュウ|はい(る),い(れる)|入||Mũi tên chúc xuống, chỉ hướng đi VÀO
学|HỌC|8|học|ガク|まな(ぶ)|子|子|Đứa trẻ 子 dưới mái nhà đang HỌC
高|CAO|10|cao, đắt|コウ|たか(い)|高||Hình toà tháp nhiều tầng, rất CAO
円|VIÊN|4|tròn, đồng yên|エン|まる(い)|冂||Khung tròn, đơn vị tiền Nhật
子|TỬ|3|con, đứa trẻ|シ,ス|こ|子||Hình em bé quấn tã, dang hai tay
外|NGOẠI|5|bên ngoài|ガイ|そと|夕|夕,卜|Bói toán 卜 buổi tối 夕 phải ra NGOÀI sân
八|BÁT|2|tám|ハチ|やっ(つ)|八||Hai nét chia ra hai bên
六|LỤC|4|sáu|ロク|むっ(つ)|八||Mái nhà có hai chân
下|HẠ|3|dưới|カ,ゲ|した,さ(がる)|一||Vạch mốc, phần thõng xuống là DƯỚI
来|LAI|7|đến|ライ|く(る)|木|木|Cây lúa chín, người ta ĐẾN gặt
気|KHÍ|6|khí, tinh thần|キ,ケ|-|气|气|Hơi nước bốc lên từ nồi cơm
小|TIỂU|3|nhỏ|ショウ|ちい(さい),こ|小||Một vật bị chẻ nhỏ ra hai bên
七|THẤT|2|bảy|シチ|なな(つ)|一||Nét ngang cắt nét móc
山|SƠN|3|núi|サン|やま|山||Ba đỉnh núi nhô lên
話|THOẠI|13|nói chuyện|ワ|はな(す)|言|言,舌|Lời nói 言 phát ra từ cái lưỡi 舌
女|NỮ|3|đàn bà|ジョ|おんな|女||Hình người phụ nữ ngồi khoanh chân
北|BẮC|5|phía bắc|ホク|きた|匕||Hai người quay lưng vào nhau, tránh gió BẮC
午|NGỌ|4|giữa trưa|ゴ|-|十||Cây kim đồng hồ chỉ đúng GIỮA TRƯA
百|BÁCH|6|trăm|ヒャク|-|白|一,白|Một 一 trăm cái màu trắng 白
書|THƯ|10|viết, sách|ショ|か(く)|曰|聿,曰|Cây bút 聿 đặt trên trang giấy, đang VIẾT
先|TIÊN|6|trước, đầu tiên|セン|さき|儿|儿|Bàn chân bước lên TRƯỚC
名|DANH|6|tên|メイ|な|口|夕,口|Buổi tối 夕 tối quá, phải dùng miệng 口 xưng TÊN
川|XUYÊN|3|sông|セン|かわ|川||Ba dòng nước chảy song song
千|THIÊN|3|nghìn|セン|ち|十|十|Chữ thập 十 có thêm nét phẩy, thành NGHÌN
水|THUỶ|4|nước|スイ|みず|水||Dòng nước chảy có nhánh hai bên
半|BÁN|5|một nửa|ハン|なか(ば)|十|八,十|Chia 八 số mười 十 làm hai, còn MỘT NỬA
男|NAM|7|đàn ông|ダン,ナン|おとこ|田|田,力|Người dùng sức 力 làm ruộng 田 là ĐÀN ÔNG
西|TÂY|6|phía tây|セイ,サイ|にし|襾||Con chim về tổ khi mặt trời lặn hướng TÂY
電|ĐIỆN|13|điện|デン|-|雨|雨,田|Sấm sét trong mưa 雨 chính là ĐIỆN
校|HIỆU|10|trường học|コウ|-|木|木,交|Cây 木 giao nhau 交 tạo hàng rào TRƯỜNG học
語|NGỮ|14|ngôn ngữ|ゴ|かた(る)|言|言,五,口|Lời nói 言 của năm 五 cái miệng 口 thành NGÔN NGỮ
土|THỔ|3|đất|ド,ト|つち|土||Mầm cây nhú lên từ mặt ĐẤT
何|HÀ|7|cái gì|カ|なに,なん|人|亻,可|Người 亻 hỏi có thể 可 làm GÌ
南|NAM|9|phía nam|ナン|みなみ|十||Cái lều mở về hướng NAM ấm áp
万|VẠN|3|vạn, mười nghìn|マン,バン|-|一||Nét gấp đơn giản, chỉ số rất lớn
毎|MỖI|6|mỗi, hằng|マイ|-|毋|毋|Người mẹ 母 chăm con MỖI ngày
白|BẠCH|5|màu trắng|ハク|しろ(い)|白|日|Tia nắng đầu tiên chiếu lên, sáng TRẮNG
天|THIÊN|4|trời|テン|-|大|一,大|Người to lớn 大 đứng dưới vạch TRỜI 一
母|MẪU|5|mẹ|ボ|はは|毋||Hình người mẹ với hai bầu sữa
火|HOẢ|4|lửa|カ|ひ|火||Ngọn lửa bùng lên có tàn bay hai bên
右|HỮU|5|bên phải|ウ,ユウ|みぎ|口|口|Tay 𠂇 đưa lên miệng 口, tay PHẢI để ăn
読|ĐỘC|14|đọc|ドク|よ(む)|言|言,売|Lời nói 言 bán 売 ra ngoài, tức là ĐỌC lên
友|HỮU|4|bạn|ユウ|とも|又|又|Hai bàn tay 又 nắm lấy nhau là BẠN bè
左|TẢ|5|bên trái|サ|ひだり|工|工|Tay cầm dụng cụ 工, tay TRÁI giữ đồ
休|HƯU|6|nghỉ ngơi|キュウ|やす(む)|人|亻,木|Người 亻 tựa vào gốc cây 木 để NGHỈ NGƠI
父|PHỤ|4|cha|フ|ちち|父||Hình bàn tay cầm cây roi dạy con
雨|VŨ|8|mưa|ウ|あめ|雨||Những giọt nước rơi từ đám mây
車|XA|7|xe|シャ|くるま|車||Hình chiếc xe nhìn từ trên xuống
言|NGÔN|7|lời nói|ゲン|い(う)|言||Âm thanh phát ra từ miệng 口
花|HOA|7|bông hoa|カ|はな|艸|艹,化|Cỏ 艹 biến hoá 化 thành bông HOA
食|THỰC|9|ăn|ショク|た(べる)|食||Mái nhà che mâm cơm, giờ ĂN cơm
書|THƯ|10|viết|ショ|か(く)|曰|聿,曰|Cầm bút viết lên giấy
天|THIÊN|4|trời|テン|あま|大||Bầu trời trên đầu người
魚|NGƯ|11|con cá|ギョ|さかな|魚||Hình con cá có đầu, vảy và đuôi
茶|TRÀ|9|trà|チャ,サ|-|艸|艹,人,木|Lá cỏ 艹 người 人 hái từ cây 木 để pha TRÀ
新|TÂN|13|mới|シン|あたら(しい)|斤|立,木,斤|Dùng rìu 斤 đốn cây 木 làm ra đồ MỚI
安|AN|6|yên ổn, rẻ|アン|やす(い)|宀|宀,女|Người phụ nữ 女 trong nhà 宀 thì YÊN ỔN
古|CỔ|5|cũ|コ|ふる(い)|口|十,口|Chuyện truyền qua mười 十 miệng 口 là chuyện CŨ
店|ĐIẾM|8|cửa hàng|テン|みせ|广|广,占|Dưới mái nhà 广 chiếm 占 chỗ mở CỬA HÀNG
駅|DỊCH|14|nhà ga|エキ|-|馬|馬,尺|Nơi ngựa 馬 dừng nghỉ, chính là NHÀ GA
道|ĐẠO|12|con đường|ドウ|みち|辵|辶,首|Cái đầu 首 đi 辶 về phía trước trên CON ĐƯỜNG
社|XÃ|7|công ty, đền|シャ|やしろ|示|礻,土|Thần 礻 của đất 土, nơi thờ cúng của cộng đồng
会|HỘI|6|gặp gỡ|カイ|あ(う)|人|人,云|Người tụ dưới mái nhà để GẶP nhau
買|MÃI|12|mua|バイ|か(う)|貝|罒,貝|Dùng lưới 罒 gom vỏ sò 貝 (tiền) đi MUA
売|MẠI|7|bán|バイ|う(る)|士|士,冗|Người bày hàng ra BÁN
牛|NGƯU|4|con bò|ギュウ|うし|牛||Hình đầu bò có hai sừng
半|BÁN|5|nửa|ハン|なか(ば)|十||Chia đôi thành hai nửa bằng nhau
毎|MỖI|6|mỗi|マイ|-|毋||Lặp lại đều đặn MỖI lần
週|CHU|11|tuần|シュウ|-|辵|辶,周|Đi 辶 hết một vòng 周 là một TUẦN
曜|DIỆU|18|ngày trong tuần|ヨウ|-|日|日,羽,隹|Mặt trời 日 và chim 隹 đánh dấu các NGÀY
月|NGUYỆT|4|tháng|ゲツ|つき|月||Trăng tròn một lần là một THÁNG
分|PHÂN|4|phút, chia|フン,ブン|わ(ける)|刀|八,刀|Dùng dao 刀 chia 八 ra thành phần
聞|VĂN|14|nghe|ブン|き(く)|耳|門,耳|Áp tai 耳 vào cửa 門 để NGHE ngóng
立|LẬP|5|đứng|リツ|た(つ)|立||Người ĐỨNG trên mặt đất
歩|BỘ|8|bước đi|ホ|ある(く)|止|止,少|Dừng 止 rồi lại đi tiếp từng BƯỚC
早|TẢO|6|sớm|ソウ|はや(い)|日|日,十|Mặt trời 日 vừa lên khỏi ngọn cỏ, còn SỚM
午|NGỌ|4|buổi trưa|ゴ|-|十||Kim đồng hồ chỉ đúng trưa
昼|TRÚ|9|ban ngày|チュウ|ひる|日|尺,日|Mặt trời 日 giữa BAN NGÀY
夜|DẠ|8|ban đêm|ヤ|よる|夕|亠,亻,夕|Người 亻 nghỉ khi trời tối 夕, là BAN ĐÊM
朝|TRIỀU|12|buổi sáng|チョウ|あさ|月|十,日,月|Mặt trời 日 lên mà trăng 月 chưa lặn, đó là SÁNG
体|THỂ|7|cơ thể|タイ|からだ|人|亻,本|Người 亻 với phần gốc 本 chính là CƠ THỂ
目|MỤC|5|mắt|モク|め|目||Hình con mắt dựng đứng
耳|NHĨ|6|tai|ジ|みみ|耳||Hình vành tai
手|THỦ|4|tay|シュ|て|手||Hình bàn tay xoè năm ngón
口|KHẨU|3|miệng|コウ|くち|口||Hình cái miệng mở ra
足|TÚC|7|chân, đủ|ソク|あし|足||Hình đầu gối và bàn chân
力|LỰC|2|sức mạnh|リョク,リキ|ちから|力||Hình cánh tay đang gồng cơ bắp
`.trim();

export interface KanjiSeed {
  character: string;
  sinoVietnamese: string;
  strokeCount: number;
  meaningsVi: string[];
  onyomi: string[];
  kunyomi: string[];
  radicalCharacter: string;
  componentCharacters: string[];
  mnemonicVi: string;
}

/** Bỏ trùng: bảng thô có vài chữ lặp do xuất hiện ở nhiều chủ đề. */
const seen = new Set<string>();

export const KANJI_N5: KanjiSeed[] = RAW.split('\n')
  .map((line) => {
    const [character, hv, strokes, meanings, on, kun, radical, components, mnemonic] =
      line.split('|');
    return {
      character,
      sinoVietnamese: hv,
      strokeCount: Number(strokes),
      meaningsVi: meanings.split(',').map((s) => s.trim()).filter(Boolean),
      onyomi: on && on !== '-' ? on.split(',').filter(Boolean) : [],
      kunyomi: kun && kun !== '-' ? kun.split(',').filter(Boolean) : [],
      radicalCharacter: radical ?? '',
      componentCharacters: components ? components.split(',').filter(Boolean) : [],
      mnemonicVi: mnemonic ?? '',
    };
  })
  .filter((k) => {
    if (seen.has(k.character)) return false;
    seen.add(k.character);
    return true;
  });

/** Nhóm chữ dễ nhầm — chủ động đưa vào cùng câu hỏi phân biệt. */
export const SIMILAR_KANJI_GROUPS: string[][] = [
  ['木', '本', '休', '体'],
  ['日', '目', '白'],
  ['土', '士'],
  ['千', '干', '午'],
  ['人', '入', '八'],
  ['大', '天', '夫'],
  ['右', '左'],
  ['名', '各'],
  ['見', '貝'],
  ['車', '東'],
  ['金', '全'],
  ['小', '少'],
  ['川', '州'],
  ['上', '下'],
  ['万', '方'],
];
