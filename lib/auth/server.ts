import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

import type { Permission, StaffAuthContext, ChurchSummary, UserProfile } from '@/lib/auth/profile';
import { staffHasPermission } from '@/lib/auth/profile';
import { buildStaffAuthContext } from '@/lib/auth/membership';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function requireAdminSession(): Promise<StaffAuthContext> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, church_id, full_name, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/login?setup=failed');
  }

  return buildStaffAuthContext(
    { id: user.id, email: user.email },
    profile as UserProfile,
  );
}

/**
 * Requires an active staff membership (or legacy pastor/admin role).
 * Pending invite acceptances are blocked from protected admin actions.
 */
export async function requireApprovedStaffSession(): Promise<StaffAuthContext> {
  const ctx = await requireAdminSession();

  if (!ctx.profile.church_id) {
    return ctx;
  }

  if (!ctx.isApprovedStaff) {
    redirect('/dashboard?staff=pending');
  }

  return ctx;
}

export async function requirePermission(permission: Permission): Promise<StaffAuthContext> {
  const ctx = await requireApprovedStaffSession();

  if (!ctx.profile.church_id) {
    redirect('/dashboard');
  }

  if (!staffHasPermission(ctx.staffRole, ctx.profile, permission)) {
    redirect('/dashboard?error=forbidden');
  }

  return ctx;
}

/** For API routes — returns 401/403 JSON instead of redirecting. */
export async function authorizeApiPermission(
  permission: Permission,
): Promise<
  | { ok: true; ctx: StaffAuthContext }
  | { ok: false; response: NextResponse }
> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, church_id, full_name, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false, response: NextResponse.json({ error: 'Profile not found.' }, { status: 403 }) };
  }

  const ctx = await buildStaffAuthContext(
    { id: user.id, email: user.email },
    profile as UserProfile,
  );

  if (!ctx.profile.church_id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'You must belong to a church.' }, { status: 403 }),
    };
  }

  if (!ctx.isApprovedStaff) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Staff approval required.' }, { status: 403 }),
    };
  }

  if (!staffHasPermission(ctx.staffRole, ctx.profile, permission)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) };
  }

  return { ok: true, ctx };
}

/** For API routes that only require belonging to a church (e.g. member QR share). */
export async function authorizeApiWithChurch(): Promise<
  | { ok: true; ctx: StaffAuthContext }
  | { ok: false; response: NextResponse }
> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, church_id, full_name, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false, response: NextResponse.json({ error: 'Profile not found.' }, { status: 403 }) };
  }

  const ctx = await buildStaffAuthContext(
    { id: user.id, email: user.email },
    profile as UserProfile,
  );

  if (!ctx.profile.church_id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'You must belong to a church.' }, { status: 403 }),
    };
  }

  return { ok: true, ctx };
}

export async function getChurchForProfile(
  churchId: string | null,
): Promise<ChurchSummary | null> {
  if (!churchId) return null;
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('churches')
    .select('id, name, church_code')
    .eq('id', churchId)
    .single();
  return data as ChurchSummary | null;
}
