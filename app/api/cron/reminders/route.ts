import { NextResponse } from 'next/server';

import { authorizeCronRequest } from '@/lib/cron-auth';
import { runDevotionalReminders } from '@/lib/push/reminder-scheduler';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Call hourly from Vercel Cron or any scheduler:
 *   Authorization: Bearer <CRON_SECRET>
 * Requires SUPABASE_SERVICE_ROLE_KEY + CRON_SECRET.
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
    const result = await runDevotionalReminders(admin);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.warn('[cron/reminders]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
