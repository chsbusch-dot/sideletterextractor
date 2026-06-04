import { Redis } from '@upstash/redis';

export type LoginEvent = {
  ts: number;
  iso: string;
  ip: string;
  country: string;
  region: string;
  city: string;
  ua: string;
  path: string;
};

const LIST_KEY = 'sle:logins';
const MAX_ENTRIES = 5000;

function makeClient(): Redis | null {
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

export async function recordLogin(event: LoginEvent): Promise<void> {
  const client = makeClient();
  if (!client) return;
  try {
    await client.lpush(LIST_KEY, JSON.stringify(event));
    await client.ltrim(LIST_KEY, 0, MAX_ENTRIES - 1);
  } catch {
    // Logging must never break the auth path.
  }
}

export async function fetchLogins(sinceMs: number): Promise<LoginEvent[]> {
  const client = makeClient();
  if (!client) throw new Error('Redis is not configured.');
  const raw = await client.lrange(LIST_KEY, 0, MAX_ENTRIES - 1);
  const parsed: LoginEvent[] = [];
  for (const item of raw) {
    try {
      const obj = typeof item === 'string' ? JSON.parse(item) : (item as LoginEvent);
      if (obj && typeof obj.ts === 'number' && obj.ts >= sinceMs) parsed.push(obj);
    } catch {
      // skip
    }
  }
  parsed.sort((a, b) => a.ts - b.ts);
  return parsed;
}
