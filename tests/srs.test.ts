import { suite, test, expect } from './helpers';
import {
  LEECH_THRESHOLD,
  MIN_EASE,
  humanizeInterval,
  interleaveByType,
  schedule,
  type SchedulingState,
} from '../src/modules/srs/srs.engine';
import { detectRoboticPattern, todayKey } from '../src/modules/study/study.service';

const FIXED_RNG = () => 0.5; // fuzz = 1.0, khoảng cách tính được chính xác

function newCard(overrides: Partial<SchedulingState> = {}): SchedulingState {
  return {
    state: 'new',
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    learningStepIndex: 0,
    isLeech: false,
    dueAt: new Date(),
    ...overrides,
  };
}

const NOW = new Date('2026-07-28T04:00:00Z');
const minutesBetween = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 60_000);
const daysBetween = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86_400_000);

export async function runSrsEngineTests() {
  // =======================================================================
  suite('Engine SRS — chuỗi bước học ban đầu');
  // =======================================================================

  await test('Thẻ mới trả lời "Nhớ được" đi tới bước 10 phút', async () => {
    const r = schedule(newCard(), 3, NOW, FIXED_RNG);
    expect(r.state).toBe('learning');
    expect(r.learningStepIndex).toBe(1);
    expect(minutesBetween(r.dueAt, NOW)).toBe(10);
  });

  await test('Thẻ mới trả lời "Dễ quá" nhảy 2 bước, tới mốc 1 ngày', async () => {
    const r = schedule(newCard(), 4, NOW, FIXED_RNG);
    expect(r.learningStepIndex).toBe(2);
    expect(minutesBetween(r.dueAt, NOW)).toBe(1440);
  });

  await test('Đang học mà sai thì quay lại bước đầu (1 phút)', async () => {
    const r = schedule(newCard({ state: 'learning', learningStepIndex: 2 }), 1, NOW, FIXED_RNG);
    expect(r.learningStepIndex).toBe(0);
    expect(minutesBetween(r.dueAt, NOW)).toBe(1);
  });

  await test('"Khó" giữ nguyên bước, không tiến không lùi', async () => {
    const r = schedule(newCard({ state: 'learning', learningStepIndex: 1 }), 2, NOW, FIXED_RNG);
    expect(r.learningStepIndex).toBe(1);
  });

  await test('Qua hết chuỗi bước học thì tốt nghiệp sang giai đoạn ôn tập', async () => {
    const r = schedule(newCard({ state: 'learning', learningStepIndex: 2 }), 3, NOW, FIXED_RNG);
    expect(r.state).toBe('review');
    expect(r.intervalDays).toBe(1);
    expect(r.repetitions).toBe(1);
  });

  // =======================================================================
  suite('Engine SRS — giai đoạn ôn tập');
  // =======================================================================

  await test('"Nhớ được" nhân khoảng cách với hệ số dễ', async () => {
    const card = newCard({ state: 'review', intervalDays: 10, easeFactor: 2.5, repetitions: 3 });
    const r = schedule(card, 3, NOW, FIXED_RNG);
    expect(r.intervalDays).toBe(25); // 10 × 2.5 × 1.0
    expect(r.easeFactor).toBe(2.5); // không đổi
    expect(daysBetween(r.dueAt, NOW)).toBe(25);
  });

  await test('"Dễ quá" nhân thêm 1.3 và tăng hệ số dễ', async () => {
    const card = newCard({ state: 'review', intervalDays: 10, easeFactor: 2.5 });
    const r = schedule(card, 4, NOW, FIXED_RNG);
    expect(r.intervalDays).toBe(33); // 10 × (2.5×1.3) × 1.0
    expect(Math.round(r.easeFactor * 100)).toBe(265);
  });

  await test('"Khó" chỉ nhân 1.2 và giảm hệ số dễ', async () => {
    const card = newCard({ state: 'review', intervalDays: 10, easeFactor: 2.5 });
    const r = schedule(card, 2, NOW, FIXED_RNG);
    expect(r.intervalDays).toBe(12);
    expect(Math.round(r.easeFactor * 100)).toBe(235);
  });

  await test('Quên thì chuyển sang học lại, khoảng cách giảm nửa chứ không về 0', async () => {
    const card = newCard({ state: 'review', intervalDays: 20, easeFactor: 2.5, lapses: 0 });
    const r = schedule(card, 1, NOW, FIXED_RNG);
    expect(r.state).toBe('relearning');
    expect(r.lapses).toBe(1);
    expect(r.intervalDays).toBe(10);
    expect(minutesBetween(r.dueAt, NOW)).toBe(10);
    expect(Math.round(r.easeFactor * 100)).toBe(230);
  });

  await test('Hệ số dễ không bao giờ xuống dưới sàn 1.3', async () => {
    let card = newCard({ state: 'review', intervalDays: 5, easeFactor: 1.4 });
    for (let i = 0; i < 10; i += 1) {
      card = schedule(card, 1, NOW, FIXED_RNG);
      card.state = 'review'; // ép về review để tiếp tục thử
    }
    expect(card.easeFactor).toBe(MIN_EASE);
  });

  await test('Khoảng cách bị chặn trên ở 365 ngày', async () => {
    const card = newCard({ state: 'review', intervalDays: 300, easeFactor: 2.5 });
    const r = schedule(card, 4, NOW, FIXED_RNG);
    expect(r.intervalDays).toBe(365);
  });

  await test(`Quên đủ ${LEECH_THRESHOLD} lần thì thẻ bị treo và đánh dấu khó nhằn`, async () => {
    let card = newCard({ state: 'review', intervalDays: 5, lapses: LEECH_THRESHOLD - 1 });
    card = schedule(card, 1, NOW, FIXED_RNG);
    expect(card.isLeech).toBeTruthy();
    expect(card.state).toBe('suspended');
  });

  await test('Học lại thành công thì quay về giai đoạn ôn tập', async () => {
    const card = newCard({ state: 'relearning', intervalDays: 7, repetitions: 4 });
    const r = schedule(card, 3, NOW, FIXED_RNG);
    expect(r.state).toBe('review');
    expect(r.repetitions).toBe(5);
  });

  await test('Xáo trộn ±5% cho kết quả nằm trong biên cho phép', async () => {
    const card = newCard({ state: 'review', intervalDays: 100, easeFactor: 2.0 });
    const low = schedule(card, 3, NOW, () => 0);   // fuzz = 0.95
    const high = schedule(card, 3, NOW, () => 1);  // fuzz = 1.05
    expect(low.intervalDays).toBe(190);
    expect(high.intervalDays).toBe(210);
  });

  // =======================================================================
  suite('Engine SRS — hàng chờ và hiển thị');
  // =======================================================================

  const longestStreak = (items: { itemType: string }[]) => {
    let max = 0;
    let streak = 0;
    let last = '';
    for (const item of items) {
      streak = item.itemType === last ? streak + 1 : 1;
      last = item.itemType;
      if (streak > max) max = streak;
    }
    return max;
  };

  await test('Không để quá 3 thẻ cùng loại đứng liền nhau khi còn loại khác để xen', async () => {
    const items = [
      ...Array.from({ length: 8 }, (_, i) => ({ itemType: 'kana', id: `k${i}` })),
      ...Array.from({ length: 6 }, (_, i) => ({ itemType: 'kanji', id: `j${i}` })),
      ...Array.from({ length: 6 }, (_, i) => ({ itemType: 'vocabulary', id: `v${i}` })),
    ];
    const mixed = interleaveByType(items, 3);
    expect(mixed).toHaveLength(20);
    expect(longestStreak(mixed)).toBeLessThan(4);
  });

  await test('Hàng chờ chỉ có một loại thì giữ nguyên, không mất thẻ nào', async () => {
    // Giới hạn đã biết: không còn gì để xen thì đoạn đuôi buộc phải lặp lại
    const items = Array.from({ length: 6 }, (_, i) => ({ itemType: 'kana', id: `k${i}` }));
    const mixed = interleaveByType(items, 3);
    expect(mixed).toHaveLength(6);
    expect(longestStreak(mixed)).toBe(6);
  });

  await test('Hiển thị khoảng thời gian bằng tiếng Việt dễ hiểu', async () => {
    expect(humanizeInterval(60_000)).toBe('1 phút');
    expect(humanizeInterval(10 * 60_000)).toBe('10 phút');
    expect(humanizeInterval(3 * 3_600_000)).toBe('3 giờ');
    expect(humanizeInterval(6 * 86_400_000)).toBe('6 ngày');
    expect(humanizeInterval(60 * 86_400_000)).toBe('2 tháng');
  });

  // =======================================================================
  suite('Ghi nhận giờ học — thuật toán');
  // =======================================================================

  await test('Nhịp báo quá đều đặn bị đánh dấu là bất thường', async () => {
    // Script tự động: đúng 60.0 giây một lần
    expect(detectRoboticPattern([60, 60, 60, 60, 60, 60])).toBeTruthy();
    // Người thật: có dao động do mạng và thao tác
    expect(detectRoboticPattern([58.2, 61.7, 59.1, 63.4, 57.8, 62.2])).toBeFalsy();
  });

  await test('Chưa đủ 6 nhịp thì chưa kết luận gì', async () => {
    expect(detectRoboticPattern([60, 60, 60])).toBeFalsy();
  });

  await test('Khoá ngày tính theo múi giờ người dùng, không phải UTC', async () => {
    // 23:30 ngày 27/07 giờ UTC = 06:30 ngày 28/07 giờ Việt Nam
    const at = new Date('2026-07-27T23:30:00Z');
    expect(todayKey('Asia/Ho_Chi_Minh', at)).toBe('2026-07-28');
    expect(todayKey('UTC', at)).toBe('2026-07-27');
  });

  await test('Múi giờ không hợp lệ thì lùi về mặc định Việt Nam', async () => {
    const at = new Date('2026-07-27T23:30:00Z');
    expect(todayKey('Khong/TonTai', at)).toBe('2026-07-28');
  });
}
