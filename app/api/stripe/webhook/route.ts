import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { getStripe } from '@/lib/billing/stripe';
import { customerId, markPaymentFailed, markPaymentSucceeded, syncSubscription } from '@/lib/billing/subscriptions';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const admin = createServiceRoleClient();
  if (!stripe || !secret || !admin) {
    return NextResponse.json({ error: 'Billing not configured.' }, { status: 503 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  // Idempotency: first writer wins; a duplicate delivery returns 200 without reprocessing.
  const { error: dupErr } = await admin
    .from('stripe_webhook_events')
    .insert({ event_id: event.id, event_type: event.type });
  if (dupErr) {
    if (dupErr.code === '23505') return NextResponse.json({ received: true, duplicate: true });
    console.error('[stripe-webhook] event log failed', dupErr.message);
    return NextResponse.json({ error: 'Temporary error.' }, { status: 500 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        const subId = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          if (!sub.metadata?.church_id && s.client_reference_id) {
            sub.metadata = { ...sub.metadata, church_id: s.client_reference_id };
          }
          await syncSubscription(admin, sub);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(admin, event.data.object as Stripe.Subscription);
        break;
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const inv = event.data.object as Stripe.Invoice;
        const cust = customerId(inv.customer);
        if (cust) await markPaymentSucceeded(admin, cust);
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        const cust = customerId(inv.customer);
        if (cust) await markPaymentFailed(admin, cust);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    // Let Stripe retry: forget the event so the redelivery is processed.
    await admin.from('stripe_webhook_events').delete().eq('event_id', event.id);
    console.error('[stripe-webhook] handler failed', event.type, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
