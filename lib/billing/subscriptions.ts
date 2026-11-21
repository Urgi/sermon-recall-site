import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

import { planForPriceId } from '@/lib/billing/plans';

export const GRACE_DAYS = 14;

export type SubscriptionRow = {
  church_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  grace_until: string | null;
};

/** Current period end moved onto subscription items in newer Stripe API versions; support both. */
function periodEndIso(sub: Stripe.Subscription): string | null {
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  const secs = sub.items?.data?.[0]
    ? (sub.items.data[0] as unknown as { current_period_end?: number }).current_period_end
    : undefined;
  const v = secs ?? legacy;
  return v ? new Date(v * 1000).toISOString() : null;
}

export function customerId(c: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!c) return null;
  return typeof c === 'string' ? c : c.id;
}

/** Sync a Stripe subscription into church_subscriptions. Church found by metadata, else by customer. */
export async function syncSubscription(
  admin: SupabaseClient,
  sub: Stripe.Subscription,
): Promise<void> {
  const cust = customerId(sub.customer);
  let churchId = sub.metadata?.church_id || null;
  if (!churchId && cust) {
    const { data } = await admin
      .from('church_subscriptions')
      .select('church_id')
      .eq('stripe_customer_id', cust)
      .maybeSingle();
    churchId = (data?.church_id as string | undefined) ?? null;
  }
  if (!churchId) {
    console.warn('[billing] subscription without church', sub.id);
    return;
  }

  const ended = sub.status === 'canceled' || sub.status === 'incomplete_expired';
  const plan = ended ? 'none' : (planForPriceId(sub.items?.data?.[0]?.price?.id) ?? 'standard');

  const row: Record<string, unknown> = {
    church_id: churchId,
    stripe_customer_id: cust,
    stripe_subscription_id: ended ? null : sub.id,
    plan,
    status: sub.status,
    current_period_end: periodEndIso(sub),
    // Newer API versions: portal cancellations set cancel_at and leave cancel_at_period_end false.
    cancel_at_period_end: Boolean(sub.cancel_at_period_end || sub.cancel_at),
    updated_at: new Date().toISOString(),
  };
  if (sub.status === 'active' || sub.status === 'trialing') row.grace_until = null;

  const { error } = await admin.from('church_subscriptions').upsert(row, { onConflict: 'church_id' });
  if (error) throw new Error(`church_subscriptions upsert failed: ${error.message}`);
}

/** Payment failed: open a grace window (set once; never extended by retries). Nothing is enforced yet. */
export async function markPaymentFailed(admin: SupabaseClient, customer: string): Promise<void> {
  const { data } = await admin
    .from('church_subscriptions')
    .select('church_id, grace_until')
    .eq('stripe_customer_id', customer)
    .maybeSingle();
  if (!data) return;
  const grace =
    (data.grace_until as string | null) ??
    new Date(Date.now() + GRACE_DAYS * 86_400_000).toISOString();
  await admin
    .from('church_subscriptions')
    .update({ status: 'past_due', grace_until: grace, updated_at: new Date().toISOString() })
    .eq('church_id', data.church_id);
}

/** Invoice paid: clear the grace window; subscription.updated sets the final status. */
export async function markPaymentSucceeded(admin: SupabaseClient, customer: string): Promise<void> {
  await admin
    .from('church_subscriptions')
    .update({ grace_until: null, updated_at: new Date().toISOString() })
    .eq('stripe_customer_id', customer);
}
