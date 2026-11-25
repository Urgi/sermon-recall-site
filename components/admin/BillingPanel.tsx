'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { ModalShell } from '@/components/admin/ModalShell';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { localizeApiError } from '@/lib/i18n/api-errors';
import type { PaidPlanId } from '@/lib/billing/plans';
import { supportEmail } from '@/lib/public-site/config';

export type PlanOption = {
  id: PaidPlanId;
  label: string;
  priceUsd: number;
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
  if (!res.ok) throw new Error(localizeApiError(json.error));
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
  const { t, language } = useLanguage();
  const price = (plan: PlanOption) =>
    t('billing.pricePerMonth', {
      price: new Intl.NumberFormat(language, { style: 'currency', currency: 'USD' }).format(plan.priceUsd),
    });
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
      if (!url) throw new Error(t('common.error'));
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
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
      setSuccess(t('billing.switched', { plan: plan.label }));
      router.refresh();
    } catch (e) {
      setConfirmPlan(null);
      setError(e instanceof Error ? e.message : t('common.error'));
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
                  {isCurrent && <span className="admin-badge ml-2 align-middle">{t('billing.current')}</span>}
                </h2>
                <p className="admin-body mt-1">{price(plan)}</p>
                <p className="admin-body mt-1 text-sm">{t('billing.upTo', { n: plan.memberLimit })}</p>
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
                    ? t('billing.redirecting')
                    : busy === `switch-${plan.id}`
                      ? t('billing.switching')
                      : !plan.available
                        ? t('billing.unavailable')
                        : hasActiveSubscription
                          ? t('billing.switchTo', { plan: plan.label })
                          : t('billing.subscribe')}
                </button>
              )}
              {!isCurrent && hasActiveSubscription && tooSmall && (
                <p className="admin-body text-xs">
                  {t('billing.tooSmall', { n: memberCount ?? 0 })}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="admin-body text-xs">
        {t('billing.moreThan')}{' '}
        <a href={`mailto:${supportEmail()}?subject=Custom%20plan`} className="admin-link">
          {t('billing.custom')}
        </a>
      </p>

      {hasCustomer && (
        <div className="admin-card flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="admin-body">{t('billing.manageHint')}</p>
          <button
            type="button"
            className="admin-btn-secondary"
            disabled={busy !== null}
            onClick={() => redirect('portal', '/api/billing/portal')}
          >
            {busy === 'portal' ? t('billing.opening') : t('billing.manage')}
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
            {t('billing.switchTitle', { plan: dialogPlan?.label ?? '' })}
          </h3>
          {dialogPlan && (
            <p className="admin-body mt-2">
              {t('billing.switchBody', { price: price(dialogPlan), n: dialogPlan.memberLimit })}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmPlan(null)}
              disabled={busy !== null}
              className="admin-btn-secondary"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => dialogPlan && void switchPlan(dialogPlan)}
              disabled={busy !== null}
              className="admin-btn-primary"
            >
              {busy?.startsWith('switch-')
                ? t('billing.switching')
                : dialogPlan
                  ? t('billing.switchTo', { plan: dialogPlan.label })
                  : t('billing.switchToPlan')}
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
