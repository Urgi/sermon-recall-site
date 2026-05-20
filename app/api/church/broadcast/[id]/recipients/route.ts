import { NextResponse } from 'next/server';

import { authorizeApiPermission } from '@/lib/auth/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

export type BroadcastRecipientRow = {
  user_id: string;
  full_name: string | null;
  staff_role: string | null;
  opened_at: string | null;
  has_push: boolean;
};

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await authorizeApiPermission('can_send_notifications');
  if (!auth.ok) return auth.response;

  const broadcastId = params.id?.trim();
  if (!broadcastId) {
    return NextResponse.json({ error: 'Broadcast id required.' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  }

  const churchId = auth.ctx.profile.church_id!;

  const { data: broadcast, error: bErr } = await admin
    .from('church_broadcast_log')
    .select('id, church_id, title, target_staff_roles, include_all_members')
    .eq('id', broadcastId)
    .eq('church_id', churchId)
    .maybeSingle();

  if (bErr || !broadcast) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const { data: rows, error: rErr } = await admin
    .from('church_broadcast_recipients')
    .select('user_id, staff_role, opened_at')
    .eq('broadcast_id', broadcastId)
    .order('opened_at', { ascending: false, nullsFirst: false });

  if (rErr) {
    return NextResponse.json({ error: rErr.message }, { status: 500 });
  }

  const userIds = (rows ?? []).map((r) => r.user_id as string);
  const nameById = new Map<string, string | null>();
  const hasPushById = new Map<string, boolean>();

  if (userIds.length > 0) {
    const { data: users } = await admin
      .from('users')
      .select('id, full_name, user_push_tokens(expo_push_token)')
      .in('id', userIds);

    for (const u of users ?? []) {
      const id = u.id as string;
      nameById.set(id, typeof u.full_name === 'string' ? u.full_name.trim() || null : null);
      const embed = u.user_push_tokens as
        | { expo_push_token: string }
        | { expo_push_token: string }[]
        | null;
      const has =
        Array.isArray(embed) ?
          embed.some((e) => Boolean(e.expo_push_token))
        : Boolean(embed?.expo_push_token);
      hasPushById.set(id, has);
    }
  }

  const recipients: BroadcastRecipientRow[] = (rows ?? []).map((r) => ({
    user_id: r.user_id as string,
    full_name: nameById.get(r.user_id as string) ?? null,
    staff_role: r.staff_role as string | null,
    opened_at: r.opened_at as string | null,
    has_push: hasPushById.get(r.user_id as string) ?? false,
  }));

  const openedCount = recipients.filter((r) => r.opened_at).length;

  return NextResponse.json({
    ok: true,
    broadcastId,
    title: broadcast.title as string,
    target_staff_roles: broadcast.target_staff_roles as string[] | null,
    include_all_members: broadcast.include_all_members as boolean,
    recipients,
    openedCount,
    totalCount: recipients.length,
  });
}
