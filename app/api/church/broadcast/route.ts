import { NextResponse } from 'next/server';

import { canManageSermons } from '@/lib/auth/profile';
import type { UserRole } from '@/lib/auth/profile';
import { sendPastorBroadcastAndLog } from '@/lib/push/pastor-broadcast-send';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

const TITLE_MAX = 80;
const BODY_MAX = 320;
const MAX_BROADCASTS_PER_24H = 20;

/**
 * Pastor/admin: send a custom push notification to all members of their church who have
 * registered an Expo push token in the app.
 */
export async function POST(req: Request) {
  let body: { title?: unknown; body?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const title =
    typeof body.title === 'string' ? body.title.trim().slice(0, TITLE_MAX) : '';
  const messageBody =
    typeof body.body === 'string' ? body.body.trim().slice(0, BODY_MAX) : '';

  if (!title) {
    return NextResponse.json({ error: 'title is required.' }, { status: 400 });
  }
  if (!messageBody) {
    return NextResponse.json({ error: 'body is required.' }, { status: 400 });
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

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Push delivery is not configured (missing service role).' },
      { status: 503 },
    );
  }

  const churchId = profileRow.church_id as string;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count: recentCount, error: rateErr } = await admin
    .from('church_broadcast_log')
    .select('id', { count: 'exact', head: true })
    .eq('church_id', churchId)
    .gte('created_at', since);

  if (rateErr) {
    console.warn('[church/broadcast] rate check', rateErr.message);
  } else if ((recentCount ?? 0) >= MAX_BROADCASTS_PER_24H) {
    return NextResponse.json(
      {
        error: `Your church has reached the limit of ${MAX_BROADCASTS_PER_24H} custom notifications per 24 hours.`,
      },
      { status: 429 },
    );
  }

  const { recipientCount } = await sendPastorBroadcastAndLog({
    admin,
    churchId,
    title,
    body: messageBody,
    sentBy: user.id,
    excludeFromPushUserId: user.id,
  });

  return NextResponse.json({
    ok: true,
    recipientCount,
    warning:
      recipientCount === 0
        ? 'No devices registered for push in your church yet. Members open the app and allow notifications.'
        : undefined,
  });
}
