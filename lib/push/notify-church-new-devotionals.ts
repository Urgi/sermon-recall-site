import { formatInTimeZone } from 'date-fns-tz';
import type { SupabaseClient } from '@supabase/supabase-js';

import { sendExpoPushMessages } from '@/lib/push/expo-push';
import { pruneStalePushTokens } from '@/lib/rate-limit';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type NotifyChurchNewDevotionalsParams = {
  churchId: string;
  sermonId: string;
  sermonTitle: string;
  /** Deep-link to Day 1 when available. */
  day1DevotionalId?: string | null;
  /** Omit notifications to this user (e.g. the publishing pastor). */
  excludeUserId?: string;
  /**
   * When true (default), skip users who turned off daily reminders.
   * Church-wide “new week” announcements still honor the opt-out.
   */
  respectNotifyEnabled?: boolean;
};

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

export function newWeekDedupeKey(sermonId: string): string {
  return `new-week-${sermonId}`;
}

/**
 * Loads Expo tokens for church members and sends a single batched push per chunk.
 * No-ops when service role is not configured or no tokens exist.
 * Uses per-user dedupe so each member gets at most one “new week / Day 1” ping per sermon.
 */
export async function notifyChurchNewDevotionals(
  params: NotifyChurchNewDevotionalsParams,
): Promise<{ sent: number }> {
  try {
    return await notifyChurchNewDevotionalsInner(params);
  } catch (e) {
    console.warn('[notify-church-new-devotionals]', e);
    return { sent: 0 };
  }
}

async function notifyChurchNewDevotionalsInner(
  params: NotifyChurchNewDevotionalsParams,
): Promise<{ sent: number }> {
  const admin = createServiceRoleClient();
  if (!admin) return { sent: 0 };

  let query = admin
    .from('users')
    .select('id, devotional_notify_enabled, user_push_tokens(expo_push_token)')
    .eq('church_id', params.churchId);

  if (params.excludeUserId) {
    query = query.neq('id', params.excludeUserId);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.warn('[notify-church-new-devotionals]', error.message);
    return { sent: 0 };
  }

  const respectNotify = params.respectNotifyEnabled !== false;
  const recipients: { userId: string; token: string }[] = [];
  for (const r of rows ?? []) {
    const row = r as {
      id: string;
      devotional_notify_enabled: boolean | null;
      user_push_tokens:
        | { expo_push_token: string }
        | { expo_push_token: string }[]
        | null
        | undefined;
    };
    if (respectNotify && row.devotional_notify_enabled === false) continue;
    const embed = row.user_push_tokens;
    const tokens = !embed
      ? []
      : Array.isArray(embed)
        ? embed.map((e) => e.expo_push_token)
        : [embed.expo_push_token];
    for (const token of tokens) {
      if (typeof token === 'string' && token.length > 0) {
        recipients.push({ userId: row.id, token });
      }
    }
  }

  if (recipients.length === 0) return { sent: 0 };

  const shortTitle =
    params.sermonTitle.length > 100
      ? `${params.sermonTitle.slice(0, 97)}…`
      : params.sermonTitle;
  const title = 'Day 1 is ready';
  const body = `Start this week’s journey — ${shortTitle}`;
  const dedupeKey = newWeekDedupeKey(params.sermonId);

  const messages = [];
  const staleAll: string[] = [];
  let sent = 0;

  for (const recipient of recipients) {
    const reserved = await tryReserveUserDedupe(admin, recipient.userId, dedupeKey);
    if (!reserved) continue;

    const { staleTokens } = await sendExpoPushMessages([
      {
        to: recipient.token,
        title,
        body,
        sound: 'default',
        data: {
          kind: 'new_devotionals',
          sermonId: params.sermonId,
          ...(params.day1DevotionalId
            ? { devotionalId: params.day1DevotionalId, dayNumber: 1 }
            : {}),
        },
      },
    ]);
    staleAll.push(...staleTokens);
    sent += 1;
  }

  await pruneStalePushTokens(admin, staleAll);
  return { sent };
}

