import { NextResponse } from 'next/server';

import { authorizeApiPermission } from '@/lib/auth/server';
import { parseDaysFromClientPayload } from '@/lib/devotionals/devotional-days';
import { writeAuditLog } from '@/lib/audit/log';
import { notifyChurchNewDevotionals } from '@/lib/push/notify-church-new-devotionals';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { sermonId?: string; days?: unknown; replace?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const sermonId = typeof body.sermonId === 'string' ? body.sermonId.trim() : '';
  const replace = Boolean(body.replace);
  if (!sermonId) {
    return NextResponse.json({ error: 'sermonId is required.' }, { status: 400 });
  }

  const auth = await authorizeApiPermission('can_publish_devotionals');
  if (!auth.ok) return auth.response;
  const user = auth.ctx.user;
  const profileRow = auth.ctx.profile;

  const supabase = createServerSupabaseClient();

  const { data: sermon, error: sermonError } = await supabase
    .from('sermons')
    .select('id, church_id, title, workflow_status, churches(require_devotional_approval)')
    .eq('id', sermonId)
    .single();

  if (sermonError || !sermon) {
    return NextResponse.json({ error: 'Sermon not found.' }, { status: 404 });
  }

  if (sermon.church_id !== profileRow.church_id) {
    return NextResponse.json({ error: 'This sermon belongs to another church.' }, { status: 403 });
  }

  const churchEmbedRaw = sermon.churches as
    | { require_devotional_approval: boolean }
    | { require_devotional_approval: boolean }[]
    | null;
  const churchEmbed = Array.isArray(churchEmbedRaw) ? churchEmbedRaw[0] : churchEmbedRaw;
  const approvalRequired = churchEmbed?.require_devotional_approval !== false;
  const wf = (sermon.workflow_status as string) ?? 'draft';

  if (approvalRequired && wf !== 'approved') {
    return NextResponse.json(
      {
        error:
          wf === 'submitted_for_approval'
            ? 'Awaiting approval before publish.'
            : 'Submit for approval first.',
      },
      { status: 409 },
    );
  }

  const { count: existingCount } = await supabase
    .from('devotionals')
    .select('id', { count: 'exact', head: true })
    .eq('sermon_id', sermonId);

  const hasExisting = (existingCount ?? 0) > 0;

  const publishExistingOnly =
    hasExisting &&
    ((!approvalRequired && wf !== 'published') || (approvalRequired && wf === 'approved'));

  if (publishExistingOnly) {
    // Devotionals already in DB — mark sermon published without re-inserting.
  } else {
    let normalized;
    try {
      normalized = parseDaysFromClientPayload(body.days);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid devotionals payload.';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (hasExisting && !replace) {
      return NextResponse.json(
        { error: 'This sermon already has devotionals. Pass replace: true to replace them.' },
        { status: 409 },
      );
    }

    if (replace && hasExisting) {
      const { error: delErr } = await supabase.from('devotionals').delete().eq('sermon_id', sermonId);
      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 });
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
  }

  const now = new Date().toISOString();
  await supabase
    .from('sermons')
    .update({
      status: 'ready',
      workflow_status: 'published',
      published_by: user.id,
      published_at: now,
    })
    .eq('id', sermonId);

  await notifyChurchNewDevotionals({
    churchId: sermon.church_id,
    sermonId,
    sermonTitle: sermon.title ?? 'New sermon',
    excludeUserId: user.id,
  });

  await writeAuditLog({
    churchId: sermon.church_id,
    actorUserId: user.id,
    action: 'devotional.published',
    entityType: 'sermon',
    entityId: sermonId,
  });

  return NextResponse.json({ ok: true });
}
