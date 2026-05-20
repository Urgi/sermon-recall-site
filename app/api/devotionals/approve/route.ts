import { NextResponse } from 'next/server';

import { writeAuditLog } from '@/lib/audit/log';
import { authorizeApiPermission } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { sermonId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const sermonId = typeof body.sermonId === 'string' ? body.sermonId.trim() : '';
  if (!sermonId) {
    return NextResponse.json({ error: 'sermonId is required.' }, { status: 400 });
  }

  const auth = await authorizeApiPermission('can_approve_devotionals');
  if (!auth.ok) return auth.response;

  const supabase = createServerSupabaseClient();
  const { data: sermon, error: sermonError } = await supabase
    .from('sermons')
    .select('id, church_id, workflow_status')
    .eq('id', sermonId)
    .single();

  if (sermonError || !sermon) {
    return NextResponse.json({ error: 'Sermon not found.' }, { status: 404 });
  }

  if (sermon.church_id !== auth.ctx.profile.church_id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  if (sermon.workflow_status !== 'submitted_for_approval') {
    return NextResponse.json({ error: 'Sermon is not awaiting approval.' }, { status: 409 });
  }

  const { error: upErr } = await supabase
    .from('sermons')
    .update({
      workflow_status: 'approved',
      approved_by: auth.ctx.user.id,
      approved_at: new Date().toISOString(),
      changes_requested_note: null,
    })
    .eq('id', sermonId);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  await writeAuditLog({
    churchId: sermon.church_id,
    actorUserId: auth.ctx.user.id,
    action: 'devotional.approved',
    entityType: 'sermon',
    entityId: sermonId,
  });

  return NextResponse.json({ ok: true });
}
