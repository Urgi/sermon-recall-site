import { formatInTimeZone } from 'date-fns-tz';
import type { SupabaseClient } from '@supabase/supabase-js';

import { sendExpoPushMessages } from '@/lib/push/expo-push';
import {
  cycleDiffDays,
  expectedDayInSixDayWindow,
  MIDWEEK_NUDGE_HOUR_END,
  MIDWEEK_NUDGE_HOUR_START,
  midweekBehindDedupeKey,
  shouldSendMidweekBehindNudge,
} from '@/lib/push/midweek-behind';
import { pruneStalePushTokens } from '@/lib/rate-limit';

const DEFAULT_TZ = 'America/New_York';

export type MidweekBehindNudgeResult = {
  sent: number;
  skippedWrongWindow: number;
  skippedNotBehind: number;
  skippedNotifyOff: number;
  skippedDedupe: number;
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
  console.warn('[midweek-behind] dedupe insert', error.message);
  return false;
}

type SermonRow = {
  id: string;
  church_id: string;
  sermon_date: string | null;
  created_at: string;
  title: string;
};

/**
 * Once per sermon, midday church time, Days 4–6: nudge members more than one day behind.
 */
export async function runMidweekBehindNudges(
  admin: SupabaseClient,
  now: Date = new Date(),
): Promise<MidweekBehindNudgeResult> {
  const result: MidweekBehindNudgeResult = {
    sent: 0,
    skippedWrongWindow: 0,
    skippedNotBehind: 0,
    skippedNotifyOff: 0,
    skippedDedupe: 0,
  };

  const { data: sermonRows } = await admin
    .from('sermons')
    .select('id, church_id, sermon_date, created_at, title')
    .eq('workflow_status', 'published')
    .order('created_at', { ascending: false });

  const latestByChurch = new Map<string, SermonRow>();
  for (const s of (sermonRows ?? []) as SermonRow[]) {
    if (!latestByChurch.has(s.church_id)) latestByChurch.set(s.church_id, s);
  }
  const sermonIds = Array.from(latestByChurch.values()).map((s) => s.id);
  if (sermonIds.length === 0) return result;

  const { data: churches } = await admin
    .from('churches')
    .select('id, timezone')
    .in('id', Array.from(latestByChurch.keys()));
  const tzByChurch = new Map<string, string>();
  for (const c of churches ?? []) {
    tzByChurch.set(c.id as string, safeTz((c as { timezone?: string }).timezone));
  }

  const { data: devRows } = await admin
    .from('devotionals')
    .select('id, sermon_id')
    .in('sermon_id', sermonIds);

  const devIdsBySermon = new Map<string, string[]>();
  for (const d of devRows ?? []) {
    const sid = d.sermon_id as string;
    const list = devIdsBySermon.get(sid) ?? [];
    list.push(d.id as string);
    devIdsBySermon.set(sid, list);
  }
  const allDevIds = Array.from(devIdsBySermon.values()).flat();
  if (allDevIds.length === 0) return result;

  const { data: tokenRows } = await admin.from('user_push_tokens').select('expo_push_token, user_id');
  if (!tokenRows?.length) return result;

  const userIds = Array.from(new Set(tokenRows.map((t) => t.user_id as string)));
  const { data: profiles } = await admin
    .from('users')
    .select('id, church_id, devotional_notify_enabled')
    .in('id', userIds);

  const profileMap = new Map<
    string,
    { church_id: string | null; notifyEnabled: boolean }
  >();
  for (const p of profiles ?? []) {
    const row = p as { id: string; church_id: string | null; devotional_notify_enabled: boolean | null };
    profileMap.set(row.id, {
      church_id: row.church_id,
      notifyEnabled: row.devotional_notify_enabled !== false,
    });
  }

  const { data: progRows } = await admin
    .from('user_progress')
    .select('user_id, devotional_id, completed_at')
    .in('user_id', userIds)
    .in('devotional_id', allDevIds);

  const completedByUserSermon = new Map<string, number>();
  const sermonOfDev = new Map<string, string>();
  for (const [sid, ids] of Array.from(devIdsBySermon.entries())) {
    for (const id of ids) sermonOfDev.set(id, sid);
  }
  for (const pr of progRows ?? []) {
    if (!pr.completed_at) continue;
    const sid = sermonOfDev.get(pr.devotional_id as string);
    if (!sid) continue;
    const key = `${pr.user_id as string}:${sid}`;
    completedByUserSermon.set(key, (completedByUserSermon.get(key) ?? 0) + 1);
  }

  for (const tr of tokenRows) {
    const token = tr.expo_push_token as string;
    const uid = tr.user_id as string;
    if (!token) continue;

    const profile = profileMap.get(uid);
    if (!profile?.church_id) continue;
    if (!profile.notifyEnabled) {
      result.skippedNotifyOff += 1;
      continue;
    }

    const sermon = latestByChurch.get(profile.church_id);
    if (!sermon) continue;

    const tz = tzByChurch.get(profile.church_id) ?? DEFAULT_TZ;
    const todayStr = formatInTimeZone(now, tz, 'yyyy-MM-dd');
    const hour = Number(formatInTimeZone(now, tz, 'H'));
    const anchor =
      sermon.sermon_date?.trim() || formatInTimeZone(new Date(sermon.created_at), tz, 'yyyy-MM-dd');
    const cycleDiff = cycleDiffDays(anchor, todayStr);
    const completed = completedByUserSermon.get(`${uid}:${sermon.id}`) ?? 0;
    const expected = expectedDayInSixDayWindow(cycleDiff);

    if (
      !shouldSendMidweekBehindNudge({
        cycleDiff,
        completedCount: completed,
        localHour: hour,
      })
    ) {
      if (expected == null || hour < MIDWEEK_NUDGE_HOUR_START || hour >= MIDWEEK_NUDGE_HOUR_END) {
        result.skippedWrongWindow += 1;
      } else {
        result.skippedNotBehind += 1;
      }
      continue;
    }

    if (expected == null) continue;

    const reserved = await tryReserveDedupe(admin, uid, midweekBehindDedupeKey(sermon.id));
    if (!reserved) {
      result.skippedDedupe += 1;
      continue;
    }

    const shortTitle = sermon.title.length > 80 ? `${sermon.title.slice(0, 77)}…` : sermon.title;
    const { staleTokens } = await sendExpoPushMessages([
      {
        to: token,
        title: 'A little behind is still on the path',
        body: `You’re more than a day behind this week. Days 1–${expected} are open — pick up the next one when you can. ${shortTitle}`,
        sound: 'default',
        data: {
          kind: 'devotional_reminder',
          sermonId: sermon.id,
          dayNumber: expected,
          slot: 'behind_midweek',
        },
      },
    ]);
    await pruneStalePushTokens(admin, staleTokens);
    result.sent += 1;
  }

  return result;
}
