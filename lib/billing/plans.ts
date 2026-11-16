/** Single paid plan. Placeholder price — the real price lives in Stripe; this label is display only. */
export type PlanId = 'none' | 'standard';

export const PLAN_LABELS: Record<PlanId, string> = {
  none: 'No plan',
  standard: 'Standard',
};

export const STANDARD_PRICE_LABEL = '$49.99/month';

const PRICE_ENV = 'STRIPE_PRICE_STANDARD_MONTHLY';

export function standardPriceId(): string | null {
  return process.env[PRICE_ENV]?.trim() || null;
}

/** Reverse lookup: Stripe price ID → plan (used by the webhook). */
export function planForPriceId(priceId: string | null | undefined): PlanId | null {
  return priceId && priceId === standardPriceId() ? 'standard' : null;
}
