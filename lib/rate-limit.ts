import type { SupabaseClient } from '@supabase/supabase-js';

import { createServiceRoleClient } from '@/lib/supabase/service-role';

type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSec: number };

/**
 * Simple DB-backed rate limiter for serverless (service role only).
 */
export async function checkRateLimit(
  bucketKey: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const admin = createServiceRoleClient();
  if (!admin) return { allowed: true };

  const now = new Date();
  const { data: row } = await admin
    .from('api_rate_limits')
    .select('request_count, window_start')
    .eq('bucket_key', bucketKey)
    .maybeSingle();

  if (!row) {
    await admin.from('api_rate_limits').insert({
      bucket_key: bucketKey,
      request_count: 1,
      window_start: now.toISOString(),
    });
    return { allowed: true };
  }

  const windowStart = new Date(row.window_start as string);
  const elapsed = now.getTime() - windowStart.getTime();

  if (elapsed >= windowMs) {
    await admin
      .from('api_rate_limits')
      .update({ request_count: 1, window_start: now.toISOString() })
      .eq('bucket_key', bucketKey);
    return { allowed: true };
  }

  const count = (row.request_count as number) ?? 0;
  if (count >= maxRequests) {
    const retryAfterSec = Math.ceil((windowMs - elapsed) / 1000);
    return { allowed: false, retryAfterSec };
  }

  await admin
    .from('api_rate_limits')
    .update({ request_count: count + 1 })
    .eq('bucket_key', bucketKey);

  return { allowed: true };
}

export async function pruneStalePushTokens(
  admin: SupabaseClient,
  staleTokenErrors: string[],
  tokenByErrorIndex: string[],
): Promise<void> {
  const stale = new Set<string>();
  staleTokenErrors.forEach((err, i) => {
    if (err === 'DeviceNotRegistered' || err.includes('DeviceNotRegistered')) {
      const tok = tokenByErrorIndex[i];
      if (tok) stale.add(tok);
    }
  });
  if (stale.size === 0) return;

  await admin.from('user_push_tokens').delete().in('expo_push_token', Array.from(stale));
}
