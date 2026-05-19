import { NextResponse } from 'next/server';

import { canManageSermons } from '@/lib/auth/profile';
import type { UserRole } from '@/lib/auth/profile';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

const HISTORY_LIMIT = 100;

export type BroadcastHistoryItem = {
  id: string;
  title: string;
  body: string;
  recipient_count: number;
  created_at: string;
  sent_by: string;
  sender_name: string | null;
};

/**
 * Pastor/admin: list custom push notifications sent for their church (newest first).
 */
export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('users')
    .select('id, church_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profileRow?.church_id) {
    return NextResponse.json({ error: 'You must belong to a church.' }, { status: 403 });
  }

  const profileRole = profileRow.role as UserRole;
  if (!canManageSermons(profileRole)) {
    return NextResponse.json({ error: 'Pastor or admin role required.' }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'History is not configured (missing service role).' },
      { status: 503 },
    );
  }

  const churchId = profileRow.church_id as string;

  const { data: rows, error: logErr } = await admin
    .from('church_broadcast_log')
    .select('id, title, body, recipient_count, created_at, sent_by')
    .eq('church_id', churchId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);

  if (logErr) {
    return NextResponse.json({ error: logErr.message }, { status: 500 });
  }

  const senderIds = Array.from(new Set((rows ?? []).map((r) => r.sent_by as string)));
  const nameById = new Map<string, string | null>();

  if (senderIds.length > 0) {
    const { data: senders } = await admin.from('users').select('id, full_name').in('id', senderIds);
    for (const s of senders ?? []) {
      const name = typeof s.full_name === 'string' ? s.full_name.trim() || null : null;
      nameById.set(s.id as string, name);
    }
  }

  const items: BroadcastHistoryItem[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    body: r.body as string,
    recipient_count: r.recipient_count as number,
    created_at: r.created_at as string,
    sent_by: r.sent_by as string,
    sender_name: nameById.get(r.sent_by as string) ?? null,
  }));

  return NextResponse.json({ ok: true, items });
}
