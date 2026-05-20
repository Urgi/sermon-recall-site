import { NextResponse } from 'next/server';

import { authorizeApiPermission } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { membershipId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const membershipId = typeof body.membershipId === 'string' ? body.membershipId.trim() : '';
  if (!membershipId) {
    return NextResponse.json({ error: 'membershipId required.' }, { status: 400 });
  }

  const auth = await authorizeApiPermission('can_approve_users');
  if (!auth.ok) return auth.response;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('reject_church_membership', {
    p_membership_id: membershipId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
