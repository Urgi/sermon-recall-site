'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { ModalShell } from '@/components/admin/ModalShell';
import type { PaidPlanId } from '@/lib/billing/plans';
import { supportEmail } from '@/lib/public-site/config';

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
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<PlanOption | null>(null);
  // Keeps the dialog copy while it animates closed.
  const lastConfirmRef = useRef<PlanOption | null>(null);
  if (confirmPlan) lastConfirmRef.current = confirmPlan;
  const dialogPlan = confirmPlan ?? lastConfirmRef.current;

  async function redirect(key: string, path: string, body?: unknown) {
    setBusy(key);
    setError(null);
    setSuccess(null);
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
    setBusy(`switch-${plan.id}`);
    setError(null);
    setSuccess(null);
    try {
      await post('/api/billing/change-plan', { plan: plan.id });
      setConfirmPlan(null);
      setSuccess(`You're now on ${plan.label}. Your next invoice reflects the change.`);
      router.refresh();
    } catch (e) {
      setConfirmPlan(null);
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {success && (
        <div className="admin-notice admin-notice--success" role="status">
          <p>{success}</p>
        </div>
      )}
      {error && (
        <div className="admin-notice admin-notice--error" role="alert">
          <p>{error}</p>
        </div>
      )}
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
                      ? setConfirmPlan(plan)
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
      <p className="admin-body text-xs">
        More than 500 members?{' '}
        <a href={`mailto:${supportEmail()}?subject=Custom%20plan`} className="admin-link">
          Contact us
        </a>{' '}
        for a custom plan.
      </p>

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

      <ModalShell
        open={confirmPlan !== null}
        onClose={() => setConfirmPlan(null)}
        labelledBy="billing-switch-title"
        locked={busy !== null}
        panelClassName="admin-card max-w-md shadow-xl"
      >
        <div className="p-6">
          <h3 id="billing-switch-title" className="admin-section-title">
            Switch to {dialogPlan?.label}?
          </h3>
          {dialogPlan && (
            <p className="admin-body mt-2">
              {dialogPlan.priceLabel}, up to {dialogPlan.memberLimit} members. Your next invoice is
              adjusted for the rest of this billing period.
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmPlan(null)}
              disabled={busy !== null}
              className="admin-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => dialogPlan && void switchPlan(dialogPlan)}
              disabled={busy !== null}
              className="admin-btn-primary"
            >
              {busy?.startsWith('switch-') ? 'Switching…' : `Switch to ${dialogPlan?.label ?? 'plan'}`}
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
