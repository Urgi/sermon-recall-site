/**
 * Mid-week "behind" rule: Day 4–6 of the six-day cycle, member more than one day behind.
 * The daily reminder (`reminder-plan.ts`) records `midweekBehindDedupeKey` when it applies,
 * so the pastor dashboard can report it.
 */

export const MIDWEEK_MIN_DIFF = 3;
export const MIDWEEK_MAX_DIFF = 5;

export function midweekBehindDedupeKey(sermonId: string): string {
  return `behind-midweek-${sermonId}`;
}

/** Whole calendar days from sermon anchor to today. 0 on the sermon date. */
export function cycleDiffDays(anchorYmd: string, todayYmd: string): number {
  const a = parseYmdUtc(todayYmd);
  const b = parseYmdUtc(anchorYmd);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((a - b) / 86400000);
}

function parseYmdUtc(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return NaN;
  return Date.UTC(y, m - 1, d);
}

/** Unlocked day (1–6) during the six-day window. Null before start or in catch-up. */
export function expectedDayInSixDayWindow(diff: number): number | null {
  if (diff < 0 || diff >= 6) return null;
  return Math.min(6, diff + 1);
}

export function isMidweekCatchupWindow(diff: number): boolean {
  return diff >= MIDWEEK_MIN_DIFF && diff <= MIDWEEK_MAX_DIFF;
}

/** How many days they are behind the calendar (0 = on pace for today). */
export function daysBehind(expectedDay: number, completedCount: number): number {
  return Math.max(0, expectedDay - 1 - completedCount);
}

export function isMoreThanOneDayBehind(expectedDay: number, completedCount: number): boolean {
  return daysBehind(expectedDay, completedCount) > 1;
}
