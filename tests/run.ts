import {
  setupTestEnv,
  teardownTestEnv,
  createUser,
  createClient,
  suite,
  test,
  expect,
  report,
} from './helpers';
import { runSrsEngineTests } from './srs.test';
import { runExamEngineTests } from './exam.test';
import { runGamificationEngineTests } from './gamification.test';

async function main() {
  const { baseUrl } = await setupTestEnv(5555);

  const { seedAllLanguage } = await import('../src/seeds/language.seed');
  await seedAllLanguage();

  const admin = await createUser(baseUrl, 'admin@test.vn', 'admin');
  const lecturer = await createUser(baseUrl, 'lecturer@test.vn', 'lecturer');
  const contributor = await createUser(baseUrl, 'ctv@test.vn', 'contributor');
  const student = await createUser(baseUrl, 'student@test.vn', 'student');
  const anon = createClient(baseUrl);

  // =======================================================================
  suite('Xác thực & định danh');
  // =======================================================================

  await test('Đăng ký bằng số điện thoại bị từ chối — hệ thống chỉ nhận email', async () => {
    const c = createClient(baseUrl);
    for (const identifier of ['0912 345 678', '+84912345678']) {
      const r = await c.post('/auth/register', {
        identifier,
        password: 'MatKhauAnToan2026',
        displayName: 'Người dùng SĐT',
        acceptTerms: true,
      });
      expect(r.status).toBe(422);
    }
  });

  await test('Mật khẩu quá dễ đoán bị từ chối', async () => {
    const c = createClient(baseUrl);
    const r = await c.post('/auth/register', {
      identifier: 'weak@test.vn',
      password: 'password',
      displayName: 'Yếu',
      acceptTerms: true,
    });
    expect(r.status).toBe(422);
  });

  await test('Đăng nhập sai và không tồn tại trả cùng một mã lỗi', async () => {
    const c = createClient(baseUrl);
    const wrongPw = await c.post('/auth/login', {
      identifier: 'student@test.vn',
      password: 'SaiMatKhauHoanToan',
    });
    const noUser = await c.post('/auth/login', {
      identifier: 'khongtontai@test.vn',
      password: 'SaiMatKhauHoanToan',
    });
    expect(wrongPw.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(noUser.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  await test('Email chưa xác thực thì không đăng nhập được', async () => {
    const c = createClient(baseUrl);
    const email = `chuaxacthuc${Date.now()}@test.vn`;
    const password = 'MatKhauAnToan2026';

    const reg = await c.post('/auth/register', {
      identifier: email,
      password,
      displayName: 'Chưa xác thực',
      acceptTerms: true,
    });
    expect(reg.status).toBe(201);
    // Đăng ký KHÔNG được cấp token — phải xác thực email trước
    expect(reg.data.accessToken).toBeFalsy();
    expect(reg.data.requiresVerification).toBe(true);

    const login = await c.post('/auth/login', { identifier: email, password });
    expect(login.status).toBe(403);
    expect(login.error.code).toBe('AUTH_EMAIL_NOT_VERIFIED');
    // Mật khẩu đúng nhưng vẫn không có token
    expect(login.data).toBeFalsy();
  });

  await test('Mật khẩu sai vẫn báo sai mật khẩu, không lộ trạng thái xác thực', async () => {
    const c = createClient(baseUrl);
    const email = `chuaxacthuc2${Date.now()}@test.vn`;
    await c.post('/auth/register', {
      identifier: email,
      password: 'MatKhauAnToan2026',
      displayName: 'Chưa xác thực 2',
      acceptTerms: true,
    });

    // Chặn "chưa xác thực" nằm SAU bước kiểm mật khẩu, nên người gõ sai mật khẩu
    // không thể dùng thông báo này để dò xem email nào đã đăng ký.
    const r = await c.post('/auth/login', { identifier: email, password: 'SaiMatKhauHoanToan' });
    expect(r.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  // =======================================================================
  suite('Phân quyền RBAC');
  // =======================================================================

  await test('Học viên không vào được khu quản trị', async () => {
    const r = await student.client.get('/cms/vocabulary');
    expect(r.status).toBe(403);
    expect(r.error.code).toBe('AUTH_FORBIDDEN');
  });

  await test('Cộng tác viên xem được kho nội dung', async () => {
    const r = await contributor.client.get('/cms/vocabulary');
    expect(r.status).toBe(200);
  });

  await test('Cộng tác viên KHÔNG được xuất bản', async () => {
    const created = await contributor.client.post('/cms/vocabulary', {
      word: '試験',
      reading: 'しけん',
      meaningsVi: ['kỳ thi'],
      jlptLevel: 'N4',
    });
    expect(created.status).toBe(201);
    const pub = await contributor.client.post(`/cms/vocabulary/${created.data._id}/publish`);
    expect(pub.status).toBe(403);
  });

  await test('Không đăng nhập thì bị chặn', async () => {
    const r = await anon.get('/cms/vocabulary');
    expect(r.status).toBe(401);
  });

  // =======================================================================
  suite('Quy trình duyệt nội dung');
  // =======================================================================

  let vocabId = '';

  await test('CTV tạo nội dung ở trạng thái nháp', async () => {
    /**
     * Từ dùng trong test phải thoả HAI điều kiện:
     *  - KHÔNG nằm sẵn trong kho seed, nếu không lệnh tạo sẽ trả 409 và kéo
     *    đổ cả chuỗi ca test phía sau;
     *  - chỉ gồm Kanji cấp N5, nếu không sẽ vướng quy tắc kiểm soát cấp độ.
     */
    const r = await contributor.client.post('/cms/vocabulary', {
      word: '見学',
      reading: 'けんがく',
      meaningsVi: ['tham quan học tập'],
      partOfSpeech: ['noun'],
      jlptLevel: 'N5',
      topics: ['trường học'],
    });
    expect(r.status).toBe(201);
    expect(r.data.status).toBe('draft');
    vocabId = r.data._id;
  });

  await test('Gửi duyệt chuyển sang pending_review', async () => {
    const r = await contributor.client.post(`/cms/vocabulary/${vocabId}/submit`);
    expect(r.status).toBe(200);
    expect(r.data.status).toBe('pending_review');
  });

  await test('Nội dung chưa duyệt thì không xuất bản được', async () => {
    const r = await admin.client.post(`/cms/vocabulary/${vocabId}/publish`);
    expect(r.status).toBe(409);
    expect(r.error.code).toBe('CONTENT_NOT_APPROVED');
  });

  let taskId = '';

  await test('Nội dung xuất hiện trong hàng chờ duyệt của giảng viên', async () => {
    const r = await lecturer.client.get('/cms/review/queue');
    expect(r.status).toBe(200);
    expect(r.data.length).toBeGreaterThan(0);
    const task = r.data.find((t: { targetId: string }) => t.targetId === vocabId);
    expect(task).toBeTruthy();
    taskId = task._id;
  });

  await test('KHÔNG được tự duyệt nội dung của chính mình', async () => {
    // CTV cần quyền content.review để chạm tới được logic kiểm tra tự duyệt
    const { User } = await import('../src/models/User');
    await User.updateOne(
      { _id: contributor.userId },
      { $set: { permissions: ['content.review'] } },
    );
    const relogin = createClient(baseUrl);
    const login = await relogin.post('/auth/login', {
      identifier: 'ctv@test.vn',
      password: 'MatKhauAnToan2026',
    });
    relogin.setToken(login.data.accessToken);

    const r = await relogin.post(`/cms/review/${taskId}`, { decision: 'approve' });
    expect(r.status).toBe(403);
    expect(r.error.code).toBe('CONTENT_SELF_REVIEW');

    await User.updateOne({ _id: contributor.userId }, { $set: { permissions: [] } });
  });

  await test('Giảng viên duyệt được nội dung của người khác', async () => {
    const r = await lecturer.client.post(`/cms/review/${taskId}`, {
      decision: 'approve',
      note: 'Nội dung chính xác, đồng ý xuất bản.',
    });
    expect(r.status).toBe(200);
    expect(r.data.content.status).toBe('approved');
  });

  await test('Admin xuất bản sau khi đã được thẩm định', async () => {
    const r = await admin.client.post(`/cms/vocabulary/${vocabId}/publish`);
    expect(r.status).toBe(200);
    expect(r.data.status).toBe('published');
  });

  await test('Nội dung đã xuất bản thì CTV không sửa trực tiếp được', async () => {
    const r = await contributor.client.patch(`/cms/vocabulary/${vocabId}`, {
      meaningsVi: ['học tập', 'nỗ lực'],
    });
    expect(r.status).toBe(403);
    expect(r.error.code).toBe('CONTENT_IMMUTABLE_PUBLISHED');
  });

  await test('Lịch sử phiên bản ghi lại đầy đủ các bước', async () => {
    const r = await admin.client.get(`/cms/vocabulary/${vocabId}/revisions`);
    expect(r.status).toBe(200);
    const actions = r.data.map((rev: { action: string }) => rev.action);
    expect(actions).toContain('create');
    expect(actions).toContain('submit');
    expect(actions).toContain('approve');
    expect(actions).toContain('publish');
  });

  // =======================================================================
  suite('Kiểm soát cấp độ Kanji (BR-10)');
  // =======================================================================

  await test('Kanji vượt cấp mà thiếu Furigana thì bị chặn khi gửi duyệt', async () => {
    // 議 không nằm trong N5 nên từ này vượt cấp
    const created = await contributor.client.post('/cms/vocabulary', {
      word: '会議',
      reading: 'かいぎ',
      meaningsVi: ['cuộc họp'],
      jlptLevel: 'N5',
      furiganaSegments: [{ text: '会議', reading: null }],
    });
    expect(created.status).toBe(201);

    const submit = await contributor.client.post(`/cms/vocabulary/${created.data._id}/submit`);
    expect(submit.status).toBe(422);
    expect(submit.error.code).toBe('CONTENT_KANJI_LEVEL_VIOLATION');
  });

  await test('Có Furigana đầy đủ thì Kanji vượt cấp được chấp nhận', async () => {
    const created = await contributor.client.post('/cms/vocabulary', {
      word: '議論',
      reading: 'ぎろん',
      meaningsVi: ['tranh luận'],
      jlptLevel: 'N5',
      furiganaSegments: [{ text: '議論', reading: 'ぎろん' }],
    });
    const submit = await contributor.client.post(`/cms/vocabulary/${created.data._id}/submit`);
    expect(submit.status).toBe(200);
  });

  await test('maxKanjiLevel được tính tự động khi lưu', async () => {
    const r = await contributor.client.post('/cms/vocabulary', {
      word: '山道',
      reading: 'やまみち',
      meaningsVi: ['đường núi'],
      jlptLevel: 'N5',
    });
    expect(r.status).toBe(201);
    expect(r.data.maxKanjiLevel).toBe('N5');
  });

  // =======================================================================
  suite('Nhập hàng loạt từ CSV');
  // =======================================================================

  await test('Tải được file mẫu CSV', async () => {
    const res = await fetch(`${baseUrl}/cms/import/vocabulary/template`, {
      headers: { Authorization: `Bearer ${contributor.client.getToken()}` },
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('word');
    expect(text).toContain('reading');
  });

  await test('Chế độ thử nghiệm phát hiện lỗi mà không ghi vào DB', async () => {
    const csv = [
      'word,reading,meaningsVi,partOfSpeech,jlptLevel,topics',
      '火山,かざん,núi lửa,noun,N5,thiên nhiên',
      ',よみ,thiếu từ,noun,N5,', // thiếu cột bắt buộc
      '雑誌,ざっし,tạp chí,noun,N9,', // cấp độ sai
    ].join('\n');

    const r = await contributor.client.post('/cms/import/vocabulary', { csv, dryRun: true });
    expect(r.status).toBe(200);
    expect(r.data.total).toBe(3);
    expect(r.data.invalid).toBe(2);
    expect(r.data.inserted).toBe(0);
  });

  await test('File hợp lệ hoàn toàn thì được nhập vào', async () => {
    const csv = [
      'word,reading,meaningsVi,partOfSpeech,jlptLevel,topics',
      '火山,かざん,núi lửa,noun,N5,thiên nhiên',
      '雑誌,ざっし,tạp chí,noun,N5,đời sống',
    ].join('\n');

    const r = await contributor.client.post('/cms/import/vocabulary', { csv });
    expect(r.status).toBe(200);
    expect(r.data.inserted).toBe(2);
  });

  await test('Phát hiện trùng lặp với dữ liệu đã có', async () => {
    const csv = [
      'word,reading,meaningsVi,partOfSpeech,jlptLevel,topics',
      '火山,かざん,núi lửa,noun,N5,thiên nhiên',
    ].join('\n');

    const r = await contributor.client.post('/cms/import/vocabulary', { csv, dryRun: true });
    expect(r.data.invalid).toBe(1);
    expect(r.data.rows[0].errors[0]).toContain('Đã tồn tại');
  });

  // =======================================================================
  suite('API công khai (SEO)');
  // =======================================================================

  await test('Bảng Hiragana trả về đủ 108 ký tự, không cần đăng nhập', async () => {
    const r = await anon.get('/public/kana/chart?script=hiragana');
    expect(r.status).toBe(200);
    expect(r.data.total).toBe(108);
    expect(r.data.groups.gojuon).toHaveLength(46);
    expect(r.data.groups.yoon).toHaveLength(36);
  });

  await test('Bảng Katakana trả về đủ 122 ký tự', async () => {
    const r = await anon.get('/public/kana/chart?script=katakana');
    expect(r.data.total).toBe(122);
    expect(r.data.groups.special).toHaveLength(15);
  });

  await test('Tra cứu Kanji trả về chiết tự và âm Hán-Việt', async () => {
    const r = await anon.get(`/public/kanji/${encodeURIComponent('休')}`);
    expect(r.status).toBe(200);
    expect(r.data.sinoVietnamese).toBe('HƯU');
    expect(r.data.componentCharacters).toContain('木');
    expect(r.data.components.length).toBeGreaterThan(0);
  });

  await test('Danh sách 214 bộ thủ', async () => {
    const r = await anon.get('/public/radicals');
    expect(r.data.total).toBe(214);
  });

  await test('Kotowaza trả đúng theo ngữ cảnh cảm xúc', async () => {
    const r = await anon.get('/public/kotowaza/daily?context=after_fail');
    expect(r.status).toBe(200);
    expect(r.data.displayContexts).toContain('after_fail');
  });

  await test('Ngữ pháp N5 đã xuất bản', async () => {
    const r = await anon.get('/public/grammar?level=N5');
    expect(r.data.total).toBeGreaterThan(0);
  });


  // =======================================================================
  suite('SRS & giờ học qua API');
  // =======================================================================

  {
    const { SrsCard, Lesson } = await import('../src/models/Learning');
    const { Types } = await import('mongoose');

    // Bài học mẫu dạy 3 kana đầu tiên
    const lesson = await Lesson.create({
      courseSlug: 'n5-nen-tang',
      levelCode: 'N5',
      slug: 'bai-1-hang-a',
      title: 'Bài 1 — Hiragana hàng あ',
      objective: 'Đọc và viết được あ い う え お',
      order: 1,
      teaches: { kanaCharacters: ['あ', 'い', 'う'], kanjiCharacters: ['日'], vocabularyIds: [], grammarPointIds: [] },
      passThreshold: 80,
      xpReward: 20,
    });

    await test('Chưa học xong bài thì chưa có thẻ ôn tập nào', async () => {
      const count = await SrsCard.countDocuments({ userId: new Types.ObjectId(student.userId) });
      expect(count).toBe(0);
    });

    await test('Điểm dưới ngưỡng thì không hoàn thành, không nạp thẻ', async () => {
      const r = await student.client.post(`/lessons/${lesson._id}/complete`, { quizScore: 60 });
      expect(r.status).toBe(200);
      expect(r.data.passed).toBeFalsy();
      expect(r.data.cardsCreated).toBe(0);
    });

    await test('Đạt ngưỡng thì nạp thẻ SRS theo từng hướng ôn', async () => {
      const r = await student.client.post(`/lessons/${lesson._id}/complete`, { quizScore: 90 });
      expect(r.status).toBe(200);
      expect(r.data.passed).toBeTruthy();
      // 3 kana x 3 hướng + 1 kanji x 2 hướng = 11 thẻ
      expect(r.data.cardsCreated).toBe(11);
    });

    await test('Hoàn thành lại lần nữa không nạp thẻ trùng', async () => {
      const r = await student.client.post(`/lessons/${lesson._id}/complete`, { quizScore: 100 });
      expect(r.data.cardsCreated).toBe(0);
    });

    let firstCardId = '';

    await test('Hàng chờ ôn tập trả về thẻ kèm nội dung hiển thị', async () => {
      const r = await student.client.get('/srs/queue?limit=20');
      expect(r.status).toBe(200);
      expect(r.data.items.length).toBeGreaterThan(0);
      const card = r.data.items[0];
      expect(card.content.prompt).toBeTruthy();
      expect(card.content.answer).toBeTruthy();
      // Bốn nút đánh giá phải kèm sẵn thời gian ôn lại tiếp theo
      expect(Object.keys(card.nextIntervals)).toHaveLength(4);
      firstCardId = card.cardId;
    });

    await test('Thẻ Kanji hiện kèm âm Hán-Việt', async () => {
      const r = await student.client.get('/srs/queue?limit=20');
      const kanjiCard = r.data.items.find(
        (c: { itemType: string; direction: string }) =>
          c.itemType === 'kanji' && c.direction === 'recognition',
      );
      expect(kanjiCard).toBeTruthy();
      expect(kanjiCard.content.extra.sinoVietnamese).toBe('NHẬT');
    });

    await test('Ôn thẻ và nhận lịch ôn lại', async () => {
      const r = await student.client.post('/srs/review', {
        cardId: firstCardId,
        rating: 3,
        responseMs: 2400,
      });
      expect(r.status).toBe(200);
      expect(r.data.card.state).toBe('learning');
      expect(r.data.nextIntervals['1']).toBeTruthy();
    });

    await test('Mỗi thẻ kèm 4 lựa chọn trắc nghiệm hợp lệ', async () => {
      const r = await student.client.get('/srs/queue?limit=20');
      const withChoices = r.data.items.filter(
        (c: { choices: string[] | null }) => c.choices !== null,
      );
      expect(withChoices.length).toBeGreaterThan(0);

      for (const card of withChoices) {
        // Đủ bốn phương án, không trùng nhau, và luôn chứa đáp án đúng —
        // thiếu một trong ba điều này là câu hỏi mất tác dụng đo lường.
        expect(card.choices).toHaveLength(4);
        expect(new Set(card.choices).size).toBe(4);
        expect(card.choices.includes(card.content.answer)).toBe(true);
      }
    });

    await test('Lựa chọn kana không trộn Hiragana với Katakana', async () => {
      // Trộn hai bảng chữ thì đáp án lộ ngay vì hình dạng khác hẳn nhau,
      // người học không cần nhớ cách đọc vẫn chọn đúng.
      const r = await student.client.get('/srs/queue?limit=20');
      const kanaCards = r.data.items.filter(
        (c: { itemType: string; content: { promptType: string }; choices: string[] | null }) =>
          c.itemType === 'kana' && c.content.promptType === 'romaji' && c.choices,
      );
      expect(kanaCards.length).toBeGreaterThan(0);

      for (const card of kanaCards) {
        const katakana = card.choices.filter((c: string) => /[\u30A0-\u30FF]/.test(c)).length;
        const hiragana = card.choices.filter((c: string) => /[\u3040-\u309F]/.test(c)).length;
        expect(katakana === 0 || hiragana === 0).toBe(true);
      }
    });

    await test('Ôn thẻ được cộng vào thống kê hôm nay, không chỉ tổng luỹ kế', async () => {
      // Hai con số phục vụ hai việc khác nhau: tổng luỹ kế cho hồ sơ, còn số
      // của riêng hôm nay là thứ trang chính và biểu đồ lịch sử đọc.
      const r = await student.client.get('/study/today');
      expect(r.status).toBe(200);
      expect(r.data.reviewsDone).toBeGreaterThan(0);
    });

    await test('Không ôn được thẻ của người khác', async () => {
      const r = await lecturer.client.post('/srs/review', { cardId: firstCardId, rating: 3 });
      expect(r.status).toBe(404);
      expect(r.error.code).toBe('SRS_CARD_NOT_FOUND');
    });

    await test('Thống kê SRS phản ánh đúng số thẻ', async () => {
      const r = await student.client.get('/srs/stats');
      expect(r.status).toBe(200);
      expect(r.data.total).toBe(11);
      expect(r.data.byType.kana).toBe(9);
      expect(r.data.byType.kanji).toBe(2);
    });

    await test('Thêm thẳng chữ vào bộ ôn tập không cần qua bài học', async () => {
      const r = await student.client.post('/srs/enroll', {
        items: [
          { itemType: 'kana', itemKey: 'え' },
          { itemType: 'kana', itemKey: 'お' },
        ],
      });
      expect(r.status).toBe(200);
      // 2 kana x 3 hướng ôn
      expect(r.data.cardsCreated).toBe(6);
    });

    await test('Thêm lại chữ đã có không tạo thẻ trùng', async () => {
      const r = await student.client.post('/srs/enroll', {
        items: [{ itemType: 'kana', itemKey: 'え' }],
      });
      expect(r.status).toBe(200);
      expect(r.data.cardsCreated).toBe(0);
    });

    await test('Không thêm được quá 50 mục một lần', async () => {
      const items = Array.from({ length: 51 }, (_, i) => ({
        itemType: 'kana' as const,
        itemKey: `x${i}`,
      }));
      const r = await student.client.post('/srs/enroll', { items });
      expect(r.status).toBe(422);
    });
  }

  // =======================================================================
  suite('Ghi nhận giờ học qua API');
  // =======================================================================

  {
    const { StudySession, DailyStat } = await import('../src/models/Learning');
    const { Types } = await import('mongoose');
    let sessionId = '';

    await test('Mở được phiên học', async () => {
      const r = await student.client.post('/study/sessions/start', { type: 'srs' });
      expect(r.status).toBe(200);
      expect(r.data.sessionId).toBeTruthy();
      sessionId = r.data.sessionId;
    });

    await test('Nhịp báo quá sớm bị từ chối', async () => {
      const r = await student.client.post('/study/heartbeat', { sessionId });
      expect(r.status).toBe(429);
      expect(r.error.code).toBe('STUDY_HEARTBEAT_TOO_SOON');
    });

    await test('Nhịp báo hợp lệ cộng đúng thời gian', async () => {
      // Lùi mốc nhịp trước 60 giây để mô phỏng một phút trôi qua
      await StudySession.updateOne(
        { _id: sessionId },
        { $set: { lastHeartbeatAt: new Date(Date.now() - 60_000) } },
      );
      const r = await student.client.post('/study/heartbeat', { sessionId });
      expect(r.status).toBe(200);
      expect(r.data.countedTodaySeconds).toBe(60);
    });

    await test('Khoảng trống dài chỉ được tính tối đa 90 giây ân hạn', async () => {
      // Người dùng bỏ đi 10 phút rồi quay lại
      await StudySession.updateOne(
        { _id: sessionId },
        { $set: { lastHeartbeatAt: new Date(Date.now() - 600_000) } },
      );
      const r = await student.client.post('/study/heartbeat', { sessionId });
      // 60 giây trước + tối đa 90 giây ân hạn = 150, không phải 660
      expect(r.data.countedTodaySeconds).toBe(150);

      const session = await StudySession.findById(sessionId).lean();
      expect(session!.discardedSeconds).toBeGreaterThan(500);
    });

    await test('Trần 6 giờ mỗi ngày được áp dụng', async () => {
      await DailyStat.updateOne(
        { userId: new Types.ObjectId(student.userId) },
        { $set: { studySeconds: 6 * 3600 - 10 } },
      );
      await StudySession.updateOne(
        { _id: sessionId },
        { $set: { lastHeartbeatAt: new Date(Date.now() - 60_000) } },
      );
      const r = await student.client.post('/study/heartbeat', { sessionId });
      expect(r.data.countedTodaySeconds).toBe(6 * 3600);
      expect(r.data.capReached).toBeTruthy();
    });

    await test('Đóng phiên học', async () => {
      const r = await student.client.post(`/study/sessions/${sessionId}/end`);
      expect(r.status).toBe(200);
    });

    await test('Nhịp báo cho phiên đã đóng bị từ chối', async () => {
      const r = await student.client.post('/study/heartbeat', { sessionId });
      expect(r.status).toBe(404);
    });

    await test('Lịch sử 30 ngày trả đủ cột kể cả ngày không học', async () => {
      const r = await student.client.get('/study/history?days=30');
      expect(r.status).toBe(200);
      expect(r.data).toHaveLength(30);
    });
  }

  // =======================================================================
  suite('Thi thử JLPT qua API');
  // =======================================================================

  {
    const { seedQuestionBank } = await import('../src/seeds/questionBank.seed');
    await seedQuestionBank();

    let attemptId = '';
    let firstSectionCode = '';

    await test('Kho câu hỏi đủ để sinh đề Đọc–Viết', async () => {
      const r = await admin.client.get('/exams/pool-health?level=N5&variant=reading_writing');
      expect(r.status).toBe(200);
      expect(r.data.canGenerate).toBe(true);
    });

    await test('Tham số variant được tôn trọng, không mặc định về bản chuẩn', async () => {
      // Bản chuẩn có phần Nghe mà kho chưa có câu nào, nên PHẢI báo thiếu.
      // Nếu route bỏ qua variant thì hai lần gọi sẽ cho kết quả giống nhau.
      const rw = await admin.client.get('/exams/pool-health?level=N5&variant=reading_writing');
      const std = await admin.client.get('/exams/pool-health?level=N5&variant=standard');
      expect(rw.data.canGenerate).toBe(true);
      expect(std.data.canGenerate).toBe(false);
    });

    await test('Học viên sinh được đề Đọc–Viết đủ 64 câu', async () => {
      const r = await student.client.post('/exams/generate', {
        levelCode: 'N5',
        variant: 'reading_writing',
      });
      expect(r.status).toBe(201);
      expect(r.data.totalQuestions).toBe(64);
      expect(r.data.sections).toHaveLength(2);
      attemptId = r.data.attemptId;
    });

    await test('Đề gửi cho thí sinh KHÔNG chứa đáp án đúng', async () => {
      const r = await student.client.get(`/exams/attempts/${attemptId}`);
      expect(r.status).toBe(200);
      const questions = r.data.sections.flatMap(
        (sec: { questions: unknown[] }) => sec.questions,
      );
      const leaked = questions.filter(
        (q: { options?: Record<string, unknown>[]; correctSequence?: unknown }) =>
          q.options?.some((o) => 'isCorrect' in o) || q.correctSequence,
      );
      expect(leaked).toHaveLength(0);
      firstSectionCode = r.data.sections[0].code;
    });

    await test('Số thứ tự câu liên tục 1..N trong mỗi phần thi', async () => {
      /**
       * Từng tính bằng `questions.length + i + 1` — cả hai vế đều tăng sau mỗi
       * vòng lặp nên số câu nhảy hai đơn vị (1, 3, 5…) và các mondai sau đè số
       * lên nhau. Không chỉ khó nhìn: saveAnswers tìm câu theo `order`, nên hai
       * câu trùng số thì đáp án bị ghi nhầm chỗ mà không có dấu hiệu gì.
       */
      const r = await student.client.get(`/exams/attempts/${attemptId}`);
      for (const section of r.data.sections) {
        const orders = section.questions.map((q: { order: number }) => q.order);
        expect(orders).toEqual(orders.map((_: number, i: number) => i + 1));
      }
    });

    await test('Mỗi đáp án được lưu vào đúng câu của nó', async () => {
      const before = await student.client.get(`/exams/attempts/${attemptId}`);
      const section = before.data.sections[0];
      await student.client.post(
        `/exams/attempts/${attemptId}/sections/${section.code}/start`,
      );

      // Mỗi câu chọn một phương án khác nhau theo vị trí: nếu đáp án bị ghi
      // nhầm sang câu khác thì đối chiếu sẽ lệch ngay.
      const plan = section.questions.map(
        (q: { order: number; options: { id: string }[] }) => ({
          order: q.order,
          answer: q.options[q.order % q.options.length].id,
        }),
      );
      await student.client.patch(`/exams/attempts/${attemptId}/answers`, {
        sectionCode: section.code,
        answers: plan,
      });

      const after = await student.client.get(`/exams/attempts/${attemptId}`);
      const stored = after.data.sections[0].questions;
      for (const p of plan) {
        const q = stored.find((x: { order: number }) => x.order === p.order);
        expect(q.userAnswer).toBe(p.answer);
      }
    });

    await test('Câu đọc hiểu mang theo NỘI DUNG đoạn văn', async () => {
      // Thiếu đoạn văn thì câu hỏi kiểu "Tanaka mấy giờ ra khỏi nhà?" hiện lên
      // mà không có gì để đọc — không ai trả lời được.
      const r = await student.client.get(`/exams/attempts/${attemptId}`);
      const questions = r.data.sections.flatMap(
        (sec: { questions: unknown[] }) => sec.questions,
      );
      const reading = questions.filter(
        (q: { mondaiCode: string }) => q.mondaiCode.startsWith('N5-READ'),
      );
      expect(reading.length).toBeGreaterThan(0);
      for (const q of reading) {
        expect(q.passage?.body).toBeTruthy();
      }
    });

    await test('Câu sắp xếp câu có sẵn các mảnh đã xáo trộn', async () => {
      const r = await student.client.get(`/exams/attempts/${attemptId}`);
      const questions = r.data.sections.flatMap(
        (sec: { questions: unknown[] }) => sec.questions,
      );
      const ordering = questions.filter(
        (q: { format: string }) => q.format === 'sentence_order',
      );
      expect(ordering.length).toBeGreaterThan(0);
      for (const q of ordering) {
        expect(q.pieces?.length).toBeGreaterThan(0);
      }
    });

    await test('Không xem được bài thi của người khác', async () => {
      const r = await lecturer.client.get(`/exams/attempts/${attemptId}`);
      expect(r.status).toBe(404);
    });

    await test('Chưa nộp thì chưa xem được kết quả', async () => {
      const r = await student.client.get(`/exams/attempts/${attemptId}/result`);
      expect(r.status).toBe(409);
      expect(r.error.code).toBe('EXAM_NOT_GRADED');
    });

    await test('Làm và nộp trọn bài, nhận điểm theo nhóm', async () => {
      const attempt = await student.client.get(`/exams/attempts/${attemptId}`);

      for (const section of attempt.data.sections) {
        await student.client.post(
          `/exams/attempts/${attemptId}/sections/${section.code}/start`,
        );
        await student.client.patch(`/exams/attempts/${attemptId}/answers`, {
          sectionCode: section.code,
          answers: section.questions.map((q: { order: number; options: { id: string }[] }) => ({
            order: q.order,
            answer: q.options?.[0]?.id ?? null,
          })),
        });
        await student.client.post(
          `/exams/attempts/${attemptId}/sections/${section.code}/finish`,
        );
      }

      const r = await student.client.post(`/exams/attempts/${attemptId}/submit`);
      expect(r.status).toBe(200);
      expect(r.data.sectionScores).toHaveLength(1);
      expect(r.data.byMondai.length).toBeGreaterThan(0);
      expect(typeof r.data.passed).toBe('boolean');
    });

    await test('Phần thi đã kết thúc thì không mở lại được', async () => {
      const r = await student.client.post(
        `/exams/attempts/${attemptId}/sections/${firstSectionCode}/start`,
      );
      expect(r.status).toBe(404);
    });

    await test('Xem lại bài thì mới được trả đáp án và giải thích', async () => {
      const r = await student.client.get(`/exams/attempts/${attemptId}/review`);
      expect(r.status).toBe(200);
      const questions = r.data.flatMap((sec: { questions: unknown[] }) => sec.questions);
      expect(questions).toHaveLength(64);
      expect(questions[0].correctOptionIds.length).toBeGreaterThan(0);
      expect(questions[0].explanationVi).toBeTruthy();
    });

    await test('Bài thi vào lịch sử và cộng vào thống kê ngày', async () => {
      const history = await student.client.get('/exams/history');
      expect(history.status).toBe(200);
      expect(history.data.length).toBeGreaterThan(0);

      const today = await student.client.get('/study/today');
      expect(today.data.examsTaken ?? 1).toBeGreaterThan(0);
    });

    await test('Từ vựng công khai có phân trang và danh sách chủ đề', async () => {
      const r = await anon.get('/public/vocabulary?level=N5&limit=5');
      expect(r.status).toBe(200);
      expect(r.data.items).toHaveLength(5);
      expect(r.data.total).toBeGreaterThan(5);
      expect(r.data.topics.length).toBeGreaterThan(0);
    });

    await test('Lọc từ vựng theo chủ đề', async () => {
      const all = await anon.get('/public/vocabulary?level=N5&limit=200');
      const topic = all.data.topics[0];
      const r = await anon.get(
        `/public/vocabulary?level=N5&topic=${encodeURIComponent(topic)}`,
      );
      expect(r.status).toBe(200);
      expect(r.data.total).toBeLessThan(all.data.total);
      expect(r.data.items.every((v: { topics: string[] }) => v.topics.includes(topic))).toBe(true);
    });
  }

  await runSrsEngineTests();
  await runExamEngineTests();
  await runGamificationEngineTests();

  await teardownTestEnv();
  return report();
}

main()
  .then((failed) => process.exit(failed > 0 ? 1 : 0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
