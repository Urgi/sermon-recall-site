import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only client with elevated privileges. Used for operations that must bypass RLS
 * (e.g. loading push tokens for all members of a church after a pastor action).
 * Returns null when SUPABASE_SERVICE_ROLE_KEY is unset — callers should no-op.
 */
export function createServiceRoleClient(): SupabaseClient | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  if (!serviceRoleKeyLooksValid(key)) {
    console.error(
      '[supabase] SUPABASE_SERVICE_ROLE_KEY is missing service_role claim — admin APIs will fail with "User not allowed".',
    );
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      // Pin the service-role JWT so nothing can overwrite Authorization with a user session.
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
    },
  });
}

/** Direct GoTrue admin delete — avoids client quirks and surfaces clear misconfig errors. */
export async function deleteAuthUserWithServiceRole(
  userId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    return {
      ok: false,
      status: 503,
      error:
        'Account data was updated but sign-in removal is not configured (missing SUPABASE_SERVICE_ROLE_KEY). Contact support.',
    };
  }

  if (!serviceRoleKeyLooksValid(key)) {
    return {
      ok: false,
      status: 503,
      error:
        'Account data was updated but the server admin key is not a service_role key (User not allowed). Fix SUPABASE_SERVICE_ROLE_KEY on Vercel.',
    };
  }

  const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
  });

  if (res.ok || res.status === 404) {
    // 404 = already gone — treat as success for idempotent delete.
    return { ok: true };
  }

  let msg = `Auth delete failed (${res.status}).`;
  try {
    const json = (await res.json()) as { msg?: string; message?: string; error_code?: string };
    msg = json.msg || json.message || msg;
  } catch {
    /* ignore */
  }

  if (/not allowed/i.test(msg) || res.status === 403) {
    return {
      ok: false,
      status: 503,
      error:
        'Could not finish deleting your sign-in (server admin key misconfigured). Contact support.',
    };
  }

  return { ok: false, status: 500, error: msg };
}

function serviceRoleKeyLooksValid(key: string): boolean {
  try {
    const parts = key.split('.');
    if (parts.length < 2) return false;
    const json = Buffer.from(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
      'utf8',
    );
    const payload = JSON.parse(json) as { role?: string };
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}
