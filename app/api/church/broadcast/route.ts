import { NextResponse } from 'next/server';

import { writeAuditLog } from '@/lib/audit/log';
import type { AudienceType } from '@/lib/admin/workflow-status';
import { authorizeApiPermission } from '@/lib/auth/server';
import { parseTargetStaffRoles } from '@/lib/push/broadcast-audience';
import { sendPastorBroadcastAndLog } from '@/lib/push/pastor-broadcast-send';
import { checkRateLimit } from '@/lib/rate-limit';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

const TITLE_MAX = 80;
const BODY_MAX = 320;
const MAX_BROADCASTS_PER_24H = 20;

export async function POST(req: Request) {
  let body: {
    title?: unknown;
    body?: unknown;
    audienceType?: unknown;
    targetStaffRoles?: unknown;
    includeAllMembers?: unknown;
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
  const targetStaffRoles = parseTargetStaffRoles(body.targetStaffRoles);
  const includeAllMembers = body.includeAllMembers === true;
  const audienceType =
    body.audienceType === 'pastors_only' ? 'pastors_only' : ('all_members' as AudienceType);
  const idempotencyKey =
    typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim().slice(0, 64) : '';

  if (!title || !messageBody) {
    return NextResponse.json({ error: 'title and body are required.' }, { status: 400 });
  }
  if (!idempotencyKey) {
    return NextResponse.json({ error: 'idempotencyKey is required.' }, { status: 400 });
  }
  if (targetStaffRoles.length === 0 && !includeAllMembers) {
    return NextResponse.json(
      { error: 'Select at least one team role or include all members.' },
      { status: 400 },
    );
  }

  const auth = await authorizeApiPermission('can_send_notifications');
  if (!auth.ok) return auth.response;

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Push delivery is not configured (missing service role).' },
      { status: 503 },
    );
  }

  const churchId = auth.ctx.profile.church_id!;
  const userId = auth.ctx.user.id;

  const { data: existingIdem } = await admin
    .from('notification_idempotency')
    .select('id')
    .eq('church_id', churchId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existingIdem) {
    return NextResponse.json({ ok: true, duplicate: true, recipientCount: 0 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await admin
    .from('church_broadcast_log')
    .select('id', { count: 'exact', head: true })
    .eq('church_id', churchId)
    .gte('created_at', since);

  if ((recentCount ?? 0) >= MAX_BROADCASTS_PER_24H) {
    return NextResponse.json(
      { error: `Limit of ${MAX_BROADCASTS_PER_24H} notifications per 24 hours reached.` },
      { status: 429 },
    );
  }

  const limit = await checkRateLimit(`broadcast:${userId}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many sends. Try again later.' }, { status: 429 });
  }

  await admin.from('notification_idempotency').insert({
    church_id: churchId,
    idempotency_key: idempotencyKey,
    created_by: userId,
  });

  const { broadcastId, recipientCount, pushTicketErrors } = await sendPastorBroadcastAndLog({
    admin,
    churchId,
    title,
    body: messageBody,
    sentBy: userId,
    audienceType: targetStaffRoles.length || includeAllMembers ? undefined : audienceType,
    targetStaffRoles: targetStaffRoles.length ? targetStaffRoles : undefined,
    includeAllMembers,
    excludeFromPushUserId: userId,
  });

  await writeAuditLog({
    churchId,
    actorUserId: userId,
    action: 'notification.sent',
    entityType: 'broadcast',
    entityId: broadcastId ?? undefined,
    metadata: { title, targetStaffRoles, includeAllMembers, recipientCount },
  });

  return NextResponse.json({
    ok: true,
    broadcastId,
    recipientCount,
    pushTicketErrors: pushTicketErrors.length ? pushTicketErrors : undefined,
    warning:
      recipientCount === 0
        ? 'No devices registered for push in your church yet.'
        : undefined,
  });
}
