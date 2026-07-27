/**
 * 214 bộ thủ Khang Hy, kèm tên Hán-Việt và nghĩa tiếng Việt.
 *
 * Đây là nền tảng của phương pháp chiết tự: học 214 bộ này trước thì 2.136 chữ
 * Hán trở thành tổ hợp của những mảnh đã biết, thay vì 2.136 hình vẽ rời rạc.
 *
 * Định dạng mỗi dòng: số|ký tự|số nét|tên Hán-Việt|nghĩa tiếng Việt|biến thể
 */
const RAW = `
1|一|1|Nhất|một|
2|丨|1|Cổn|nét sổ thẳng|
3|丶|1|Chủ|dấu chấm|
4|丿|1|Phiệt|nét phẩy|
5|乙|1|Ất|can Ất, hình cong|乚
6|亅|1|Quyết|nét móc|
7|二|2|Nhị|hai|
8|亠|2|Đầu|phần đầu, nắp đậy|
9|人|2|Nhân|người|亻
10|儿|2|Nhi|chân người|
11|入|2|Nhập|vào|
12|八|2|Bát|tám, chia ra|
13|冂|2|Quynh|vùng biên giới|
14|冖|2|Mịch|trùm khăn lên|
15|冫|2|Băng|nước đá|
16|几|2|Kỷ|ghế dựa nhỏ|
17|凵|2|Khảm|há miệng, cái hố|
18|刀|2|Đao|con dao|刂
19|力|2|Lực|sức mạnh|
20|勹|2|Bao|bao bọc|
21|匕|2|Chuỷ|cái thìa|
22|匚|2|Phương|tủ đựng đồ|
23|匸|2|Hệ|che đậy, giấu kín|
24|十|2|Thập|mười|
25|卜|2|Bốc|xem bói|
26|卩|2|Tiết|đốt tre, ấn tín|
27|厂|2|Hán|sườn núi, vách đá|
28|厶|2|Khư|riêng tư|
29|又|2|Hựu|lại nữa, bàn tay phải|
30|口|3|Khẩu|cái miệng|
31|囗|3|Vi|vây quanh|
32|土|3|Thổ|đất|
33|士|3|Sĩ|kẻ sĩ, học trò|
34|夂|3|Truy|đến sau|
35|夊|3|Tuy|đi chậm|
36|夕|3|Tịch|buổi tối|
37|大|3|Đại|to lớn|
38|女|3|Nữ|đàn bà|
39|子|3|Tử|con cái|
40|宀|3|Miên|mái nhà|
41|寸|3|Thốn|tấc (đơn vị đo)|
42|小|3|Tiểu|nhỏ bé|
43|尢|3|Uông|yếu đuối, què|尣
44|尸|3|Thi|xác chết, thân người|
45|屮|3|Triệt|mầm cây mới nhú|
46|山|3|Sơn|núi|
47|巛|3|Xuyên|dòng sông|川
48|工|3|Công|công việc, thợ|
49|己|3|Kỷ|bản thân mình|
50|巾|3|Cân|cái khăn|
51|干|3|Can|cái khiên, khô|
52|幺|3|Yêu|nhỏ bé, tơ nhỏ|
53|广|3|Nghiễm|mái nhà rộng|
54|廴|3|Dẫn|bước đi xa|
55|廾|3|Củng|chắp hai tay|
56|弋|3|Dặc|bắn tên có dây|
57|弓|3|Cung|cái cung|
58|彐|3|Kệ|đầu con nhím|彑
59|彡|3|Sam|lông tóc, hoa văn|
60|彳|3|Xích|bước chân trái|
61|心|4|Tâm|trái tim, tấm lòng|忄
62|戈|4|Qua|cây giáo|
63|戶|4|Hộ|cánh cửa|戸
64|手|4|Thủ|bàn tay|扌
65|支|4|Chi|cành nhánh, chống đỡ|
66|攴|4|Phộc|đánh khẽ|攵
67|文|4|Văn|chữ viết, văn vẻ|
68|斗|4|Đẩu|cái đấu đong|
69|斤|4|Cân|cái rìu, đơn vị cân|
70|方|4|Phương|vuông, phương hướng|
71|无|4|Vô|không có|
72|日|4|Nhật|mặt trời, ngày|
73|曰|4|Viết|nói rằng|
74|月|4|Nguyệt|mặt trăng, tháng|
75|木|4|Mộc|cây gỗ|
76|欠|4|Khiếm|thiếu, ngáp|
77|止|4|Chỉ|dừng lại|
78|歹|4|Ngạt|xấu xa, xương tàn|
79|殳|4|Thù|binh khí có cán|
80|毋|4|Vô|chớ, đừng|
81|比|4|Tỷ|so sánh|
82|毛|4|Mao|lông|
83|氏|4|Thị|họ, dòng dõi|
84|气|4|Khí|hơi, khí|
85|水|4|Thuỷ|nước|氵,氺
86|火|4|Hoả|lửa|灬
87|爪|4|Trảo|móng vuốt|爫
88|父|4|Phụ|người cha|
89|爻|4|Hào|hào trong quẻ Kinh Dịch|
90|爿|4|Tường|mảnh gỗ trái|
91|片|4|Phiến|mảnh, tấm|
92|牙|4|Nha|răng nanh|
93|牛|4|Ngưu|trâu bò|牜
94|犬|4|Khuyển|con chó|犭
95|玄|5|Huyền|đen huyền, huyền bí|
96|玉|5|Ngọc|viên ngọc|王
97|瓜|5|Qua|quả dưa|
98|瓦|5|Ngoã|ngói, đồ gốm|
99|甘|5|Cam|ngọt|
100|生|5|Sinh|sinh ra, sống|
101|用|5|Dụng|dùng|
102|田|5|Điền|ruộng|
103|疋|5|Thất|tấm vải, bàn chân|
104|疒|5|Nạch|bệnh tật|
105|癶|5|Bát|hai chân dang ra|
106|白|5|Bạch|màu trắng|
107|皮|5|Bì|da|
108|皿|5|Mãnh|bát đĩa|
109|目|5|Mục|con mắt|
110|矛|5|Mâu|cây giáo dài|
111|矢|5|Thỉ|mũi tên|
112|石|5|Thạch|đá|
113|示|5|Thị|thần đất, chỉ bảo|礻
114|禸|5|Nhựu|vết chân thú|
115|禾|5|Hoà|cây lúa|
116|穴|5|Huyệt|cái hang|
117|立|5|Lập|đứng|
118|竹|6|Trúc|cây tre|⺮
119|米|6|Mễ|gạo|
120|糸|6|Mịch|sợi tơ nhỏ|糹
121|缶|6|Phẫu|đồ sành đựng|
122|网|6|Võng|cái lưới|罒,罓
123|羊|6|Dương|con dê|
124|羽|6|Vũ|lông vũ, cánh|
125|老|6|Lão|già|耂
126|而|6|Nhi|mà, và (liên từ)|
127|耒|6|Lỗi|cái cày|
128|耳|6|Nhĩ|cái tai|
129|聿|6|Duật|cây bút|
130|肉|6|Nhục|thịt|⺼
131|臣|6|Thần|bề tôi|
132|自|6|Tự|tự mình, cái mũi|
133|至|6|Chí|đến nơi|
134|臼|6|Cữu|cái cối giã|
135|舌|6|Thiệt|cái lưỡi|
136|舛|6|Suyễn|sai trái, ngang ngược|
137|舟|6|Chu|con thuyền|
138|艮|6|Cấn|quẻ Cấn, dừng|
139|色|6|Sắc|màu sắc|
140|艸|6|Thảo|cỏ|艹
141|虍|6|Hô|vằn con hổ|
142|虫|6|Trùng|sâu bọ|
143|血|6|Huyết|máu|
144|行|6|Hành|đi, thi hành|
145|衣|6|Y|áo|衤
146|襾|6|Á|che đậy|覀
147|見|7|Kiến|nhìn thấy|见
148|角|7|Giác|cái sừng, góc|
149|言|7|Ngôn|lời nói|訁,讠
150|谷|7|Cốc|thung lũng|
151|豆|7|Đậu|hạt đậu|
152|豕|7|Thỉ|con lợn|
153|豸|7|Trĩ|loài thú không chân|
154|貝|7|Bối|vỏ sò, tiền của|贝
155|赤|7|Xích|màu đỏ|
156|走|7|Tẩu|chạy|
157|足|7|Túc|bàn chân, đầy đủ|⻊
158|身|7|Thân|thân thể|
159|車|7|Xa|xe|车
160|辛|7|Tân|cay, gian khổ|
161|辰|7|Thìn|chi Thìn, buổi sớm|
162|辵|7|Sước|bước đi rồi dừng|辶
163|邑|7|Ấp|làng xóm|⻏
164|酉|7|Dậu|chi Dậu, rượu|
165|釆|7|Biện|phân biệt|
166|里|7|Lý|dặm, làng quê|
167|金|8|Kim|vàng, kim loại|釒,钅
168|長|8|Trường|dài, lớn lên|长
169|門|8|Môn|cửa lớn|门
170|阜|8|Phụ|gò đất|⻖
171|隶|8|Đãi|kịp, bắt kịp|
172|隹|8|Chuy|chim đuôi ngắn|
173|雨|8|Vũ|mưa|
174|青|8|Thanh|màu xanh|
175|非|8|Phi|không phải|
176|面|9|Diện|mặt, bề mặt|
177|革|9|Cách|da thuộc, đổi mới|
178|韋|9|Vi|da mềm|韦
179|韭|9|Cửu|rau hẹ|
180|音|9|Âm|âm thanh|
181|頁|9|Hiệt|cái đầu, trang giấy|页
182|風|9|Phong|gió|风
183|飛|9|Phi|bay|飞
184|食|9|Thực|ăn, thức ăn|飠,饣
185|首|9|Thủ|cái đầu, đứng đầu|
186|香|9|Hương|mùi thơm|
187|馬|10|Mã|con ngựa|马
188|骨|10|Cốt|xương|
189|高|10|Cao|cao|
190|髟|10|Tiêu|tóc dài|
191|鬥|10|Đấu|đánh nhau|
192|鬯|10|Sưởng|rượu nếp cúng tế|
193|鬲|10|Cách|cái đỉnh ba chân|
194|鬼|10|Quỷ|ma quỷ|
195|魚|11|Ngư|con cá|鱼
196|鳥|11|Điểu|con chim|鸟
197|鹵|11|Lỗ|đất mặn|卤
198|鹿|11|Lộc|con hươu|
199|麥|11|Mạch|lúa mạch|麦
200|麻|11|Ma|cây gai|
201|黃|12|Hoàng|màu vàng|黄
202|黍|12|Thử|lúa nếp|
203|黑|12|Hắc|màu đen|
204|黹|12|Chỉ|may vá thêu thùa|
205|黽|13|Mãnh|con ếch|
206|鼎|13|Đỉnh|cái vạc ba chân|
207|鼓|13|Cổ|cái trống|
208|鼠|13|Thử|con chuột|
209|鼻|14|Tỵ|cái mũi|
210|齊|14|Tề|ngang bằng, chỉnh tề|齐
211|齒|15|Xỉ|răng|齿
212|龍|16|Long|con rồng|龙
213|龜|16|Quy|con rùa|龟
214|龠|17|Dược|ống sáo|
`.trim();

export interface RadicalSeed {
  number: number;
  character: string;
  strokeCount: number;
  nameVi: string;
  meaningVi: string;
  variants: string[];
}

export const RADICALS: RadicalSeed[] = RAW.split('\n').map((line) => {
  const [num, character, strokes, nameVi, meaningVi, variants] = line.split('|');
  return {
    number: Number(num),
    character,
    strokeCount: Number(strokes),
    nameVi: `bộ ${nameVi}`,
    meaningVi,
    variants: variants ? variants.split(',').filter(Boolean) : [],
  };
});

/** Vị trí thường gặp của một số bộ thủ hay dùng, giúp giải thích cấu tạo chữ. */
export const RADICAL_POSITIONS: Record<string, string> = {
  亻: 'left', 氵: 'left', 扌: 'left', 忄: 'left', 犭: 'left',
  礻: 'left', 衤: 'left', 訁: 'left', 糹: 'left', 釒: 'left',
  艹: 'top', 宀: 'top', 竹: 'top', 雨: 'top', 覀: 'top',
  灬: 'bottom', 心: 'bottom', 皿: 'bottom',
  囗: 'enclose', 門: 'enclose', 广: 'enclose', 厂: 'enclose', 辶: 'enclose',
};
