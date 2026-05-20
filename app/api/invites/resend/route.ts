import { NextResponse } from 'next/server';

import { authorizeApiPermission } from '@/lib/auth/server';
import { buildInviteAcceptUrl, sendInviteEmail } from '@/lib/email/send-invite';
import { generateInviteToken, hashInviteToken } from '@/lib/invites/token';
import { getChurchForProfile } from '@/lib/auth/server';
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

  const rawToken = generateInviteToken();
  const tokenHash = hashInviteToken(rawToken);

  const supabase = createServerSupabaseClient();
  const { data: invite } = await supabase
    .from('pastor_invites')
    .select('invited_email, invited_role')
    .eq('id', inviteId)
    .single();

  const { error } = await supabase.rpc('resend_pastor_invite', {
    p_invite_id: inviteId,
    p_token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const church = await getChurchForProfile(auth.ctx.profile.church_id);
  const acceptUrl = buildInviteAcceptUrl(rawToken);

  if (invite?.invited_email) {
    try {
      await sendInviteEmail({
        to: invite.invited_email as string,
        churchName: church?.name ?? 'your church',
        inviterName: auth.ctx.profile.full_name ?? auth.ctx.user.email ?? 'A pastor',
        role: invite.invited_role as string,
        acceptUrl,
      });
    } catch (e) {
      console.warn('[invites/resend] email', e);
      return NextResponse.json({ ok: true, acceptUrl, warning: 'Token refreshed; email failed.' });
    }
  }

  return NextResponse.json({ ok: true });
}
