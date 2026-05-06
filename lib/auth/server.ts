import { redirect } from 'next/navigation';

import type { AuthContext, ChurchSummary, UserProfile } from '@/lib/auth/profile';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function requireAdminSession(): Promise<AuthContext> {
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
    redirect('/login');
  }

  return {
    user: { id: user.id, email: user.email },
    profile: profile as UserProfile,
  };
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
