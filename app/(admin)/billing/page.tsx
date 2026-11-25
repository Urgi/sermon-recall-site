import type { Metadata } from 'next';

import { localizedTitle } from '@/lib/i18n/server';
import { Suspense } from 'react';

import { AdminChromeCopy } from '@/components/admin/AdminChromeCopy';
import { DateInText, LocalizedDate } from '@/components/admin/LocalizedDate';
import { AdminPageFallback } from '@/components/admin/AdminPageFallback';
import { BillingPanel } from '@/components/admin/BillingPanel';
import type { UiKey } from '@/lib/i18n/ui';
import { requireApprovedStaffSession } from '@/lib/auth/server';
import { staffHasPermission } from '@/lib/auth/profile';
import {
  NO_PLAN_MEMBER_LIMIT,
  PAID_PLANS,
  PLAN_LABELS,
  isPaidPlan,
  priceIdFor,
  type PaidPlanId,
  type PlanId,
} from '@/lib/billing/plans';
import type { SubscriptionRow } from '@/lib/billing/subscriptions';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export function generateMetadata(): Metadata {
  return { title: localizedTitle('nav.billing') };
}

export const dynamic = 'force-dynamic';

export default function BillingPage({ searchParams }: { searchParams: { checkout?: string } }) {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <BillingPageBody checkout={searchParams.checkout} />
    </Suspense>
  );
}

const STATUS_BADGES: Record<string, { label: UiKey; variant: string }> = {
  active: { label: 'billing.status.active', variant: 'admin-badge--ready' },
  trialing: { label: 'billing.status.trialing', variant: 'admin-badge--submitted' },
  past_due: { label: 'billing.status.past_due', variant: 'admin-badge--failed' },
  unpaid: { label: 'billing.status.unpaid', variant: 'admin-badge--failed' },
  incomplete: { label: 'billing.status.incomplete', variant: 'admin-badge--processing' },
  incomplete_expired: { label: 'billing.status.incomplete_expired', variant: 'admin-badge--draft' },
  canceled: { label: 'billing.status.canceled', variant: 'admin-badge--draft' },
  paused: { label: 'billing.status.paused', variant: 'admin-badge--draft' },
  none: { label: 'billing.status.none', variant: 'admin-badge--draft' },
};

function statusBadge(status: string): { label: UiKey; variant: string } {
  return STATUS_BADGES[status] ?? { label: 'billing.status.none', variant: 'admin-badge--draft' };
}

async function BillingPageBody({ checkout }: { checkout?: string }) {
  const ctx = await requireApprovedStaffSession();
  const churchId = ctx.profile.church_id;

  if (!churchId || !staffHasPermission(ctx.staffRole, ctx.profile, 'can_manage_billing')) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="admin-heading">
          <AdminChromeCopy k="billing.title" />
        </h1>
        <p className="admin-body mt-4">
          <AdminChromeCopy k="billing.onlyOwner" />
        </p>
      </div>
    );
  }

  // RLS: only billing managers of this church can read the row.
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('church_subscriptions')
    .select('*')
    .eq('church_id', churchId)
    .maybeSingle();
  const sub = data as SubscriptionRow | null;

  const plan = (sub?.plan ?? 'none') as PlanId;
  const status = sub?.status ?? 'none';
  const active = Boolean(sub?.stripe_subscription_id) && ['active', 'trialing', 'past_due'].includes(status);
  const graceActive = status === 'past_due' && sub?.grace_until;

  const { data: usage } = await supabase.rpc('pastor_church_member_usage');
  const usageRow = usage as { member_count?: number; member_limit?: number } | null;
  const memberCount = typeof usageRow?.member_count === 'number' ? usageRow.member_count : null;
  const memberLimit =
    usageRow?.member_limit ?? (active && isPaidPlan(plan) ? PAID_PLANS[plan].memberLimit : NO_PLAN_MEMBER_LIMIT);
  const atLimit = memberCount !== null && memberCount >= memberLimit;

  const planOptions = (Object.keys(PAID_PLANS) as PaidPlanId[]).map((id) => ({
    id,
    label: PAID_PLANS[id].label,
    priceUsd: PAID_PLANS[id].priceUsd,
    memberLimit: PAID_PLANS[id].memberLimit,
    available: Boolean(priceIdFor(id)),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="admin-heading">
          <AdminChromeCopy k="billing.title" />
        </h1>
        <p className="admin-body mt-2">
          <AdminChromeCopy k="billing.intro" />
        </p>
      </header>

      {checkout === 'success' && (
        <div className="admin-notice admin-notice--success" role="status">
          <p>
            <strong>
              <AdminChromeCopy k="billing.successTitle" />
            </strong>{' '}
            <AdminChromeCopy k="billing.successBody" />
          </p>
        </div>
      )}
      {checkout === 'canceled' && (
        <div className="admin-notice admin-notice--info" role="status">
          <p>
            <strong>
              <AdminChromeCopy k="billing.canceledTitle" />
            </strong>{' '}
            <AdminChromeCopy k="billing.canceledBody" />
          </p>
        </div>
      )}
      {graceActive && (
        <div className="admin-notice admin-notice--error" role="alert">
          <p>
            <strong>
              <AdminChromeCopy k="billing.failedTitle" />
            </strong>{' '}
            <DateInText k="billing.failedBody" iso={sub!.grace_until} />
          </p>
        </div>
      )}

      <section className="admin-card p-5">
        <h2 className="admin-section-title">
          <AdminChromeCopy k="billing.currentPlan" />
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-admin-dim">
            <AdminChromeCopy k="billing.plan" />
          </dt>
          <dd>{plan === 'none' ? <AdminChromeCopy k="plan.none" /> : (PLAN_LABELS[plan] ?? plan)}</dd>
          <dt className="self-center text-admin-dim">
            <AdminChromeCopy k="billing.status" />
          </dt>
          <dd>
            <span className={`admin-badge normal-case ${statusBadge(status).variant}`}>
              <AdminChromeCopy k={statusBadge(status).label} />
            </span>
          </dd>
          {active && sub?.current_period_end ? (
            <>
              <dt className="text-admin-dim">
                <AdminChromeCopy k={sub.cancel_at_period_end ? 'billing.ends' : 'billing.renews'} />
              </dt>
              <dd>
                <LocalizedDate iso={sub.current_period_end} />
              </dd>
            </>
          ) : null}
          <dt className="text-admin-dim">
            <AdminChromeCopy k="billing.members" />
          </dt>
          <dd className="tabular-nums">{memberCount === null ? '—' : `${memberCount} / ${memberLimit}`}</dd>
        </dl>
        {atLimit && (
          <div className="admin-notice admin-notice--warning mt-4" role="alert">
            <p>
              <strong>
                <AdminChromeCopy k="billing.limitTitle" />
              </strong>{' '}
              <AdminChromeCopy k="billing.limitBody" />
            </p>
          </div>
        )}
      </section>

      <BillingPanel
        hasCustomer={Boolean(sub?.stripe_customer_id)}
        hasActiveSubscription={active}
        currentPlan={active && isPaidPlan(plan) ? plan : null}
        plans={planOptions}
        memberCount={memberCount}
      />
    </div>
  );
}
