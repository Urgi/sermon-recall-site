import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';

/** Returns the church's Stripe customer id, creating the customer (and row) on first use. */
export async function ensureStripeCustomer(
  admin: SupabaseClient,
  stripe: Stripe,
  church: { id: string; name: string },
  billingEmail: string,
): Promise<string> {
  const { data } = await admin
    .from('church_subscriptions')
    .select('stripe_customer_id')
    .eq('church_id', church.id)
    .maybeSingle();
  if (data?.stripe_customer_id) return data.stripe_customer_id as string;

  const customer = await stripe.customers.create(
    { name: church.name, email: billingEmail, metadata: { church_id: church.id } },
    { idempotencyKey: `church-customer-${church.id}` },
  );
  const { error } = await admin
    .from('church_subscriptions')
    .upsert({ church_id: church.id, stripe_customer_id: customer.id }, { onConflict: 'church_id' });
  if (error) throw new Error(error.message);
  return customer.id;
}
