import { NextResponse } from 'next/server';

import { staffHasPermission } from '@/lib/auth/profile';
import { buildStaffAuthContext } from '@/lib/auth/membership';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, church_id, full_name, role')
    .eq('id', user.id)
    .single();

  if (!profile?.church_id) {
    return NextResponse.json({ error: 'No church.' }, { status: 403 });
  }

  const ctx = await buildStaffAuthContext({ id: user.id, email: user.email }, profile);
  const canInvite = staffHasPermission(ctx.staffRole, ctx.profile, 'can_invite_users');
  const canApprove = staffHasPermission(ctx.staffRole, ctx.profile, 'can_approve_users');

  if (!canInvite && !canApprove) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const churchId = profile.church_id as string;

  const { data: invites, error: invErr } = await supabase
    .from('pastor_invites')
    .select('id, invited_email, invited_role, status, expires_at, created_at, accepted_at')
    .eq('church_id', churchId)
    .in('status', ['pending', 'accepted_pending_approval'])
    .order('created_at', { ascending: false });

  if (invErr) {
    return NextResponse.json({ error: invErr.message }, { status: 500 });
  }

  const { data: pendingMembers, error: memErr } = await supabase
    .from('church_memberships')
    .select('id, user_id, role, status, created_at, users(full_name)')
    .eq('church_id', churchId)
    .eq('status', 'pending');

  if (memErr) {
    return NextResponse.json({ error: memErr.message }, { status: 500 });
  }

  return NextResponse.json({ invites: invites ?? [], pendingMembers: pendingMembers ?? [] });
}
