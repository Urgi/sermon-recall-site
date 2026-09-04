import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Resolve the caller for API routes that must work from:
 * - Admin web (cookie session via @supabase/ssr)
 * - Mobile app (Authorization: Bearer <access_token>)
 */
export async function getRequestSupabaseUser(req: Request): Promise<{
  user: User | null;
  supabase: SupabaseClient;
  error: string | null;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const header = req.headers.get('authorization') ?? req.headers.get('Authorization');
  const bearer =
    header && /^Bearer\s+/i.test(header) ? header.replace(/^Bearer\s+/i, '').trim() : '';

  if (bearer) {
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(bearer);
    return {
      user: user ?? null,
      supabase,
      error: error?.message ?? (user ? null : 'Unauthorized.'),
    };
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return {
    user: user ?? null,
    supabase,
    error: error?.message ?? (user ? null : 'Unauthorized.'),
  };
}
