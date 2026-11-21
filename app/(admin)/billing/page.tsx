import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AdminPageFallback } from '@/components/admin/AdminPageFallback';
import { BillingPanel } from '@/components/admin/BillingPanel';
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

export const metadata: Metadata = { title: 'Billing' };

export const dynamic = 'force-dynamic';

export default function BillingPage({ searchParams }: { searchParams: { checkout?: string } }) {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <BillingPageBody checkout={searchParams.checkout} />
    </Suspense>
  );
}

const STATUS_BADGES: Record<string, { label: string; variant: string }> = {
  active: { label: 'Active', variant: 'admin-badge--ready' },
  trialing: { label: 'Trial', variant: 'admin-badge--submitted' },
  past_due: { label: 'Payment failed', variant: 'admin-badge--failed' },
  unpaid: { label: 'Unpaid', variant: 'admin-badge--failed' },
  incomplete: { label: 'Incomplete', variant: 'admin-badge--processing' },
  incomplete_expired: { label: 'Expired', variant: 'admin-badge--draft' },
  canceled: { label: 'Canceled', variant: 'admin-badge--draft' },
  paused: { label: 'Paused', variant: 'admin-badge--draft' },
  none: { label: 'Not subscribed', variant: 'admin-badge--draft' },
};

function statusBadge(status: string): { label: string; variant: string } {
  return (
    STATUS_BADGES[status] ?? {
      label: status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
      variant: 'admin-badge--draft',
    }
  );
}

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';
}

async function BillingPageBody({ checkout }: { checkout?: string }) {
  const ctx = await requireApprovedStaffSession();
  const churchId = ctx.profile.church_id;

  if (!churchId || !staffHasPermission(ctx.staffRole, ctx.profile, 'can_manage_billing')) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="admin-heading">Billing</h1>
        <p className="admin-body mt-4">
          Only your church owner or admin pastor can manage billing. Members of your church are
          never charged.
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
    priceLabel: PAID_PLANS[id].priceLabel,
    memberLimit: PAID_PLANS[id].memberLimit,
    available: Boolean(priceIdFor(id)),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="admin-heading">Billing</h1>
        <p className="admin-body mt-2">
          Your church subscribes here on the web. Members use the mobile app for free and are never
          charged in the app.
        </p>
      </header>

      {checkout === 'success' && (
        <div className="admin-notice admin-notice--success" role="status">
          <p>
            <strong>Thanks for subscribing.</strong> Stripe is confirming your payment. If the plan
            below hasn&apos;t updated yet, refresh in a moment.
          </p>
        </div>
      )}
      {checkout === 'canceled' && (
        <div className="admin-notice admin-notice--info" role="status">
          <p>
            <strong>Checkout canceled.</strong> You have not been charged.
          </p>
        </div>
      )}
      {graceActive && (
        <div className="admin-notice admin-notice--error" role="alert">
          <p>
            <strong>Your last payment failed.</strong> Update your payment method in Manage billing
            before {fmt(sub!.grace_until)} to keep your plan.
          </p>
        </div>
      )}

      <section className="admin-card p-5">
        <h2 className="admin-section-title">Current plan</h2>
        <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-admin-dim">Plan</dt>
          <dd>{PLAN_LABELS[plan] ?? plan}</dd>
          <dt className="self-center text-admin-dim">Status</dt>
          <dd>
            <span className={`admin-badge normal-case ${statusBadge(status).variant}`}>
              {statusBadge(status).label}
            </span>
          </dd>
          {active && sub?.current_period_end ? (
            <>
              <dt className="text-admin-dim">{sub.cancel_at_period_end ? 'Ends on' : 'Renews on'}</dt>
              <dd>{fmt(sub.current_period_end)}</dd>
            </>
          ) : null}
          <dt className="text-admin-dim">Members</dt>
          <dd className="tabular-nums">{memberCount === null ? '—' : `${memberCount} / ${memberLimit}`}</dd>
        </dl>
        {atLimit && (
          <div className="admin-notice admin-notice--warning mt-4" role="alert">
            <p>
              <strong>Member limit reached.</strong> New members can&apos;t join until you upgrade or
              remove members.
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
