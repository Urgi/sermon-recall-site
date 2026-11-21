'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { PaidPlanId } from '@/lib/billing/plans';

export type PlanOption = {
  id: PaidPlanId;
  label: string;
  priceLabel: string;
  memberLimit: number;
  available: boolean;
};

async function post(path: string, body?: unknown): Promise<{ url?: string }> {
  const res = await fetch(path, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok) throw new Error(json.error || 'Something went wrong.');
  return json;
}

export function BillingPanel({
  hasCustomer,
  hasActiveSubscription,
  currentPlan,
  plans,
  memberCount,
}: {
  hasCustomer: boolean;
  hasActiveSubscription: boolean;
  currentPlan: PaidPlanId | null;
  plans: PlanOption[];
  memberCount: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function redirect(key: string, path: string, body?: unknown) {
    setBusy(key);
    setError(null);
    try {
      const { url } = await post(path, body);
      if (!url) throw new Error('Something went wrong.');
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(null);
    }
  }

  async function switchPlan(plan: PlanOption) {
    const ok = window.confirm(
      `Switch to ${plan.label} (${plan.priceLabel}, up to ${plan.memberLimit} members)? ` +
        'Your next invoice is adjusted for the rest of this billing period.',
    );
    if (!ok) return;
    setBusy(`switch-${plan.id}`);
    setError(null);
    try {
      await post('/api/billing/change-plan', { plan: plan.id });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = hasActiveSubscription && currentPlan === plan.id;
          const tooSmall = memberCount !== null && memberCount > plan.memberLimit;
          return (
            <div key={plan.id} className="admin-card flex flex-col gap-3 p-5">
              <div>
                <h2 className="admin-section-title">
                  {plan.label}
                  {isCurrent && <span className="admin-badge ml-2 align-middle">Current</span>}
                </h2>
                <p className="admin-body mt-1">{plan.priceLabel}</p>
                <p className="admin-body mt-1 text-sm">Up to {plan.memberLimit} members</p>
              </div>
              {!isCurrent && (
                <button
                  type="button"
                  className={hasActiveSubscription ? 'admin-btn-secondary' : 'admin-btn-primary'}
                  disabled={!plan.available || busy !== null || (hasActiveSubscription && tooSmall)}
                  onClick={() =>
                    hasActiveSubscription
                      ? switchPlan(plan)
                      : redirect(`checkout-${plan.id}`, '/api/billing/checkout', { plan: plan.id })
                  }
                >
                  {busy === `checkout-${plan.id}`
                    ? 'Redirecting…'
                    : busy === `switch-${plan.id}`
                      ? 'Switching…'
                      : !plan.available
                        ? 'Not available yet'
                        : hasActiveSubscription
                          ? `Switch to ${plan.label}`
                          : 'Subscribe'}
                </button>
              )}
              {!isCurrent && hasActiveSubscription && tooSmall && (
                <p className="admin-body text-xs">
                  You have {memberCount} members. Remove members on the Members page to switch.
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="admin-body text-xs">More than 500 members? Contact us for a custom plan.</p>

      {hasCustomer && (
        <div className="admin-card flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="admin-body">Update your card, download invoices, or cancel.</p>
          <button
            type="button"
            className="admin-btn-secondary"
            disabled={busy !== null}
            onClick={() => redirect('portal', '/api/billing/portal')}
          >
            {busy === 'portal' ? 'Opening…' : 'Manage billing'}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
