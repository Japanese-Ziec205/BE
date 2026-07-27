import type { SrsState } from '../../models/Learning';

/**
 * Thuật toán SM-2 có điều chỉnh — nền tảng của Anki.
 *
 * Chọn SM-2 thay vì FSRS vì mỗi thẻ chỉ cần 3 con số, tính toán O(1), không
 * cần huấn luyện mô hình. Phù hợp hạ tầng miễn phí và đủ đơn giản để cộng tác
 * viên hiểu và kiểm chứng được.
 *
 * Toàn bộ hàm ở đây là hàm thuần khiết, không chạm database — nhờ vậy test
 * được trực tiếp, không cần dựng cả hệ thống.
 */

export type Rating = 1 | 2 | 3 | 4; // Chưa nhớ | Khó | Nhớ được | Dễ quá

/** Chuỗi bước học ban đầu, tính bằng phút: 1 phút → 10 phút → 1 ngày. */
export const LEARNING_STEPS_MIN = [1, 10, 1440];
export const RELEARNING_STEPS_MIN = [10];
export const MIN_EASE = 1.3;
export const MAX_INTERVAL_DAYS = 365;
export const LEECH_THRESHOLD = 8;

export interface SchedulingState {
  state: SrsState;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  learningStepIndex: number;
  isLeech: boolean;
  dueAt: Date;
}

const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

/**
 * Xáo trộn ±5% để các thẻ học cùng một ngày không dồn cục về sau.
 * Nhận hàm ngẫu nhiên từ ngoài để test có thể truyền giá trị cố định.
 */
export function fuzz(rng: () => number = Math.random): number {
  return 0.95 + rng() * 0.1;
}

export function schedule(
  card: SchedulingState,
  rating: Rating,
  now: Date = new Date(),
  rng: () => number = Math.random,
): SchedulingState {
  const next: SchedulingState = { ...card };

  // ----- Thẻ mới hoặc đang trong chuỗi bước học -----
  if (next.state === 'new' || next.state === 'learning') {
    if (rating === 1) {
      next.learningStepIndex = 0; // sai thì quay lại bước đầu
    } else if (rating === 2) {
      // giữ nguyên bước hiện tại, học lại
    } else {
      next.learningStepIndex += rating === 4 ? 2 : 1; // "Dễ quá" nhảy 2 bước
    }

    if (next.learningStepIndex >= LEARNING_STEPS_MIN.length) {
      // Tốt nghiệp sang giai đoạn ôn tập
      next.state = 'review';
      next.intervalDays = rating === 4 ? 4 : 1;
      next.repetitions = 1;
      next.learningStepIndex = 0;
      next.dueAt = addDays(now, next.intervalDays);
    } else {
      next.state = 'learning';
      next.dueAt = addMinutes(now, LEARNING_STEPS_MIN[next.learningStepIndex]);
    }
    return next;
  }

  // ----- Thẻ đang trong giai đoạn ôn tập -----
  if (rating === 1) {
    next.lapses += 1;
    next.easeFactor = Math.max(MIN_EASE, next.easeFactor - 0.2);
    next.state = 'relearning';
    next.learningStepIndex = 0;
    // Không đưa về 0: người học đã từng nhớ được, không nên bắt học lại từ đầu
    next.intervalDays = Math.max(1, Math.round(next.intervalDays * 0.5));
    next.dueAt = addMinutes(now, RELEARNING_STEPS_MIN[0]);
    if (next.lapses >= LEECH_THRESHOLD) {
      next.isLeech = true;
      next.state = 'suspended';
    }
    return next;
  }

  // ----- Thẻ đang học lại sau khi quên -----
  if (next.state === 'relearning') {
    next.state = 'review';
    next.repetitions += 1;
    next.dueAt = addDays(now, next.intervalDays);
    return next;
  }

  const multiplier = { 2: 1.2, 3: next.easeFactor, 4: next.easeFactor * 1.3 }[rating]!;
  const easeDelta = { 2: -0.15, 3: 0, 4: 0.15 }[rating]!;

  next.easeFactor = Math.max(MIN_EASE, next.easeFactor + easeDelta);
  next.repetitions += 1;
  next.intervalDays = Math.min(
    MAX_INTERVAL_DAYS,
    Math.max(1, Math.round(next.intervalDays * multiplier * fuzz(rng))),
  );
  next.dueAt = addDays(now, next.intervalDays);
  next.state = 'review';
  return next;
}

