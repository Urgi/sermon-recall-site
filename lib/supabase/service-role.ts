import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only client with elevated privileges. Used for operations that must bypass RLS
 * (e.g. loading push tokens for all members of a church after a pastor action).
 * Returns null when SUPABASE_SERVICE_ROLE_KEY is unset — callers should no-op.
 */
export function createServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
