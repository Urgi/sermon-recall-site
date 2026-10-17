import { formatInTimeZone } from 'date-fns-tz';

import type { SupabaseClient } from '@supabase/supabase-js';

import { reminderPushCopy } from '@/lib/i18n/push-copy';
import type { ExpoPushMessage } from '@/lib/push/expo-push';
import { sendExpoPushMessages } from '@/lib/push/expo-push';
import { newWeekDedupeKey } from '@/lib/push/notify-church-new-devotionals';
import { devotionalTopic, planReminder, type PlanDevotional, type ReminderKind } from '@/lib/push/reminder-plan';
import { pruneStalePushTokens } from '@/lib/rate-limit';

export type ReminderTickResult = {
  sent: Record<ReminderKind, number>;
  skippedNoServiceRole: boolean;
  diagnostics: {
    publishedChurches: number;
    pushTokens: number;
    devotionals: number;
    skippedNotifyOff: number;
    skippedNoSermon: number;
    /** Nothing to send today: all done, caught up, or outside the sermon week + catch-up days. */
    skippedNothingDue: number;
    skippedWrongHour: number;
    skippedDedupe: number;
    skippedNoProfile: number;
    profileLoadError: string | null;
    serverTime: string;
  };
};

const DEFAULT_TZ = 'America/New_York';

/** Members on "defaults" get one reminder at this local hour (matches the app's 7:00 AM default). */
const DEFAULT_NOTIFY_HOUR = 7;

type SermonRow = {
  id: string;
  church_id: string;
  sermon_date: string | null;
  created_at: string;
  title: string;
};

type DevotionalRef = PlanDevotional & { sermon_id: string };

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

function emptySent(): Record<ReminderKind, number> {
  return { today: 0, behind: 0, catchup1: 0, catchup2: 0 };
}

function emptyResult(
  now: Date,
  partial: Partial<ReminderTickResult['diagnostics']> = {},
): ReminderTickResult {
  return {
    sent: emptySent(),
    skippedNoServiceRole: false,
    diagnostics: {
      publishedChurches: 0,
      pushTokens: 0,
      devotionals: 0,
      skippedNotifyOff: 0,
      skippedNoSermon: 0,
      skippedNothingDue: 0,
      skippedWrongHour: 0,
      skippedDedupe: 0,
      skippedNoProfile: 0,
      profileLoadError: null,
      serverTime: now.toISOString(),
      ...partial,
    },
  };
}

/**
 * Hourly cron. Each member gets at most one devotional reminder a day, at their chosen hour
 * (or 7:00 AM local), following the schedule in `reminder-plan.ts`:
 * daily during the sermon week, two catch-up nudges after it, then silence until the next sermon.
 *
 * - The hour uses the member's device time zone; which day is open uses the church time zone.
 * - Only the church's latest published sermon is considered.
 */
