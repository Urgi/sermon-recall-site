import { NextResponse } from 'next/server';

import { canManageSermons } from '@/lib/auth/profile';
import type { UserRole } from '@/lib/auth/profile';
import { parseDaysFromClientPayload } from '@/lib/gemini/devotional-days';
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

  let normalized;
  try {
    normalized = parseDaysFromClientPayload(body.days);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid devotionals payload.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('users')
    .select('id, church_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profileRow) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 403 });
  }

  const profileRole = profileRow.role as UserRole;
  if (!canManageSermons(profileRole)) {
    return NextResponse.json({ error: 'Pastor or admin role required.' }, { status: 403 });
  }

  const { data: sermon, error: sermonError } = await supabase
    .from('sermons')
    .select('id, church_id, title')
    .eq('id', sermonId)
    .single();

  if (sermonError || !sermon) {
    return NextResponse.json({ error: 'Sermon not found.' }, { status: 404 });
  }

  if (sermon.church_id !== profileRow.church_id) {
    return NextResponse.json({ error: 'This sermon belongs to another church.' }, { status: 403 });
  }

  if (replace) {
    const { error: delErr } = await supabase
      .from('devotionals')
      .delete()
      .eq('sermon_id', sermonId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
  } else {
    const { count } = await supabase
      .from('devotionals')
      .select('id', { count: 'exact', head: true })
      .eq('sermon_id', sermonId);
    if (count && count > 0) {
      return NextResponse.json(
        {
          error: 'This sermon already has devotionals. Pass replace: true to replace them.',
        },
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
    pre_prompt: d.pre_prompt ?? null,
  }));

  const { error: insErr } = await supabase.from('devotionals').insert(insertRows);
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  await supabase.from('sermons').update({ status: 'ready' }).eq('id', sermonId);

  await notifyChurchNewDevotionals({
    churchId: sermon.church_id,
    sermonId,
    sermonTitle: sermon.title ?? 'New sermon',
    excludeUserId: user.id,
  });

  return NextResponse.json({ ok: true, days: normalized.length });
}
