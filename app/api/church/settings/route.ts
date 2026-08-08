import { NextResponse } from 'next/server';

import { authorizeApiPermission } from '@/lib/auth/server';
import { DEFAULT_CHURCH_TIMEZONE } from '@/lib/church/timezones';
import { normalizeChurchCode } from '@/lib/church/member-join';
import { DEFAULT_APP_LANGUAGE, normalizeAppLanguage } from '@/lib/i18n/languages';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await authorizeApiPermission('can_manage_church_settings');
  if (!auth.ok) return auth.response;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('churches')
    .select(
      'id, name, church_code, pastor_name, timezone, require_devotional_approval, sermon_language',
    )
    .eq('id', auth.ctx.profile.church_id!)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Church not found.' }, { status: 404 });
  }

  return NextResponse.json({ church: data });
}

export async function POST(req: Request) {
  let body: {
    name?: unknown;
    churchCode?: unknown;
    pastorName?: unknown;
    timezone?: unknown;
    requireDevotionalApproval?: unknown;
    sermonLanguage?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const churchCode = typeof body.churchCode === 'string' ? normalizeChurchCode(body.churchCode) : '';
  const pastorName =
    typeof body.pastorName === 'string' ? body.pastorName.trim().slice(0, 120) : '';
  const timezone =
    typeof body.timezone === 'string' && body.timezone.trim()
      ? body.timezone.trim()
      : DEFAULT_CHURCH_TIMEZONE;
  const requireDevotionalApproval = body.requireDevotionalApproval !== false;
  const sermonLanguage = normalizeAppLanguage(body.sermonLanguage ?? DEFAULT_APP_LANGUAGE);

  if (!name) {
    return NextResponse.json({ error: 'Church name is required.' }, { status: 400 });
  }
  if (churchCode.length < 4 || churchCode.length > 32) {
    return NextResponse.json({ error: 'Church code must be 4–32 characters.' }, { status: 400 });
  }

  const auth = await authorizeApiPermission('can_manage_church_settings');
  if (!auth.ok) return auth.response;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('update_church_settings', {
    p_name: name,
    p_church_code: churchCode,
    p_pastor_name: pastorName || null,
    p_timezone: timezone,
    p_require_devotional_approval: requireDevotionalApproval,
    p_sermon_language: sermonLanguage,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes('invalid_name')) {
      return NextResponse.json({ error: 'Enter a church name.' }, { status: 400 });
    }
    if (msg.includes('invalid_church_code_format')) {
      return NextResponse.json({ error: 'Church code must be 4–32 characters.' }, { status: 400 });
    }
    if (msg.includes('invalid_sermon_language')) {
      return NextResponse.json({ error: 'Choose English, Spanish, or French.' }, { status: 400 });
    }
    if (msg.includes('forbidden')) {
      return NextResponse.json({ error: 'You cannot change church settings.' }, { status: 403 });
    }
    if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505')) {
      return NextResponse.json({ error: 'That church code is already taken.' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
