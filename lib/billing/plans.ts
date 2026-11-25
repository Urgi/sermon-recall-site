/**
 * Paid plans. Prices live in Stripe; labels here are display only and must match.
 * Member limits must match public.church_member_limit() in the database.
 */
export type PlanId = 'none' | 'standard' | 'plus';
export type PaidPlanId = Exclude<PlanId, 'none'>;

type PlanConfig = {
  label: string;
  priceLabel: string;
  /** USD per month, for locale-aware display. */
  priceUsd: number;
  memberLimit: number;
  priceEnv: string;
};

export const PAID_PLANS: Record<PaidPlanId, PlanConfig> = {
  standard: {
    label: 'Standard',
    priceLabel: '$49.99/month',
    priceUsd: 49.99,
    memberLimit: 100,
    priceEnv: 'STRIPE_PRICE_STANDARD_MONTHLY',
  },
  plus: {
    label: 'Plus',
    priceLabel: '$74.99/month',
    priceUsd: 74.99,
    memberLimit: 500,
    priceEnv: 'STRIPE_PRICE_PLUS_MONTHLY',
  },
};

/** Churches without a paid plan get the Standard limit. */
export const NO_PLAN_MEMBER_LIMIT = PAID_PLANS.standard.memberLimit;

export const PLAN_LABELS: Record<PlanId, string> = {
  none: 'No plan',
  standard: PAID_PLANS.standard.label,
  plus: PAID_PLANS.plus.label,
};

export function isPaidPlan(value: unknown): value is PaidPlanId {
  return value === 'standard' || value === 'plus';
}

export function priceIdFor(plan: PaidPlanId): string | null {
  return process.env[PAID_PLANS[plan].priceEnv]?.trim() || null;
}

/** Reverse lookup: Stripe price ID → plan (used by the webhook). */
export function planForPriceId(priceId: string | null | undefined): PaidPlanId | null {
  if (!priceId) return null;
  if (priceId === priceIdFor('plus')) return 'plus';
  if (priceId === priceIdFor('standard')) return 'standard';
  return null;
}
