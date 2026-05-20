import { NextResponse } from 'next/server';

import { authorizeApiPermission } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function mapError(message: string): { status: number; error: string } {
  if (message.includes('forbidden')) return { status: 403, error: 'Forbidden.' };
  if (message.includes('cannot_remove_owner') || message.includes('last_owner')) {
    return { status: 400, error: 'Cannot remove the church owner.' };
  }
  if (message.includes('cannot_remove_self')) {
    return { status: 400, error: 'Use account settings to leave the church.' };
  }
  if (message.includes('cannot_remove_higher_role')) {
    return { status: 403, error: 'You cannot remove a member with equal or higher access.' };
  }
  if (message.includes('not_found')) return { status: 404, error: 'Member not found.' };
  return { status: 400, error: message };
}

export async function POST(req: Request) {
  let body: { membershipId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const membershipId =
    typeof body.membershipId === 'string' ? body.membershipId.trim() : '';
  if (!membershipId) {
    return NextResponse.json({ error: 'membershipId is required.' }, { status: 400 });
  }

  const auth = await authorizeApiPermission('can_manage_team');
  if (!auth.ok) return auth.response;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('remove_church_member', {
    p_membership_id: membershipId,
  });

  if (error) {
    const mapped = mapError(error.message);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }

  return NextResponse.json({ ok: true });
}