/**
 * Dự báo khoảng ôn tiếp theo cho cả 4 nút, để hiển thị ngay trên nút bấm.
 *
 * Cho người học thấy hệ quả TRƯỚC khi chọn giúp họ hiểu tại sao nên bấm nút
 * nào — điểm mà hầu hết ứng dụng SRS làm chưa tốt.
 */
export function previewIntervals(card: SchedulingState, now = new Date()): Record<Rating, string> {
  const out = {} as Record<Rating, string>;
  for (const rating of [1, 2, 3, 4] as Rating[]) {
    // Dùng rng cố định 0.5 để nhãn hiển thị không nhảy mỗi lần render
    const result = schedule(card, rating, now, () => 0.5);
    out[rating] = humanizeInterval(result.dueAt.getTime() - now.getTime());
  }
  return out;
}

export function humanizeInterval(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)} phút`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ngày`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} tháng`;
  return `${(days / 365).toFixed(1)} năm`;
}

/**
 * Trộn thứ tự sao cho không quá `maxStreak` thẻ cùng loại đứng liền nhau.
 *
 * Lặp một dạng bài quá lâu là nguyên nhân gây nhàm chán rõ rệt nhất trong
 * một phiên ôn tập.
 *
 * GIỚI HẠN: đây là thuật toán nỗ lực tối đa, không phải bảo đảm tuyệt đối.
 * Khi hàng chờ chỉ còn lại một loại duy nhất (ví dụ 5 thẻ kana cuối cùng) thì
 * không còn gì để xen vào, nên đoạn đuôi vẫn có thể vượt `maxStreak`. Điều đó
 * chấp nhận được: vấn đề nhàm chán nằm ở phần lớn phiên học, không phải ở
 * vài thẻ cuối.
 */
export function interleaveByType<T extends { itemType: string }>(
  items: T[],
  maxStreak = 3,
): T[] {
  // Gom theo loại rồi luôn rút từ loại CÒN NHIỀU NHẤT.
  //
  // Cách tham lam "lấy từ đầu hàng" không cân bằng được: loại nào đông sẽ bị
  // dồn hết về cuối rồi tạo ra một chuỗi dài. Ưu tiên loại đông nhất giúp mọi
  // loại cạn cùng lúc, nên chuỗi lặp ngắn nhất có thể.
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const bucket = buckets.get(item.itemType);
    if (bucket) bucket.push(item);
    else buckets.set(item.itemType, [item]);
  }

  const result: T[] = [];
  let lastType = '';
  let streak = 0;

  while (result.length < items.length) {
    // Sắp loại theo số lượng còn lại, nhiều nhất trước
    const candidates = [...buckets.entries()]
      .filter(([, list]) => list.length > 0)
      .sort((a, b) => b[1].length - a[1].length);
    if (candidates.length === 0) break;

    let chosen = candidates[0];
    // Nếu loại đông nhất đang tạo chuỗi quá dài thì nhường cho loại kế tiếp
    if (chosen[0] === lastType && streak >= maxStreak && candidates.length > 1) {
      chosen = candidates[1];
    }

    const picked = chosen[1].shift()!;
    streak = chosen[0] === lastType ? streak + 1 : 1;
    lastType = chosen[0];
    result.push(picked);
  }

  return result;
}

/** Số thẻ mới cho phép mỗi ngày, theo mục tiêu thời gian người học tự đặt. */
export function dailyNewLimit(dailyGoalMinutes: number): number {
  if (dailyGoalMinutes <= 5) return 5;
  if (dailyGoalMinutes <= 10) return 10;
  if (dailyGoalMinutes <= 20) return 15;
  if (dailyGoalMinutes <= 30) return 20;
  return 25;
}
