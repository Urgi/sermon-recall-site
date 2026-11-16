import Stripe from 'stripe';

let client: Stripe | null = null;

/** Server-only Stripe client. TEST MODE ONLY: refuses live keys. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!key.startsWith('sk_test_') && !key.startsWith('rk_test_')) {
    console.error('[billing] STRIPE_SECRET_KEY is not a test-mode key; billing is disabled.');
    return null;
  }
  client ??= new Stripe(key);
  return client;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000').replace(/\/$/, '');
}
