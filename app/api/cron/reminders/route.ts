import { NextResponse } from 'next/server';

import { authorizeCronRequest } from '@/lib/cron-auth';
import { runNewWeekDay1Notifications } from '@/lib/push/notify-church-new-devotionals';
import { runDevotionalReminders } from '@/lib/push/reminder-scheduler';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Call hourly from Vercel Cron or any scheduler:
 *   Authorization: Bearer <CRON_SECRET>
 * Requires SUPABASE_SERVICE_ROLE_KEY + CRON_SECRET.
 *
 * Also sends one-shot “Day 1 / new week” pushes for sermons whose first
 * completable day has arrived (e.g. published early, waiting on sermon_date).
 */
export async function GET(req: Request) {
  const authResult = authorizeCronRequest(req);
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error, secretConfigured: authResult.secretConfigured },
      { status: authResult.status },
    );
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_SERVICE_ROLE_KEY.', skippedNoServiceRole: true },
      { status: 503 },
    );
  }

  try {
    const newWeek = await runNewWeekDay1Notifications(admin);
    const result = await runDevotionalReminders(admin);
    return NextResponse.json({ ok: true, newWeek, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.warn('[cron/reminders]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
