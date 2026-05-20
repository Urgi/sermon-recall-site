import { NextResponse } from 'next/server';

import type { AudienceType } from '@/lib/admin/workflow-status';
import type { StaffRole } from '@/lib/auth/permissions';
import { sendPastorBroadcastAndLog } from '@/lib/push/pastor-broadcast-send';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
    .select(
      'id, church_id, created_by, title, body, audience_type, target_staff_roles, include_all_members',
    )
    .eq('status', 'scheduled')
    .is('sent_at', null)
    .lte('send_at', nowIso)
    .order('send_at', { ascending: true })
    .limit(25);

  if (selErr) {
    console.warn('[cron/scheduled-broadcasts]', selErr.message);
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const row of due ?? []) {
    const id = row.id as string;

    const { data: claimed, error: claimErr } = await admin
      .from('scheduled_church_notifications')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'scheduled')
      .select('id')
      .maybeSingle();

    if (claimErr || !claimed) continue;

    try {
      const targetRoles = row.target_staff_roles as StaffRole[] | null;
      const useRoles = Array.isArray(targetRoles) && targetRoles.length > 0;

      const { recipientCount, pushTicketErrors } = await sendPastorBroadcastAndLog({
        admin,
        churchId: row.church_id as string,
        title: row.title as string,
        body: row.body as string,
        sentBy: row.created_by as string,
        audienceType: useRoles ? undefined : ((row.audience_type as AudienceType) ?? 'all_members'),
        targetStaffRoles: useRoles ? targetRoles : undefined,
        includeAllMembers: Boolean(row.include_all_members),
        excludeFromPushUserId: row.created_by as string,
      });

      const failureReason =
        pushTicketErrors.length > 0 ? pushTicketErrors.join('; ').slice(0, 500) : null;

      await admin
        .from('scheduled_church_notifications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          delivery_status: failureReason ? 'partial' : 'delivered',
          failure_reason: failureReason,
          recipient_count: recipientCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      sent += 1;
    } catch (e) {
      failed += 1;
      const msg = e instanceof Error ? e.message : 'send_failed';
      await admin
        .from('scheduled_church_notifications')
        .update({
          status: 'failed',
          failure_reason: msg.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      console.warn('[cron/scheduled-broadcasts] send', id, e);
    }
  }

  return NextResponse.json({ ok: true, processed: (due ?? []).length, sent, failed });
}
