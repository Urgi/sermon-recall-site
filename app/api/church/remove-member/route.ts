import { NextResponse } from 'next/server';

import { writeAuditLog } from '@/lib/audit/log';
import { authorizeApiPermission } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ERRORS: Record<string, { status: number; error: string }> = {
  forbidden: { status: 403, error: 'Only the church owner or admin pastor can remove members.' },
  cannot_remove_self: { status: 400, error: 'You cannot remove yourself.' },
  member_not_found: { status: 404, error: 'That member is not in your church.' },
  member_is_staff: { status: 409, error: 'This person is on your Team. Remove them from the Team page.' },
};

/** Unlink a congregation member from the church (owner / admin pastor). */
export async function POST(req: Request) {
  const auth = await authorizeApiPermission('can_manage_team');
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as { userId?: unknown };
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  if (!userId) {
    return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('pastor_remove_congregation_member', { p_user_id: userId });
  if (error) {
    const known = Object.keys(ERRORS).find((k) => error.message.includes(k));
    if (known) return NextResponse.json({ error: ERRORS[known].error }, { status: ERRORS[known].status });
    console.error('[members/remove]', error.message);
    return NextResponse.json({ error: 'Could not remove member.' }, { status: 500 });
  }

  await writeAuditLog({
    churchId: auth.ctx.profile.church_id!,
    actorUserId: auth.ctx.user.id,
    action: 'member.removed',
    entityType: 'user',
    entityId: userId,
  });
  return NextResponse.json({ ok: true });
}
