import { formatInTimeZone } from 'date-fns-tz';

const DEFAULT_TZ = 'America/New_York';

export function safeChurchTimeZone(raw: string | null | undefined): string {
  if (!raw?.trim()) return DEFAULT_TZ;
  try {
    formatInTimeZone(new Date(), raw.trim(), 'yyyy-MM-dd');
    return raw.trim();
  } catch {
    return DEFAULT_TZ;
  }
}

export function localYmdInChurchTz(now: Date, timeZone: string): string {
  return formatInTimeZone(now, safeChurchTimeZone(timeZone), 'yyyy-MM-dd');
}

/** First calendar day members can start Day 1 of this cycle (church TZ). */
export function firstDevotionalDayYmd(params: {
  sermonDate: string | null | undefined;
  publishedAtIso?: string | null;
  churchTimeZone: string;
}): string {
  const tz = safeChurchTimeZone(params.churchTimeZone);
  const trimmed = params.sermonDate?.trim();
  if (trimmed && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const published = params.publishedAtIso?.trim();
  if (published) {
    try {
      return formatInTimeZone(new Date(published), tz, 'yyyy-MM-dd');
    } catch {
      /* fall through */
    }
  }
  return localYmdInChurchTz(new Date(), tz);
}

function parseYmdUtc(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return NaN;
  return Date.UTC(y, m - 1, d);
}

export function calendarDiffDays(toYmd: string, fromYmd: string): number {
  const a = parseYmdUtc(toYmd);
  const b = parseYmdUtc(fromYmd);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((a - b) / 86400000);
}

export function addCalendarDaysYmd(ymd: string, days: number): string {
  const t = parseYmdUtc(ymd);
  if (Number.isNaN(t)) return ymd;
  const dt = new Date(t);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function formatYmdLabel(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export type CurrentCycleDay = {
  dayNumber: number;
  label: string;
  inWindow: boolean;
};

/** Day members are on in the six-day calendar (church TZ). */
export function describeCurrentCycleDay(anchorYmd: string, todayYmd: string): CurrentCycleDay {
  const diff = calendarDiffDays(todayYmd, anchorYmd);
  if (diff < 0) {
    return { dayNumber: 0, label: `Starts ${formatYmdLabel(anchorYmd)}`, inWindow: false };
  }
  if (diff >= 6) {
    return { dayNumber: 6, label: 'Catch-up — all 6 days open', inWindow: false };
  }
  const dayNumber = Math.min(6, diff + 1);
  return { dayNumber, label: `Day ${dayNumber} of 6`, inWindow: true };
}