async function tryReserveUserDedupe(
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
  console.warn('[notify-church-new-devotionals] dedupe', error.message);
  return false;
}

/**
 * Send the church-wide Day 1 / new-week push when the cycle’s first day is today
 * (or already open). Returns whether a send was attempted now vs deferred to cron.
 */
export async function notifyNewWeekDay1IfReady(params: {
  churchId: string;
  sermonId: string;
  sermonTitle: string;
  sermonDate: string | null | undefined;
  churchTimeZone: string | null | undefined;
  publishedAtIso?: string | null;
  excludeUserId?: string;
  now?: Date;
}): Promise<{ status: 'sent' | 'deferred' | 'noop'; sent: number }> {
  const admin = createServiceRoleClient();
  if (!admin) return { status: 'noop', sent: 0 };

  const tz = safeChurchTimeZone(params.churchTimeZone);
  const now = params.now ?? new Date();
  const todayYmd = localYmdInChurchTz(now, tz);
  const day1Ymd = firstDevotionalDayYmd({
    sermonDate: params.sermonDate,
    publishedAtIso: params.publishedAtIso,
    churchTimeZone: tz,
  });

  if (todayYmd < day1Ymd) {
    return { status: 'deferred', sent: 0 };
  }

  const { data: day1 } = await admin
    .from('devotionals')
    .select('id')
    .eq('sermon_id', params.sermonId)
    .eq('day_number', 1)
    .maybeSingle();

  const { sent } = await notifyChurchNewDevotionals({
    churchId: params.churchId,
    sermonId: params.sermonId,
    sermonTitle: params.sermonTitle,
    day1DevotionalId: (day1 as { id?: string } | null)?.id ?? null,
    excludeUserId: params.excludeUserId,
  });

  return { status: 'sent', sent };
}

/**
 * Cron companion: for each church’s latest published sermon, send the one-shot
 * Day 1 / new-week announcement once the first day is open in church TZ.
 */
export async function runNewWeekDay1Notifications(
  admin: SupabaseClient,
  now: Date = new Date(),
): Promise<{ churchesChecked: number; sent: number; deferred: number }> {
  const { data: sermonRows } = await admin
    .from('sermons')
    .select('id, church_id, sermon_date, created_at, published_at, title, churches(timezone)')
    .eq('workflow_status', 'published')
    .order('published_at', { ascending: false });

  const latestByChurch = new Map<
    string,
    {
      id: string;
      church_id: string;
      sermon_date: string | null;
      published_at: string | null;
      title: string;
      timezone: string | null;
    }
  >();

  for (const raw of sermonRows ?? []) {
    const s = raw as {
      id: string;
      church_id: string;
      sermon_date: string | null;
      published_at: string | null;
      title: string;
      churches: { timezone: string } | { timezone: string }[] | null;
    };
    if (latestByChurch.has(s.church_id)) continue;
    const embed = s.churches;
    const tz = Array.isArray(embed) ? embed[0]?.timezone : embed?.timezone;
    latestByChurch.set(s.church_id, {
      id: s.id,
      church_id: s.church_id,
      sermon_date: s.sermon_date,
      published_at: s.published_at,
      title: s.title,
      timezone: tz ?? null,
    });
  }

  let sent = 0;
  let deferred = 0;
  for (const sermon of Array.from(latestByChurch.values())) {
    const result = await notifyNewWeekDay1IfReady({
      churchId: sermon.church_id,
      sermonId: sermon.id,
      sermonTitle: sermon.title || 'New sermon',
      sermonDate: sermon.sermon_date,
      churchTimeZone: sermon.timezone,
      publishedAtIso: sermon.published_at,
      now,
    });
    if (result.status === 'deferred') deferred += 1;
    sent += result.sent;
  }

  return { churchesChecked: latestByChurch.size, sent, deferred };
}
