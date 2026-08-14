// Fixed-window rate limiting on Upstash Redis. Fails open when Redis is not
// configured (local dev) so the gate never takes the product down.

import { makeClient } from './leads';

export async function rateLimit(
  bucket: string,
  id: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const client = makeClient();
  if (!client) return true;
  try {
    const window = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `sle:rl:${bucket}:${id}:${window}`;
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, windowSeconds);
    return count <= limit;
  } catch {
    return true;
  }
}

export function requestIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}
