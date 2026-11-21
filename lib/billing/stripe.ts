import Stripe from 'stripe';

let client: Stripe | null = null;

/** Server-only Stripe client. Test keys by default; live keys only when STRIPE_MODE=live. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  const isTest = key.startsWith('sk_test_') || key.startsWith('rk_test_');
  const isLive = key.startsWith('sk_live_') || key.startsWith('rk_live_');
  const liveAllowed = process.env.STRIPE_MODE?.trim() === 'live';
  if (!(isTest || (isLive && liveAllowed))) {
    console.error('[billing] Stripe key rejected (live keys require STRIPE_MODE=live); billing is disabled.');
    return null;
  }
  client ??= new Stripe(key);
  return client;
}

export { siteOrigin as siteUrl } from '@/lib/site-origin';
