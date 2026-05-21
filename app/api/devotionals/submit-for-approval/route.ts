import { NextResponse } from 'next/server';

import { staffHasPermission } from '@/lib/auth/profile';
import { authorizeApiPermission } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { sermonId?: string; days?: unknown; replace?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const sermonId = typeof body.sermonId === 'string' ? body.sermonId.trim() : '';
  const replace = Boolean(body.replace);
  if (!sermonId) {
    return NextResponse.json({ error: 'sermonId is required.' }, { status: 400 });
  }

  const auth = await authorizeApiPermission('can_submit_for_approval');
  if (!auth.ok) return auth.response;

  const { parseDaysFromClientPayload } = await import('@/lib/devotionals/devotional-days');
  let normalized;
  try {
    normalized = parseDaysFromClientPayload(body.days);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid devotionals payload.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

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

  const wf = sermon.workflow_status as string;
  if (!['draft', 'generated', 'changes_requested'].includes(wf)) {
    return NextResponse.json(
      { error: `Cannot submit from status "${wf}".` },
      { status: 409 },
    );
  }

  if (replace) {
    await supabase.from('devotionals').delete().eq('sermon_id', sermonId);
  } else {
    const { count } = await supabase
      .from('devotionals')
      .select('id', { count: 'exact', head: true })
      .eq('sermon_id', sermonId);
    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Devotionals already exist. Use replace: true to resubmit.' },
        { status: 409 },
      );
    }
  }

  const insertRows = normalized.map((d) => ({
    sermon_id: sermonId,
    day_number: d.day_number,
    title: d.title,
    main_content: d.main_content,
    scripture_reference: d.scripture_reference,
    scripture_text: d.scripture_text,
    reflection_question: d.reflection_question,
    estimated_minutes: d.estimated_minutes,
    pre_prompt: d.pre_prompt,
  }));

  const { error: insErr } = await supabase.from('devotionals').insert(insertRows);
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  for (const d of normalized) {
    await supabase.from('devotional_versions').insert({
      sermon_id: sermonId,
      day_number: d.day_number,
      snapshot: d,
      source: 'ai',
      created_by: auth.ctx.user.id,
    });
  }

  const { error: upErr } = await supabase
    .from('sermons')
    .update({
      workflow_status: 'submitted_for_approval',
      submitted_by: auth.ctx.user.id,
      submitted_at: new Date().toISOString(),
      status: 'processing',
    })
    .eq('id', sermonId);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { writeAuditLog } = await import('@/lib/audit/log');
  await writeAuditLog({
    churchId: sermon.church_id,
    actorUserId: auth.ctx.user.id,
    action: 'devotional.submitted_for_approval',
    entityType: 'sermon',
    entityId: sermonId,
  });

  return NextResponse.json({ ok: true });
}
