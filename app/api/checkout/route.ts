import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { isPackId, PACKS } from '@/lib/pricing';
import { normalizeEmail, sessionFromRequest } from '@/lib/session';

export const runtime = 'nodejs';

function siteOrigin(req: Request): string {
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host =
    req.headers.get('x-forwarded-host') || req.headers.get('host') || 'sideletters.ectotropy.com';
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'Payments are not configured on this deployment.' },
      { status: 503 }
    );
  }

  const session = await sessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Sign in at /access first.' }, { status: 401 });
  }

  let body: { pack?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!isPackId(body.pack)) {
    return NextResponse.json({ error: 'Unknown pack.' }, { status: 400 });
  }
  const pack = PACKS[body.pack];
  const origin = siteOrigin(req);
  const email = normalizeEmail(session.email);

  const stripe = new Stripe(key);
  const checkout = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: session.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: pack.amountCents,
          product_data: {
            name: `Side Letter Extractor — ${pack.label}`,
          },
        },
      },
    ],
    metadata: { credits: String(pack.credits), email },
    // Requires Stripe Tax to be activated in the dashboard before enabling.
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === '1' },
    success_url: `${origin}/?purchase=success`,
    cancel_url: `${origin}/?purchase=cancelled`,
  });

  if (!checkout.url) {
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 502 });
  }
  return NextResponse.json({ url: checkout.url });
}
