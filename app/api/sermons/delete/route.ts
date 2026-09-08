import { NextResponse } from 'next/server';

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

  const auth = await authorizeApiPermission('can_generate_devotionals');
  if (!auth.ok) return auth.response;

  const churchId = auth.ctx.profile.church_id;
  if (!churchId) {
    return NextResponse.json({ error: 'You must belong to a church.' }, { status: 403 });
  }

  const supabase = createServerSupabaseClient();
  const { data: sermon, error: loadErr } = await supabase
    .from('sermons')
    .select('id, church_id')
    .eq('id', sermonId)
    .maybeSingle();

  if (loadErr) {
    return NextResponse.json({ error: loadErr.message }, { status: 400 });
  }
  if (!sermon || sermon.church_id !== churchId) {
    return NextResponse.json({ error: 'Sermon not found.' }, { status: 404 });
  }

  const { error: delErr } = await supabase.from('sermons').delete().eq('id', sermonId).eq('church_id', churchId);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
