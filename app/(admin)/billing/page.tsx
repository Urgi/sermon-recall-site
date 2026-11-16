import { Suspense } from 'react';

import { AdminPageFallback } from '@/components/admin/AdminPageFallback';
import { BillingPanel } from '@/components/admin/BillingPanel';
import { requireApprovedStaffSession } from '@/lib/auth/server';
import { staffHasPermission } from '@/lib/auth/profile';
import { PLAN_LABELS, STANDARD_PRICE_LABEL, standardPriceId, type PlanId } from '@/lib/billing/plans';
import type { SubscriptionRow } from '@/lib/billing/subscriptions';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default function BillingPage({ searchParams }: { searchParams: { checkout?: string } }) {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <BillingPageBody checkout={searchParams.checkout} />
    </Suspense>
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
        <div className="admin-card p-4" role="status">
          Thanks! Your subscription is being confirmed — refresh in a moment if the plan below has
          not updated.
        </div>
      )}
      {checkout === 'canceled' && (
        <div className="admin-card p-4" role="status">
          Checkout was canceled. You have not been charged.
        </div>
      )}
      {graceActive && (
        <div className="admin-card p-4" role="alert">
          Your last payment failed. Please update your payment method in Manage billing before{' '}
          {fmt(sub!.grace_until)}.
        </div>
      )}

      <section className="admin-card p-5">
        <h2 className="admin-section-title">Current plan</h2>
        <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-admin-dim">Plan</dt>
          <dd>{PLAN_LABELS[plan] ?? plan}</dd>
          <dt className="text-admin-dim">Status</dt>
          <dd>
            <span className="admin-badge">{status === 'none' ? 'no subscription' : status.replace('_', ' ')}</span>
          </dd>
          <dt className="text-admin-dim">{sub?.cancel_at_period_end ? 'Ends on' : 'Renews on'}</dt>
          <dd>{fmt(sub?.current_period_end ?? null)}</dd>
        </dl>
        <p className="admin-body mt-3 text-xs">Test mode — use card 4242 4242 4242 4242.</p>
      </section>

      <BillingPanel
        hasCustomer={Boolean(sub?.stripe_customer_id)}
        hasActiveSubscription={active}
        priceLabel={STANDARD_PRICE_LABEL}
        available={Boolean(standardPriceId())}
      />
    </div>
  );
}
