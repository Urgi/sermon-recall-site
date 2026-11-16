import { NextResponse } from 'next/server';

import { writeAuditLog } from '@/lib/audit/log';
import { authorizeApiPermission } from '@/lib/auth/server';
import { getStripe, siteUrl } from '@/lib/billing/stripe';
import { checkRateLimit } from '@/lib/rate-limit';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

export async function POST() {
  const auth = await authorizeApiPermission('can_manage_billing');
  if (!auth.ok) return auth.response;

  const stripe = getStripe();
  const admin = createServiceRoleClient();
  if (!stripe || !admin) {
    return NextResponse.json({ error: 'Billing is not configured yet.' }, { status: 503 });
  }

  const churchId = auth.ctx.profile.church_id!;
  const limit = await checkRateLimit(`billing-portal:${churchId}`, 20, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  const { data } = await admin
    .from('church_subscriptions')
    .select('stripe_customer_id')
    .eq('church_id', churchId)
    .maybeSingle();
  if (!data?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account yet. Subscribe first.' }, { status: 404 });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id as string,
      return_url: `${siteUrl()}/billing`,
    });
    await writeAuditLog({
      churchId,
      actorUserId: auth.ctx.user.id,
      action: 'billing.portal_opened',
      entityType: 'church',
      entityId: churchId,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('[billing] portal failed', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Could not open billing portal.' }, { status: 502 });
  }
}
