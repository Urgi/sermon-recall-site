import { NextResponse } from 'next/server';

import { authorizeApiPermission } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { inviteId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const inviteId = typeof body.inviteId === 'string' ? body.inviteId.trim() : '';
  if (!inviteId) {
    return NextResponse.json({ error: 'inviteId required.' }, { status: 400 });
  }

  const auth = await authorizeApiPermission('can_invite_users');
  if (!auth.ok) return auth.response;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('cancel_pastor_invite', { p_invite_id: inviteId });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
