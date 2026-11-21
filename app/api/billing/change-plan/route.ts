import { NextResponse } from 'next/server';

import { writeAuditLog } from '@/lib/audit/log';
import { authorizeApiPermission } from '@/lib/auth/server';
import { PAID_PLANS, isPaidPlan, priceIdFor } from '@/lib/billing/plans';
import { getStripe } from '@/lib/billing/stripe';
import { syncSubscription } from '@/lib/billing/subscriptions';
import { checkRateLimit } from '@/lib/rate-limit';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

/** Switch an active subscription between Standard and Plus (prorated). */
export async function POST(req: Request) {
  const auth = await authorizeApiPermission('can_manage_billing');
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as { plan?: unknown };
  if (!isPaidPlan(body.plan)) {
    return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 });
  }
  const plan = body.plan;

  const stripe = getStripe();
  const admin = createServiceRoleClient();
  const priceId = priceIdFor(plan);
  if (!stripe || !admin || !priceId) {
    return NextResponse.json({ error: 'Billing is not configured yet.' }, { status: 503 });
  }

  const churchId = auth.ctx.profile.church_id!;
  const limit = await checkRateLimit(`billing-change-plan:${churchId}`, 10, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  const { data: row } = await admin
    .from('church_subscriptions')
    .select('plan, status, stripe_subscription_id')
    .eq('church_id', churchId)
    .maybeSingle();
  if (!row?.stripe_subscription_id || !['active', 'trialing', 'past_due'].includes(row.status as string)) {
    return NextResponse.json({ error: 'No active subscription. Subscribe first.' }, { status: 409 });
  }
  if (row.plan === plan) {
    return NextResponse.json({ error: `You are already on ${PAID_PLANS[plan].label}.` }, { status: 409 });
  }

  const { data: count, error: countErr } = await admin.rpc('church_congregation_count', {
    p_church_id: churchId,
  });
  if (countErr) {
    console.error('[billing] member count failed', countErr.message);
    return NextResponse.json({ error: 'Could not check your member count.' }, { status: 500 });
  }
  const members = Number(count ?? 0);
  if (members > PAID_PLANS[plan].memberLimit) {
    return NextResponse.json(
      {
        error: `Your church has ${members} members; ${PAID_PLANS[plan].label} allows ${PAID_PLANS[plan].memberLimit}. Remove members first.`,
      },
      { status: 409 },
    );
  }

  try {
    const current = await stripe.subscriptions.retrieve(row.stripe_subscription_id as string);
    const item = current.items.data[0];
    if (!item) throw new Error('subscription has no items');
    const updated = await stripe.subscriptions.update(current.id, {
      items: [{ id: item.id, price: priceId }],
      proration_behavior: 'create_prorations',
      metadata: { ...current.metadata, church_id: churchId },
    });
    await syncSubscription(admin, updated);
    await writeAuditLog({
      churchId,
      actorUserId: auth.ctx.user.id,
      action: 'billing.plan_changed',
      entityType: 'church',
      entityId: churchId,
      metadata: { from: row.plan, to: plan },
    });
    return NextResponse.json({ ok: true, plan });
  } catch (e) {
    console.error('[billing] change plan failed', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Could not change your plan.' }, { status: 502 });
  }
}
