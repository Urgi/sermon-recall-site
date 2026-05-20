import { NextResponse } from 'next/server';

import type { StaffRole } from '@/lib/auth/permissions';
import { INVITABLE_STAFF_ROLES } from '@/lib/auth/permissions';
import { authorizeApiPermission } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function mapError(message: string): { status: number; error: string } {
  if (message.includes('forbidden')) return { status: 403, error: 'Forbidden.' };
  if (message.includes('cannot_change_own_role')) {
    return { status: 400, error: 'You cannot change your own role.' };
  }
  if (message.includes('cannot_change_owner_role')) {
    return { status: 400, error: 'The owner role cannot be changed here.' };
  }
  if (message.includes('role_escalation') || message.includes('cannot_modify_higher_role')) {
    return { status: 403, error: 'You cannot assign or modify that role.' };
  }
  if (message.includes('not_found')) return { status: 404, error: 'Member not found.' };
  return { status: 400, error: message };
}

export async function POST(req: Request) {
  let body: { membershipId?: unknown; role?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const membershipId =
    typeof body.membershipId === 'string' ? body.membershipId.trim() : '';
  const role = typeof body.role === 'string' ? body.role.trim() : '';

  if (!membershipId || !role) {
    return NextResponse.json({ error: 'membershipId and role are required.' }, { status: 400 });
  }

  if (!INVITABLE_STAFF_ROLES.includes(role as StaffRole)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  }

  const auth = await authorizeApiPermission('can_manage_team');
  if (!auth.ok) return auth.response;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('update_church_membership_role', {
    p_membership_id: membershipId,
    p_new_role: role,
  });

  if (error) {
    const mapped = mapError(error.message);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }

  return NextResponse.json({ ok: true });
}
