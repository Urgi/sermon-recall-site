import { NextResponse } from 'next/server';

import { writeAuditLog } from '@/lib/audit/log';
import { authorizeApiPermission, getChurchForProfile } from '@/lib/auth/server';
import { ensureStripeCustomer } from '@/lib/billing/customer';
import { isPaidPlan, priceIdFor } from '@/lib/billing/plans';
import { getStripe, siteUrl } from '@/lib/billing/stripe';
import { checkRateLimit } from '@/lib/rate-limit';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = await authorizeApiPermission('can_manage_billing');
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as { plan?: unknown };
  const plan = body.plan === undefined ? 'standard' : body.plan;
  if (!isPaidPlan(plan)) {
    return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 });
  }

  const stripe = getStripe();
  const admin = createServiceRoleClient();
  const priceId = priceIdFor(plan);
  if (!stripe || !admin || !priceId) {
    return NextResponse.json({ error: 'Billing is not configured yet.' }, { status: 503 });
  }

  const churchId = auth.ctx.profile.church_id!;
  const limit = await checkRateLimit(`billing-checkout:${churchId}`, 10, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  const church = await getChurchForProfile(churchId);
  if (!church) return NextResponse.json({ error: 'Church not found.' }, { status: 404 });

  const { data: existing } = await admin
    .from('church_subscriptions')
    .select('status, stripe_subscription_id')
    .eq('church_id', churchId)
    .maybeSingle();
  if (existing?.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(existing.status)) {
    return NextResponse.json(
      { error: 'Your church already has a subscription. Use Manage billing to change plans.' },
      { status: 409 },
    );
  }

  try {
    const customer = await ensureStripeCustomer(admin, stripe, church, auth.ctx.user.email!);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: churchId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata: { church_id: churchId } },
      metadata: { church_id: churchId },
      success_url: `${siteUrl()}/billing?checkout=success`,
      cancel_url: `${siteUrl()}/billing?checkout=canceled`,
    });
    await writeAuditLog({
      churchId,
      actorUserId: auth.ctx.user.id,
      action: 'billing.checkout_started',
      entityType: 'church',
      entityId: churchId,
      metadata: { plan },
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('[billing] checkout failed', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 502 });
  }
}
