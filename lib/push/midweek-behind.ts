/**
 * Mid-week catch-up nudge: Day 4–6 of the six-day cycle, if the member is
 * more than one day behind (has finished fewer than expectedDay − 2 days).
 */

export const MIDWEEK_MIN_DIFF = 3;
export const MIDWEEK_MAX_DIFF = 5;
export const MIDWEEK_NUDGE_HOUR_START = 12;
export const MIDWEEK_NUDGE_HOUR_END = 14;

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

export function shouldSendMidweekBehindNudge(opts: {
  cycleDiff: number;
  completedCount: number;
  localHour: number;
}): boolean {
  if (!isMidweekCatchupWindow(opts.cycleDiff)) return false;
  if (opts.localHour < MIDWEEK_NUDGE_HOUR_START || opts.localHour >= MIDWEEK_NUDGE_HOUR_END) {
    return false;
  }
  const expected = expectedDayInSixDayWindow(opts.cycleDiff);
  if (expected == null) return false;
  return isMoreThanOneDayBehind(expected, opts.completedCount);
}
