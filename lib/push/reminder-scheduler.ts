import { differenceInCalendarDays, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { ExpoPushMessage } from '@/lib/push/expo-push';
import { sendExpoPushMessages } from '@/lib/push/expo-push';
import { pruneStalePushTokens } from '@/lib/rate-limit';

export type ReminderTickResult = {
  morningSent: number;
  middaySent: number;
  customHourSent: number;
  skippedNoServiceRole: boolean;
};

const DEFAULT_TZ = 'America/New_York';

const DEFAULT_MORNING_START = 8;
const DEFAULT_MORNING_END = 10;

const MIDDAY_HOUR_START = 12;
const MIDDAY_HOUR_END = 14;

type SermonRow = {
  id: string;
  church_id: string;
  sermon_date: string | null;
  created_at: string;
  title: string;
};

type DevotionalRef = { id: string; sermon_id: string; day_number: number };

function safeTz(raw: string | null | undefined): string {
  if (!raw?.trim()) return DEFAULT_TZ;
  try {
    formatInTimeZone(new Date(), raw.trim(), 'yyyy-MM-dd');
    return raw.trim();
  } catch {
    return DEFAULT_TZ;
  }
}

function localDateInTz(now: Date, tz: string): string {
  return formatInTimeZone(now, tz, 'yyyy-MM-dd');
}

function localHourInTz(now: Date, tz: string): number {
  return Number(formatInTimeZone(now, tz, 'H'));
}

function anchorDateString(sermon: SermonRow, tz: string): string {
  if (sermon.sermon_date) return sermon.sermon_date;
  return formatInTimeZone(new Date(sermon.created_at), tz, 'yyyy-MM-dd');
}

/** Max day number (1–6) calendar unlock allows (matches mobile `calendarMaxUnlockedDay`). */
function maxUnlockedDayNumber(anchorStr: string, todayStr: string): number {
  const diff = differenceInCalendarDays(parseISO(todayStr), parseISO(anchorStr));
  if (diff < 0) return 1;
  if (diff >= 6) return 6;
  return Math.min(6, diff + 1);
}

function firstIncompleteInWindow(
  sermonId: string,
  maxDay: number,
  devsBySermon: Map<string, DevotionalRef[]>,
  completedDevotionalIds: Set<string>,
): DevotionalRef | null {
  const list = [...(devsBySermon.get(sermonId) ?? [])].sort((a, b) => a.day_number - b.day_number);
  for (const d of list) {
    if (d.day_number > maxDay) break;
    if (!completedDevotionalIds.has(d.id)) return d;
  }
  return null;
}

async function tryReserveDedupe(
  admin: SupabaseClient,
  userId: string,
  dedupeKey: string,
): Promise<boolean> {
  const { error } = await admin.from('push_notification_dedupe').insert({
    user_id: userId,
    dedupe_key: dedupeKey,
  });
  if (!error) return true;
  if (error.code === '23505') return false;
  console.warn('[reminders] dedupe insert', error.message);
  return false;
}

/**
 * Hourly cron: reminds members of the first incomplete devotional they can open today
 * (calendar window + post-week catch-up, aligned with the mobile app).
 *
 * - Users with `devotional_notify_hour` set get one ping that hour (church timezone).
 * - Others get default morning (8–10) and midday (12–14) windows.
 */
export async function runDevotionalReminders(
  admin: SupabaseClient,
  now: Date = new Date(),
): Promise<ReminderTickResult> {
  let morningSent = 0;
  let middaySent = 0;
  let customHourSent = 0;

  const { data: sermonRows } = await admin
    .from('sermons')
    .select('id, church_id, sermon_date, created_at, title')
    .eq('status', 'ready')
    .eq('workflow_status', 'published')
    .order('created_at', { ascending: false });

  const latestSermonByChurch = new Map<string, SermonRow>();
  for (const s of (sermonRows ?? []) as SermonRow[]) {
    if (!latestSermonByChurch.has(s.church_id)) {
      latestSermonByChurch.set(s.church_id, s);
    }
  }

  const sermonIdList = Array.from(latestSermonByChurch.values()).map((s) => s.id);
  if (sermonIdList.length === 0) {
    return { morningSent, middaySent, customHourSent, skippedNoServiceRole: false };
  }

  const { data: devRows } = await admin
    .from('devotionals')
    .select('id, sermon_id, day_number')
    .in('sermon_id', sermonIdList)
    .order('day_number', { ascending: true });

  const devsBySermon = new Map<string, DevotionalRef[]>();
  const allDevotionalIds: string[] = [];
  for (const row of devRows ?? []) {
    const r = row as DevotionalRef;
    allDevotionalIds.push(r.id);
    const arr = devsBySermon.get(r.sermon_id) ?? [];
    arr.push(r);
    devsBySermon.set(r.sermon_id, arr);
  }

  const { data: tokenRows } = await admin.from('user_push_tokens').select('expo_push_token, user_id');

  if (!tokenRows?.length || allDevotionalIds.length === 0) {
    return { morningSent, middaySent, customHourSent, skippedNoServiceRole: false };
  }

  const userIds = Array.from(new Set(tokenRows.map((t) => t.user_id as string)));

  const { data: profiles } = await admin
    .from('users')
    .select(
      'id, church_id, devotional_notify_hour, devotional_notify_enabled, churches(timezone)',
    )
    .in('id', userIds);

  const profileMap = new Map<
    string,
    {
      church_id: string | null;
      tz: string;
      notifyHour: number | null;
      notifyEnabled: boolean;
    }
  >();
  for (const p of profiles ?? []) {
    const row = p as {
      id: string;
      church_id: string | null;
      devotional_notify_hour: number | null;
      devotional_notify_enabled: boolean | null;
      churches: { timezone: string } | { timezone: string }[] | null;
    };
    const embed = row.churches;
    const tzRaw = Array.isArray(embed) ? embed[0]?.timezone : embed?.timezone;
    const tz = safeTz(tzRaw ?? undefined);
    profileMap.set(row.id, {
      church_id: row.church_id,
      tz,
      notifyHour:
        typeof row.devotional_notify_hour === 'number' &&
        row.devotional_notify_hour >= 0 &&
        row.devotional_notify_hour <= 23
          ? row.devotional_notify_hour
          : null,
      notifyEnabled: row.devotional_notify_enabled !== false,
    });
  }

  const { data: progRows } = await admin
    .from('user_progress')
    .select('user_id, devotional_id, completed_at')
    .in('user_id', userIds)
    .in('devotional_id', allDevotionalIds);

  const completedByUser = new Map<string, Set<string>>();
  for (const pr of progRows ?? []) {
    if (!pr.completed_at) continue;
    const uid = pr.user_id as string;
    const did = pr.devotional_id as string;
    if (!completedByUser.has(uid)) completedByUser.set(uid, new Set());
    completedByUser.get(uid)!.add(did);
  }

  for (const tr of tokenRows) {
    const token = tr.expo_push_token as string;
    const uid = tr.user_id as string;
    if (!token) continue;

    const profile = profileMap.get(uid);
    const churchId = profile?.church_id;
    if (!churchId || !profile.notifyEnabled) continue;

    const tz = profile.tz ?? DEFAULT_TZ;
    const sermon = latestSermonByChurch.get(churchId);
    if (!sermon) continue;

    const todayStr = localDateInTz(now, tz);
    const anchorStr = anchorDateString(sermon, tz);
    const maxDay = maxUnlockedDayNumber(anchorStr, todayStr);
    const completedSet = completedByUser.get(uid) ?? new Set<string>();
    const target = firstIncompleteInWindow(sermon.id, maxDay, devsBySermon, completedSet);
    if (!target) continue;

    const hour = localHourInTz(now, tz);
    const shortTitle =
      sermon.title.length > 80 ? `${sermon.title.slice(0, 77)}…` : sermon.title;

    const cycleDay = target.day_number;
    const missedEarlier = cycleDay >= 2;

    let msg: ExpoPushMessage | null = null;
    let dedupeKey: string | null = null;
    let kind: 'morning' | 'midday' | 'custom' | null = null;

    const customHour = profile.notifyHour;

    if (customHour != null) {
      if (hour === customHour) {
        dedupeKey = `custom-${sermon.id}-${todayStr}-d${cycleDay}`;
        kind = 'custom';
        const title = missedEarlier ? 'Still time to catch up' : 'Your devotional today';
        const body = missedEarlier
          ? `Days 1–${cycleDay} are open when you are ready — ${shortTitle}`
          : `Day ${cycleDay} of 6 — ${shortTitle}`;
        msg = {
          to: token,
          title,
          body,
          sound: 'default',
          data: {
            kind: 'devotional_reminder',
            sermonId: sermon.id,
            dayNumber: cycleDay,
            slot: 'preferred_hour',
          },
        };
      }
    } else if (
      cycleDay >= 1 &&
      cycleDay <= 6 &&
      hour >= DEFAULT_MORNING_START &&
      hour < DEFAULT_MORNING_END
    ) {
      dedupeKey = `morning-${sermon.id}-${todayStr}-d${cycleDay}`;
      kind = 'morning';
      const title = missedEarlier ? 'Pick up where you left off' : 'Your devotional today';
      const body = missedEarlier
        ? `You can still open Days 1–${cycleDay} — ${shortTitle}`
        : `Day ${cycleDay} of 6 — ${shortTitle}`;
      msg = {
        to: token,
        title,
        body,
        sound: 'default',
        data: {
          kind: 'devotional_reminder',
          sermonId: sermon.id,
          devotionalId: target.id,
          dayNumber: cycleDay,
          slot: 'morning',
        },
      };
    } else if (hour >= MIDDAY_HOUR_START && hour < MIDDAY_HOUR_END) {
      dedupeKey = `midday-${sermon.id}-${todayStr}-d${cycleDay}`;
      kind = 'midday';
      msg = {
        to: token,
        title: missedEarlier ? 'Grace for your rhythm' : 'Still time today',
        body: missedEarlier
          ? `No rush — finish Day ${cycleDay} (or any earlier day) when you can — ${shortTitle}`
          : `Finish Day ${cycleDay} when you can — ${shortTitle}`,
        sound: 'default',
        data: {
          kind: 'devotional_reminder',
          sermonId: sermon.id,
          devotionalId: target.id,
          dayNumber: cycleDay,
          slot: 'midday',
        },
      };
    }

    if (!msg || !dedupeKey || !kind) continue;

    const reserved = await tryReserveDedupe(admin, uid, dedupeKey);
    if (!reserved) continue;

    const { staleTokens } = await sendExpoPushMessages([msg]);
    await pruneStalePushTokens(admin, staleTokens);
    if (kind === 'morning') morningSent += 1;
    else if (kind === 'midday') middaySent += 1;
    else customHourSent += 1;
  }

  return { morningSent, middaySent, customHourSent, skippedNoServiceRole: false };
}
