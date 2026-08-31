// Paid document credits, layered on top of the free per-email quota in lib/leads.ts.
// Stores counters and purchase metadata only — never document content.

import { consumeQuota, FREE_DOCUMENT_LIMIT, makeClient, peekQuota } from './leads';
import { normalizeEmail } from './session';

const creditsKey = (email: string) => `sle:credits:${normalizeEmail(email)}`;
const stripeEventKey = (eventId: string) => `sle:stripe_evt:${eventId}`;
const PURCHASES_LIST = 'sle:purchases';
const MAX_PURCHASES = 10_000;

export type Balance = {
  free_used: number;
  free_limit: number;
  free_remaining: number;
  credits: number;
};

export type ConsumeSource = 'free' | 'paid';

export async function getBalance(email: string): Promise<Balance> {
  const client = makeClient();
  const quota = await peekQuota(email);
  const credits = client ? Number((await client.get<number>(creditsKey(email))) || 0) : 0;
  return {
    free_used: quota.used,
    free_limit: quota.limit,
    free_remaining: quota.remaining,
    credits: Math.max(0, credits),
  };
}

/**
 * Consume one document: free allowance first, then paid credits.
 * Returns the source used, or null when neither is available.
 */
export async function consumeDocument(email: string): Promise<ConsumeSource | null> {
  const free = await consumeQuota(email);
  if (free) return 'free';

  const client = makeClient();
  if (!client) return null;
  const remaining = await client.decr(creditsKey(email));
  if (remaining < 0) {
    await client.incr(creditsKey(email));
    return null;
  }
  return 'paid';
}

/** Give a consumed document back, e.g. when the extraction itself failed. */
export async function refundDocument(email: string, source: ConsumeSource): Promise<void> {
  const client = makeClient();
  if (!client) return;
  try {
    if (source === 'paid') {
      await client.incr(creditsKey(email));
    } else {
      const used = await client.decr(`sle:quota:${normalizeEmail(email)}`);
      if (used < 0) await client.incr(`sle:quota:${normalizeEmail(email)}`);
    }
  } catch {
    // A failed refund must not mask the original extraction error.
  }
}

export type PurchaseRecord = {
  ts: number;
  iso: string;
  email: string;
  credits: number;
  amount_cents: number;
  currency: string;
  checkout_session_id: string;
};

/**
 * Idempotently credit a completed Stripe checkout. Returns false when this
 * Stripe event was already processed (webhook retries).
 */
export async function creditPurchase(
  stripeEventId: string,
  purchase: PurchaseRecord
): Promise<boolean> {
  const client = makeClient();
  if (!client) throw new Error('Redis is not configured.');

  const firstTime = await client.set(stripeEventKey(stripeEventId), '1', {
    nx: true,
    ex: 60 * 60 * 24 * 30,
  });
  if (firstTime === null) return false;

  await client.incrby(creditsKey(purchase.email), purchase.credits);
  try {
    await client.lpush(PURCHASES_LIST, JSON.stringify(purchase));
    await client.ltrim(PURCHASES_LIST, 0, MAX_PURCHASES - 1);
  } catch {
    // The credit is applied; the audit record is best-effort.
  }
  return true;
}

export async function fetchPurchases(sinceMs: number): Promise<PurchaseRecord[]> {
  const client = makeClient();
  if (!client) return [];
  const raw = await client.lrange(PURCHASES_LIST, 0, MAX_PURCHASES - 1);
  const out: PurchaseRecord[] = [];
  for (const item of raw) {
    try {
      const p = (typeof item === 'string' ? JSON.parse(item) : item) as PurchaseRecord;
      if (p && typeof p.ts === 'number' && p.ts >= sinceMs) out.push(p);
    } catch {
      // skip
    }
  }
  out.sort((a, b) => a.ts - b.ts);
  return out;
}

export { FREE_DOCUMENT_LIMIT };
