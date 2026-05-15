import { NextResponse } from 'next/server';

import { sendPastorBroadcastAndLog } from '@/lib/push/pastor-broadcast-send';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Vercel Cron: send due scheduled church notifications.
 * Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_SERVICE_ROLE_KEY.', skippedNoServiceRole: true },
      { status: 503 },
    );
  }

  const nowIso = new Date().toISOString();

  const { data: due, error: selErr } = await admin
    .from('scheduled_church_notifications')
    .select('id, church_id, created_by, title, body')
    .is('sent_at', null)
    .lte('send_at', nowIso)
    .order('send_at', { ascending: true })
    .limit(25);

  if (selErr) {
    console.warn('[cron/scheduled-broadcasts]', selErr.message);
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }

  let sent = 0;
  for (const row of due ?? []) {
    const id = row.id as string;
    const churchId = row.church_id as string;
    const createdBy = row.created_by as string;
    const title = row.title as string;
    const body = row.body as string;

    try {
      await sendPastorBroadcastAndLog({
        admin,
        churchId,
        title,
        body,
        sentBy: createdBy,
        excludeFromPushUserId: createdBy,
      });
    } catch (e) {
      console.warn('[cron/scheduled-broadcasts] send', id, e);
      continue;
    }

    const { error: upErr } = await admin
      .from('scheduled_church_notifications')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', id);

    if (upErr) {
      console.warn('[cron/scheduled-broadcasts] mark sent', id, upErr.message);
    } else {
      sent += 1;
    }
  }

  return NextResponse.json({ ok: true, processed: (due ?? []).length, sent });
}
