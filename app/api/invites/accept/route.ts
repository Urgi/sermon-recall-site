import { NextResponse } from 'next/server';

import { hashInviteToken } from '@/lib/invites/token';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const rawToken = typeof body.token === 'string' ? body.token.trim() : '';
  if (!rawToken) {
    return NextResponse.json({ error: 'token is required.' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return NextResponse.json({ error: 'Sign in to accept this invite.' }, { status: 401 });
  }

  const { data: membershipId, error } = await supabase.rpc('accept_pastor_invite', {
    p_token_hash: hashInviteToken(rawToken),
  });

  if (error) {
    const msg = error.message;
    if (msg.includes('email_mismatch')) {
      return NextResponse.json(
        { error: 'This invite was sent to a different email address.' },
        { status: 403 },
      );
    }
    if (msg.includes('invalid_or_expired')) {
      return NextResponse.json({ error: 'Invite is invalid or expired.' }, { status: 410 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true, membershipId, pendingApproval: true });
}
