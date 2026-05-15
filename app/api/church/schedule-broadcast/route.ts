import { NextResponse } from 'next/server';

import { canManageSermons } from '@/lib/auth/profile';
import type { UserRole } from '@/lib/auth/profile';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TITLE_MAX = 80;
const BODY_MAX = 320;
const MAX_PENDING = 40;

/**
 * Schedule a one-time push to the whole church (processed by cron with service role).
 */
export async function POST(req: Request) {
  let body: { title?: unknown; body?: unknown; sendAt?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const title =
    typeof body.title === 'string' ? body.title.trim().slice(0, TITLE_MAX) : '';
  const messageBody =
    typeof body.body === 'string' ? body.body.trim().slice(0, BODY_MAX) : '';
  const sendAtRaw = typeof body.sendAt === 'string' ? body.sendAt.trim() : '';

  if (!title || !messageBody) {
    return NextResponse.json({ error: 'title and body are required.' }, { status: 400 });
  }
  if (!sendAtRaw) {
    return NextResponse.json({ error: 'sendAt is required (ISO-8601 date time).' }, { status: 400 });
  }

  const sendAt = new Date(sendAtRaw);
  if (Number.isNaN(sendAt.getTime())) {
    return NextResponse.json({ error: 'sendAt must be a valid date.' }, { status: 400 });
  }

  const now = Date.now();
  if (sendAt.getTime() < now + 2 * 60 * 1000) {
    return NextResponse.json(
      { error: 'Schedule at least 2 minutes in the future.' },
      { status: 400 },
    );
  }
  if (sendAt.getTime() > now + 90 * 24 * 60 * 60 * 1000) {
    return NextResponse.json(
      { error: 'Cannot schedule more than 90 days ahead.' },
      { status: 400 },
    );
  }

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

  const churchId = profileRow.church_id as string;

  const { count: pendingCount, error: cntErr } = await supabase
    .from('scheduled_church_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('church_id', churchId)
    .is('sent_at', null);

  if (!cntErr && (pendingCount ?? 0) >= MAX_PENDING) {
    return NextResponse.json(
      { error: `Too many pending scheduled messages (max ${MAX_PENDING}).` },
      { status: 429 },
    );
  }

  const { data: row, error: insErr } = await supabase
    .from('scheduled_church_notifications')
    .insert({
      church_id: churchId,
      created_by: user.id,
      title,
      body: messageBody,
      send_at: sendAt.toISOString(),
    })
    .select('id')
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: row?.id });
}
