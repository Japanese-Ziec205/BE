import { suite, test, expect } from './helpers';
import {
  computeStreak,
  daysBetweenKeys,
  FREEZE_EARN_EVERY_DAYS,
  MAX_FREEZES,
} from '../src/modules/gamification/gamification.service';
import { levelFromXp, titleForLevel, xpForLevel } from '../src/models/LearningProfile';

export async function runGamificationEngineTests() {
  // =======================================================================
  suite('Chuỗi ngày học và bùa cứu');
  // =======================================================================

  const base = { current: 5, longest: 10, lastStudyDate: '2026-07-27', freezesAvailable: 0 };

  await test('Đếm đúng số ngày giữa hai mốc', async () => {
    expect(daysBetweenKeys('2026-07-27', '2026-07-28')).toBe(1);
    expect(daysBetweenKeys('2026-07-27', '2026-07-29')).toBe(2);
    // Qua tháng
    expect(daysBetweenKeys('2026-07-31', '2026-08-01')).toBe(1);
  });

  await test('Học ngày kế tiếp thì chuỗi tăng', async () => {
    const r = computeStreak(base, '2026-07-28');
    expect(r.current).toBe(6);
    expect(r.extended).toBe(true);
  });

  await test('Học lại trong cùng ngày không cộng thêm', async () => {
    const r = computeStreak(base, '2026-07-27');
    expect(r.current).toBe(5);
    expect(r.extended).toBe(false);
  });

  await test(`Mỗi ${FREEZE_EARN_EVERY_DAYS} ngày liên tục được tặng một bùa cứu`, async () => {
    const r = computeStreak({ ...base, current: 6 }, '2026-07-28');
    expect(r.current).toBe(7);
    expect(r.freezesAvailable).toBe(1);
    expect(r.message).toContain('bùa cứu');
  });

  await test(`Không tích quá ${MAX_FREEZES} bùa`, async () => {
    const r = computeStreak(
      { ...base, current: 13, freezesAvailable: MAX_FREEZES },
      '2026-07-28',
    );
    expect(r.current).toBe(14);
    expect(r.freezesAvailable).toBe(MAX_FREEZES);
  });

  await test('⭐ Lỡ một ngày mà còn bùa thì TỰ ĐỘNG cứu, không mất chuỗi', async () => {
    // Học lần cuối 27/07, hôm nay đã là 29/07 — lỡ mất ngày 28
    const r = computeStreak({ ...base, current: 45, freezesAvailable: 2 }, '2026-07-29');
    expect(r.freezeUsed).toBe(true);
    expect(r.current).toBe(46); // chuỗi vẫn tiếp tục
    expect(r.freezesAvailable).toBe(1);
    expect(r.message).toContain('vẫn nguyên vẹn');
  });

  await test('Lỡ một ngày mà hết bùa thì chuỗi reset, kỷ lục vẫn được giữ', async () => {
    const r = computeStreak(
      { current: 45, longest: 61, lastStudyDate: '2026-07-27', freezesAvailable: 0 },
      '2026-07-29',
    );
    expect(r.freezeUsed).toBe(false);
    expect(r.current).toBe(1);
    expect(r.longest).toBe(61);
    // Thông điệp phải trung tính, không trách móc
    expect(r.message).toContain('vẫn được ghi nhận');
  });

  await test('Nghỉ nhiều ngày thì bùa không cứu được', async () => {
    const r = computeStreak({ ...base, current: 30, freezesAvailable: 3 }, '2026-08-05');
    expect(r.current).toBe(1);
    expect(r.freezeUsed).toBe(false);
    expect(r.freezesAvailable).toBe(3); // không tiêu bùa vô ích
  });

  await test('Người học lần đầu bắt đầu từ chuỗi 1', async () => {
    const r = computeStreak(
      { current: 0, longest: 0, lastStudyDate: null, freezesAvailable: 0 },
      '2026-07-28',
    );
    expect(r.current).toBe(1);
    expect(r.message).toBe(null); // chưa có gì để tiếc nên không nhắn gì
  });

  // =======================================================================
  suite('Cấp độ người dùng theo XP');
  // =======================================================================

  await test('XP cần cho từng cấp tăng dần theo công thức 100·n^1.5', async () => {
    expect(xpForLevel(1)).toBe(100);
    expect(xpForLevel(4)).toBe(800);
    expect(xpForLevel(9)).toBe(2700);
  });

  await test('Quy đổi tổng XP ra cấp độ', async () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2); // vừa đủ 100 thì lên cấp 2
    expect(levelFromXp(383)).toBe(3); // 100 + 283
  });

  await test('Danh hiệu đổi theo mốc cấp độ', async () => {
    expect(titleForLevel(1)).toContain('Hạt giống');
    expect(titleForLevel(5)).toContain('Mầm non');
    expect(titleForLevel(10)).toContain('Hoa anh đào');
    expect(titleForLevel(40)).toContain('Hạc giấy vàng');
  });
}
