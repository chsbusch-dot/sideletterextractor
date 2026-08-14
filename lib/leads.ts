import { Redis } from '@upstash/redis';
import { normalizeEmail } from './session';

export const FREE_DOCUMENT_LIMIT = Number(process.env.FREE_DOCUMENT_LIMIT || 2);

const CODE_TTL_SECONDS = 15 * 60;
const LEADS_LIST = 'sle:leads';
const MAX_LEADS = 10_000;

export type Lead = {
  ts: number;
  iso: string;
  name: string;
  email: string;
  company: string;
  role: string;
  domain: string;
  work_email: boolean;
  ip: string;
  country: string;
  city: string;
  referrer: string;
  verified_at: string | null;
};

export function makeClient(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.STORAGE_REDIS_REST_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.STORAGE_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function isConfigured(): boolean {
  return makeClient() !== null;
}

const codeKey = (email: string) => `sle:code:${normalizeEmail(email)}`;
const leadKey = (email: string) => `sle:lead:${normalizeEmail(email)}`;
const quotaKey = (email: string) => `sle:quota:${normalizeEmail(email)}`;
const attemptKey = (email: string) => `sle:codeattempts:${normalizeEmail(email)}`;

export function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, '0');
}

export async function storeCode(email: string, code: string): Promise<void> {
  const client = makeClient();
  if (!client) throw new Error('Redis is not configured.');
  await client.set(codeKey(email), code, { ex: CODE_TTL_SECONDS });
  await client.del(attemptKey(email));
}

export type CodeCheck = 'ok' | 'invalid' | 'expired' | 'too_many_attempts';

export async function checkCode(email: string, code: string): Promise<CodeCheck> {
  const client = makeClient();
  if (!client) throw new Error('Redis is not configured.');

  const attempts = await client.incr(attemptKey(email));
  if (attempts === 1) await client.expire(attemptKey(email), CODE_TTL_SECONDS);
  if (attempts > 8) return 'too_many_attempts';

  const stored = await client.get<string>(codeKey(email));
  if (stored === null || stored === undefined) return 'expired';
  if (String(stored) !== code.trim()) return 'invalid';

  await client.del(codeKey(email));
  await client.del(attemptKey(email));
  return 'ok';
}

export async function recordLead(lead: Lead): Promise<void> {
  const client = makeClient();
  if (!client) return;
  try {
    await client.set(leadKey(lead.email), JSON.stringify(lead));
    await client.lpush(LEADS_LIST, JSON.stringify(lead));
    await client.ltrim(LEADS_LIST, 0, MAX_LEADS - 1);
  } catch {
    // Lead capture must never break the access path.
  }
}

export async function markVerified(email: string): Promise<void> {
  const client = makeClient();
  if (!client) return;
  try {
    const raw = await client.get<string>(leadKey(email));
    if (!raw) return;
    const lead = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Lead;
    lead.verified_at = new Date().toISOString();
    await client.set(leadKey(email), JSON.stringify(lead));
    await client.lpush(LEADS_LIST, JSON.stringify(lead));
    await client.ltrim(LEADS_LIST, 0, MAX_LEADS - 1);
  } catch {
    // non-fatal
  }
}

export type QuotaState = { used: number; limit: number; remaining: number };

export async function peekQuota(email: string): Promise<QuotaState> {
  const client = makeClient();
  const limit = FREE_DOCUMENT_LIMIT;
  if (!client) return { used: 0, limit, remaining: limit };
  const used = Number((await client.get<number>(quotaKey(email))) || 0);
  return { used, limit, remaining: Math.max(0, limit - used) };
}

/** Atomically consume one document. Returns null when the allowance is exhausted. */
export async function consumeQuota(email: string): Promise<QuotaState | null> {
  const client = makeClient();
  const limit = FREE_DOCUMENT_LIMIT;
  if (!client) return { used: 0, limit, remaining: limit };
  const used = await client.incr(quotaKey(email));
  if (used > limit) {
    await client.decr(quotaKey(email));
    return null;
  }
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export async function fetchLeads(sinceMs: number): Promise<Lead[]> {
  const client = makeClient();
  if (!client) throw new Error('Redis is not configured.');
  const raw = await client.lrange(LEADS_LIST, 0, MAX_LEADS - 1);
  const out: Lead[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    try {
      const lead = (typeof item === 'string' ? JSON.parse(item) : item) as Lead;
      if (!lead || typeof lead.ts !== 'number' || lead.ts < sinceMs) continue;
      const k = `${lead.email}:${lead.ts}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(lead);
    } catch {
      // skip
    }
  }
  out.sort((a, b) => a.ts - b.ts);
  return out;
}