export async function runDevotionalReminders(
  admin: SupabaseClient,
  now: Date = new Date(),
): Promise<ReminderTickResult> {
  const sent = emptySent();
  let skippedNotifyOff = 0;
  let skippedNoSermon = 0;
  let skippedNothingDue = 0;
  let skippedWrongHour = 0;
  let skippedDedupe = 0;
  let skippedNoProfile = 0;

  const { data: sermonRows } = await admin
    .from('sermons')
    .select('id, church_id, sermon_date, created_at, title')
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
    return emptyResult(now, { publishedChurches: 0, pushTokens: 0, devotionals: 0 });
  }

  const { data: devRows } = await admin
    .from('devotionals')
    .select('id, sermon_id, day_number, title')
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
    return emptyResult(now, {
      publishedChurches: latestSermonByChurch.size,
      pushTokens: tokenRows?.length ?? 0,
      devotionals: allDevotionalIds.length,
    });
  }

  const userIds = Array.from(new Set(tokenRows.map((t) => t.user_id as string)));

  const { data: profiles, error: profilesError } = await admin
    .from('users')
    .select(
      'id, church_id, preferred_language, timezone, devotional_notify_hour, devotional_notify_enabled, churches!users_church_id_fkey(timezone)',
    )
    .in('id', userIds);

  if (profilesError) {
    console.warn('[reminders] load profiles', profilesError.message);
    return emptyResult(now, {
      publishedChurches: latestSermonByChurch.size,
      pushTokens: tokenRows.length,
      devotionals: allDevotionalIds.length,
      profileLoadError: profilesError.message,
    });
  }

  const profileMap = new Map<
    string,
    {
      church_id: string | null;
      churchTz: string;
      notifyTz: string;
      notifyHour: number;
      notifyEnabled: boolean;
      preferredLanguage: string | null;
    }
  >();
  for (const p of profiles ?? []) {
    const row = p as {
      id: string;
      church_id: string | null;
      preferred_language?: string | null;
      timezone?: string | null;
      devotional_notify_hour: number | null;
      devotional_notify_enabled: boolean | null;
      churches: { timezone: string } | { timezone: string }[] | null;
    };
    const embed = row.churches;
    const tzRaw = Array.isArray(embed) ? embed[0]?.timezone : embed?.timezone;
    const churchTz = safeTz(tzRaw ?? undefined);
    const notifyTz = safeTz(row.timezone?.trim() || churchTz);
    profileMap.set(row.id, {
      church_id: row.church_id,
      preferredLanguage: row.preferred_language ?? null,
      churchTz,
      notifyTz,
      notifyHour:
        typeof row.devotional_notify_hour === 'number' &&
        row.devotional_notify_hour >= 0 &&
        row.devotional_notify_hour <= 23
          ? row.devotional_notify_hour
          : DEFAULT_NOTIFY_HOUR,
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

  /** Who already got the one-shot "Day 1 is ready" push, so Day 1 isn't announced twice. */
  const { data: newWeekRows } = await admin
    .from('push_notification_dedupe')
    .select('user_id, dedupe_key')
    .in('user_id', userIds)
    .in('dedupe_key', sermonIdList.map(newWeekDedupeKey));
  const gotNewWeek = new Set(
    (newWeekRows ?? []).map((r) => `${r.user_id as string}:${r.dedupe_key as string}`),
  );

  for (const tr of tokenRows) {
    const token = tr.expo_push_token as string;
    const uid = tr.user_id as string;
    if (!token) continue;

    const profile = profileMap.get(uid);
    if (!profile) {
      skippedNoProfile += 1;
      continue;
    }
    if (!profile.church_id || !profile.notifyEnabled) {
      if (!profile.notifyEnabled) skippedNotifyOff += 1;
      continue;
    }

    const sermon = latestSermonByChurch.get(profile.church_id);
    if (!sermon) {
      skippedNoSermon += 1;
      continue;
    }

    if (localHourInTz(now, profile.notifyTz) !== profile.notifyHour) {
      skippedWrongHour += 1;
      continue;
    }

    const todayStr = localDateInTz(now, profile.churchTz);
    const plan = planReminder({
      sermonId: sermon.id,
      anchorYmd: anchorDateString(sermon, profile.churchTz),
      todayYmd: todayStr,
      devotionals: devsBySermon.get(sermon.id) ?? [],
      completedIds: completedByUser.get(uid) ?? new Set<string>(),
      gotNewWeekPush: gotNewWeek.has(`${uid}:${newWeekDedupeKey(sermon.id)}`),
    });
    if (!plan) {
      skippedNothingDue += 1;
      continue;
    }

    const reserved = await tryReserveDedupe(admin, uid, plan.dedupeKey);
    if (!reserved) {
      skippedDedupe += 1;
      continue;
    }
    // Doubles as the mid-week "behind" nudge for the pastor dashboard; a duplicate is fine.
    if (plan.midweekKey) await tryReserveDedupe(admin, uid, plan.midweekKey);

    const copy = reminderPushCopy(profile.preferredLanguage, plan.kind, {
      sermonTitle: sermon.title,
      targetDay: plan.target.day_number,
      calendarDay: plan.calendarDay,
      topic: devotionalTopic(plan.target.title),
      remaining: plan.remaining,
    });
    const msg: ExpoPushMessage = {
      to: token,
      title: copy.title,
      body: copy.body,
      sound: 'default',
      data: {
        kind: 'devotional_reminder',
        sermonId: sermon.id,
        devotionalId: plan.target.id,
        dayNumber: plan.target.day_number,
        slot: plan.kind,
      },
    };

    const { staleTokens } = await sendExpoPushMessages([msg]);
    await pruneStalePushTokens(admin, staleTokens);
    sent[plan.kind] += 1;
  }

  return {
    sent,
    skippedNoServiceRole: false,
    diagnostics: {
      publishedChurches: latestSermonByChurch.size,
      pushTokens: tokenRows.length,
      devotionals: allDevotionalIds.length,
      skippedNotifyOff,
      skippedNoSermon,
      skippedNothingDue,
      skippedWrongHour,
      skippedDedupe,
      skippedNoProfile,
      profileLoadError: null,
      serverTime: now.toISOString(),
    },
  };
}
