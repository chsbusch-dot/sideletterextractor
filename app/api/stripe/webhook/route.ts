import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { creditPurchase } from '@/lib/billing';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  }

  const payload = await req.text();
  const stripe = new Stripe(key);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const checkout = event.data.object as Stripe.Checkout.Session;
    if (checkout.payment_status === 'paid') {
      const email = checkout.metadata?.email || '';
      const credits = Number(checkout.metadata?.credits || 0);
      if (!email || !Number.isInteger(credits) || credits <= 0) {
        // Unrecoverable payload problem: acknowledge so Stripe stops retrying,
        // and leave the session id in the response for manual reconciliation.
        return NextResponse.json({ received: true, ignored: checkout.id });
      }
      const now = Date.now();
      try {
        await creditPurchase(event.id, {
          ts: now,
          iso: new Date(now).toISOString(),
          email,
          credits,
          amount_cents: checkout.amount_total ?? 0,
          currency: (checkout.currency || 'usd').toUpperCase(),
          checkout_session_id: checkout.id,
        });
      } catch {
        // Redis unavailable: return 500 so Stripe retries the delivery.
        return NextResponse.json({ error: 'Could not apply credit.' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
