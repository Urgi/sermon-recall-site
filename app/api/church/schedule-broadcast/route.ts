import { NextResponse } from 'next/server';

import { writeAuditLog } from '@/lib/audit/log';
import type { AudienceType } from '@/lib/admin/workflow-status';
import { authorizeApiPermission } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TITLE_MAX = 80;
const BODY_MAX = 320;
const MAX_PENDING = 40;

export async function POST(req: Request) {
  let body: {
    title?: unknown;
    body?: unknown;
    sendAt?: unknown;
    audienceType?: unknown;
    idempotencyKey?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const title =
    typeof body.title === 'string' ? body.title.trim().slice(0, TITLE_MAX) : '';
  const messageBody =
    typeof body.body === 'string' ? body.body.trim().slice(0, BODY_MAX) : '';
  const sendAtRaw = typeof body.sendAt === 'string' ? body.sendAt.trim() : '';
  const audienceType =
    body.audienceType === 'pastors_only' ? 'pastors_only' : ('all_members' as AudienceType);
  const idempotencyKey =
    typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim().slice(0, 64) : null;

  if (!title || !messageBody) {
    return NextResponse.json({ error: 'title and body are required.' }, { status: 400 });
  }
  if (!sendAtRaw) {
    return NextResponse.json({ error: 'sendAt is required (ISO-8601).' }, { status: 400 });
  }

  const sendAt = new Date(sendAtRaw);
  if (Number.isNaN(sendAt.getTime())) {
    return NextResponse.json({ error: 'sendAt must be a valid date.' }, { status: 400 });
  }

  const now = Date.now();
  if (sendAt.getTime() < now + 2 * 60 * 1000) {
    return NextResponse.json({ error: 'Schedule at least 2 minutes in the future.' }, { status: 400 });
  }
  if (sendAt.getTime() > now + 90 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: 'Cannot schedule more than 90 days ahead.' }, { status: 400 });
  }

  const auth = await authorizeApiPermission('can_schedule_notifications');
  if (!auth.ok) return auth.response;

  const churchId = auth.ctx.profile.church_id!;
  const supabase = createServerSupabaseClient();

  const { count: pendingCount } = await supabase
    .from('scheduled_church_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('church_id', churchId)
    .in('status', ['draft', 'scheduled']);

  if ((pendingCount ?? 0) >= MAX_PENDING) {
    return NextResponse.json(
      { error: `Too many pending scheduled messages (max ${MAX_PENDING}).` },
      { status: 429 },
    );
  }

  const { data: row, error: insErr } = await supabase
    .from('scheduled_church_notifications')
    .insert({
      church_id: churchId,
      created_by: auth.ctx.user.id,
      title,
      body: messageBody,
      send_at: sendAt.toISOString(),
      status: 'scheduled',
      audience_type: audienceType,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  await writeAuditLog({
    churchId,
    actorUserId: auth.ctx.user.id,
    action: 'notification.scheduled',
    entityType: 'scheduled_notification',
    entityId: row?.id as string,
    metadata: { sendAt: sendAt.toISOString(), audienceType },
  });

  return NextResponse.json({ ok: true, id: row?.id });
}
