import { NextResponse } from 'next/server';

import { authorizeApiPermission } from '@/lib/auth/server';
import { buildInviteAcceptUrl, sendInviteEmail } from '@/lib/email/send-invite';
import { generateInviteToken, hashInviteToken } from '@/lib/invites/token';
import { checkRateLimit } from '@/lib/rate-limit';
import { INVITABLE_STAFF_ROLES, type StaffRole } from '@/lib/auth/permissions';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getChurchForProfile } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { email?: unknown; role?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = typeof body.role === 'string' ? body.role.trim() : '';

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 });
  }
  if (!INVITABLE_STAFF_ROLES.includes(role as StaffRole)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  }

  const auth = await authorizeApiPermission('can_invite_users');
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const churchId = ctx.profile.church_id!;
  const limit = await checkRateLimit(`invite:${churchId}`, 20, 24 * 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Invite limit reached. Try again in ${limit.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const rawToken = generateInviteToken();
  const tokenHash = hashInviteToken(rawToken);

  const supabase = createServerSupabaseClient();
  const { data: inviteId, error } = await supabase.rpc('create_pastor_invite', {
    p_email: email,
    p_role: role,
    p_token_hash: tokenHash,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes('already_member')) {
      return NextResponse.json({ error: 'That person is already in your church.' }, { status: 409 });
    }
    if (msg.includes('self_invite')) {
      return NextResponse.json({ error: 'You cannot invite yourself.' }, { status: 400 });
    }
    if (msg.includes('role_escalation')) {
      return NextResponse.json({ error: 'You cannot assign that role.' }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const church = await getChurchForProfile(churchId);
  const acceptUrl = buildInviteAcceptUrl(rawToken);

  try {
    await sendInviteEmail({
      to: email,
      churchName: church?.name ?? 'your church',
      inviterName: ctx.profile.full_name ?? ctx.user.email ?? 'A pastor',
      role,
      acceptUrl,
    });
  } catch (e) {
    console.warn('[invites/create] email', e);
    return NextResponse.json({
      ok: true,
      inviteId,
      warning: 'Invite created but email failed to send. Copy the link manually.',
      acceptUrl,
    });
  }

  return NextResponse.json({ ok: true, inviteId });
}
