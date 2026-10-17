/**
 * Devotional reminder schedule, as a pure function so it can be reasoned about (and simulated)
 * without a database.
 *
 * One sermon = one six-day journey anchored on the sermon date (church time zone):
 *
 *   Calendar day 1–6  → at most ONE ping a day, about the first unfinished day that is open.
 *                       Copy follows the calendar: "today" when on pace, "behind" otherwise.
 *                       Day 1 is skipped when the member already got the "Day 1 is ready" push.
 *   Calendar day 8     → catch-up nudge #1 (if anything is unfinished).
 *   Calendar day 12    → catch-up nudge #2, the last one.
 *   Anything else      → silence until the church publishes the next sermon.
 *
 * Every ping has a stable dedupe key, so a member can never get the same message twice.
 */

import {
  cycleDiffDays,
  expectedDayInSixDayWindow,
  isMidweekCatchupWindow,
  isMoreThanOneDayBehind,
  midweekBehindDedupeKey,
} from '@/lib/push/midweek-behind';

export type ReminderKind = 'today' | 'behind' | 'catchup1' | 'catchup2';

export type PlanDevotional = { id: string; day_number: number; title: string | null };

export type ReminderPlan = {
  kind: ReminderKind;
  /** The devotional the push opens. */
  target: PlanDevotional;
  /** 1-based day of the six-day calendar (7+ after the week). */
  calendarDay: number;
  /** Unfinished days left in this sermon's journey. */
  remaining: number;
  dedupeKey: string;
  /**
   * Extra key to record when this ping doubles as the mid-week "behind" nudge,
   * so the pastor dashboard (`pastor_midweek_nudge_status`) still counts it.
   */
  midweekKey: string | null;
};

/** Calendar days (0-based diff from the sermon date) that get a post-week catch-up nudge. */
export const CATCHUP_DIFFS: Record<number, 'catchup1' | 'catchup2'> = {
  7: 'catchup1', // calendar day 8
  11: 'catchup2', // calendar day 12
};

export function planReminder(opts: {
  sermonId: string;
  anchorYmd: string;
  todayYmd: string;
  devotionals: PlanDevotional[];
  completedIds: Set<string>;
  /** Member already received the one-shot "Day 1 is ready" push for this sermon. */
  gotNewWeekPush: boolean;
}): ReminderPlan | null {
  const { sermonId, anchorYmd, todayYmd, completedIds } = opts;
  const days = [...opts.devotionals].sort((a, b) => a.day_number - b.day_number);
  const unfinished = days.filter((d) => !completedIds.has(d.id));
  if (unfinished.length === 0) return null;

  const diff = cycleDiffDays(anchorYmd, todayYmd);
  if (diff < 0) return null;
  const calendarDay = diff + 1;
  const remaining = unfinished.length;

  const expected = expectedDayInSixDayWindow(diff);
  if (expected != null) {
    // Sermon week: only days up to today's calendar day are open.
    const target = unfinished.find((d) => d.day_number <= expected);
    if (!target) return null; // caught up — nothing open to do today
    if (calendarDay === 1 && opts.gotNewWeekPush) return null; // "Day 1 is ready" already went out
    const completedCount = days.length - remaining;
    const midweekKey =
      isMidweekCatchupWindow(diff) && isMoreThanOneDayBehind(expected, completedCount)
        ? midweekBehindDedupeKey(sermonId)
        : null;
    return {
      kind: target.day_number === expected ? 'today' : 'behind',
      target,
      calendarDay,
      remaining,
      dedupeKey: `daily-${sermonId}-${todayYmd}`,
      midweekKey,
    };
  }

  const catchup = CATCHUP_DIFFS[diff];
  if (!catchup) return null; // after the week: silent except the two catch-up days
  return {
    kind: catchup,
    target: unfinished[0],
    calendarDay,
    remaining,
    dedupeKey: `${catchup}-${sermonId}`,
    midweekKey: null,
  };
}

/** "Day 3 — Grace Under Pressure" → "Grace Under Pressure" (the push already names the day). */
export function devotionalTopic(title: string | null | undefined): string | null {
  const stripped = title?.trim().replace(/^(day|d[ií]a|jour)\s*\d+\s*[—–:-]\s*/i, '').trim();
  if (!stripped || stripped.toLowerCase() === 'title') return null;
  return stripped;
}
