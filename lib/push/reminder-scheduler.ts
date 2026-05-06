import { differenceInCalendarDays, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { ExpoPushMessage } from '@/lib/push/expo-push';
import { sendExpoPushMessages } from '@/lib/push/expo-push';

export type ReminderTickResult = {
  spacedSent: number;
  middaySent: number;
  skippedNoServiceRole: boolean;
};

const DEFAULT_TZ = 'America/New_York';

const SPACED_HOUR_START = 8;
const SPACED_HOUR_END = 10;

const MIDDAY_HOUR_START = 12;
const MIDDAY_HOUR_END = 14;

type SermonRow = {
  id: string;
  church_id: string;
  sermon_date: string | null;
  created_at: string;
  title: string;
};

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

function cycleDayIndex(anchorStr: string, todayStr: string): number | null {
  const diff = differenceInCalendarDays(parseISO(todayStr), parseISO(anchorStr));
  if (diff < 0 || diff > 5) return null;
  return diff + 1;
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
 * Hourly cron: spaced reminders on cycle days 1/3/6 (morning local), midday nudge (12–14 local).
 * Uses church.timezone and latest ready sermon per church as cycle anchor.
 */
export async function runDevotionalReminders(
  admin: SupabaseClient,
  now: Date = new Date(),
): Promise<ReminderTickResult> {
  let spacedSent = 0;
  let middaySent = 0;

  const { data: sermonRows } = await admin
    .from('sermons')
    .select('id, church_id, sermon_date, created_at, title')
    .eq('status', 'ready')
    .order('created_at', { ascending: false });

  const latestSermonByChurch = new Map<string, SermonRow>();
  for (const s of (sermonRows ?? []) as SermonRow[]) {
    if (!latestSermonByChurch.has(s.church_id)) {
      latestSermonByChurch.set(s.church_id, s);
    }
  }

  const { data: tokenRows } = await admin.from('user_push_tokens').select('expo_push_token, user_id');

  if (!tokenRows?.length) {
    return { spacedSent, middaySent, skippedNoServiceRole: false };
  }

  const userIds = Array.from(new Set(tokenRows.map((t) => t.user_id as string)));

  const { data: profiles } = await admin
    .from('users')
    .select('id, church_id, churches(timezone)')
    .in('id', userIds);

  const profileMap = new Map<
    string,
    { church_id: string | null; tz: string }
  >();
  for (const p of profiles ?? []) {
    const row = p as {
      id: string;
      church_id: string | null;
      churches: { timezone: string } | { timezone: string }[] | null;
    };
    const embed = row.churches;
    const tzRaw = Array.isArray(embed) ? embed[0]?.timezone : embed?.timezone;
    const tz = safeTz(tzRaw ?? undefined);
    profileMap.set(row.id, { church_id: row.church_id, tz });
  }

  for (const tr of tokenRows) {
    const token = tr.expo_push_token as string;
    const uid = tr.user_id as string;
    if (!token) continue;

    const profile = profileMap.get(uid);
    const churchId = profile?.church_id;
    if (!churchId) continue;

    const tz = profile?.tz ?? DEFAULT_TZ;
    const sermon = latestSermonByChurch.get(churchId);
    if (!sermon) continue;

    const todayStr = localDateInTz(now, tz);
    const anchorStr = anchorDateString(sermon, tz);
    const cycleDay = cycleDayIndex(anchorStr, todayStr);
    if (cycleDay == null) continue;

    const hour = localHourInTz(now, tz);

    const { data: devRow } = await admin
      .from('devotionals')
      .select('id')
      .eq('sermon_id', sermon.id)
      .eq('day_number', cycleDay)
      .maybeSingle();

    const devotionalId = devRow?.id as string | undefined;
    if (!devotionalId) continue;

    const { data: prog } = await admin
      .from('user_progress')
      .select('completed_at')
      .eq('user_id', uid)
      .eq('devotional_id', devotionalId)
      .maybeSingle();

    if (prog?.completed_at) continue;

    const shortTitle =
      sermon.title.length > 80 ? `${sermon.title.slice(0, 77)}…` : sermon.title;

    let msg: ExpoPushMessage | null = null;
    let dedupeKey: string | null = null;
    let kind: 'spaced' | 'midday' | null = null;

    if (
      [1, 3, 6].includes(cycleDay) &&
      hour >= SPACED_HOUR_START &&
      hour < SPACED_HOUR_END
    ) {
      dedupeKey = `spaced-${sermon.id}-${todayStr}-d${cycleDay}`;
      kind = 'spaced';
      msg = {
        to: token,
        title: `Day ${cycleDay} — spaced rhythm`,
        body: `Take a few minutes for today’s devotional: ${shortTitle}`,
        sound: 'default',
        data: {
          kind: 'spaced_reminder',
          sermonId: sermon.id,
          dayNumber: cycleDay,
        },
      };
    } else if (hour >= MIDDAY_HOUR_START && hour < MIDDAY_HOUR_END) {
      dedupeKey = `midday-${sermon.id}-${todayStr}`;
      kind = 'midday';
      msg = {
        to: token,
        title: 'Still time today',
        body: `Your Day ${cycleDay} devotional is waiting — ${shortTitle}`,
        sound: 'default',
        data: {
          kind: 'midday_nudge',
          sermonId: sermon.id,
          dayNumber: cycleDay,
        },
      };
    }

    if (!msg || !dedupeKey || !kind) continue;

    const reserved = await tryReserveDedupe(admin, uid, dedupeKey);
    if (!reserved) continue;

    await sendExpoPushMessages([msg]);
    if (kind === 'spaced') spacedSent += 1;
    else middaySent += 1;
  }

  return { spacedSent, middaySent, skippedNoServiceRole: false };
}
