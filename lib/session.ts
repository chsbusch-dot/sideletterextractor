// Signed, self-contained session cookie.
// Uses Web Crypto so the same code runs in the Edge middleware and in Node route handlers.

export const SESSION_COOKIE = 'sle_access';
const SESSION_DAYS = 30;

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function secret(): string | null {
  return process.env.SESSION_SECRET || process.env.ANTHROPIC_API_KEY || null;
}

async function hmac(payload: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(payload));
  return b64urlEncode(new Uint8Array(sig));
}

export type Session = { email: string; exp: number };

export async function signSession(email: string): Promise<string | null> {
  const key = secret();
  if (!key) return null;
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify({ email, exp })));
  const sig = await hmac(payload, key);
  return `${payload}.${sig}`;
}

export async function readSession(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  const key = secret();
  if (!key) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = await hmac(payload, key);
  // Constant-time-ish compare.
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;

  try {
    const obj = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as Session;
    if (!obj || typeof obj.email !== 'string' || typeof obj.exp !== 'number') return null;
    if (Date.now() > obj.exp) return null;
    return obj;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

export function cookieValue(req: Request, name: string): string | undefined {
  const raw = req.headers.get('cookie');
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}

export async function sessionFromRequest(req: Request): Promise<Session | null> {
  return readSession(cookieValue(req, SESSION_COOKIE));
}

/**
 * Canonical form used as the storage key for codes, leads, quotas, and credits.
 * Strips plus-suffixes everywhere and dots in the local part for Gmail, so
 * alias variants of one mailbox share one free allowance. Delivery should use
 * the address as the user typed it (trimmed/lowercased), not this.
 */
export function normalizeEmail(raw: string): string {
  const s = raw.trim().toLowerCase();
  const at = s.lastIndexOf('@');
  if (at < 0) return s;
  let local = s.slice(0, at);
  const domain = s.slice(at + 1);
  const plus = local.indexOf('+');
  if (plus >= 0) local = local.slice(0, plus);
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.replace(/\./g, '');
  }
  return `${local}@${domain}`;
}

/** The deliverable form of an address: cleaned up, but aliases left intact. */
export function deliveryEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

const FREE_MAIL = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'live.com', 'aol.com', 'icloud.com', 'me.com', 'proton.me', 'protonmail.com', 'gmx.com',
]);

export function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at < 0 ? '' : email.slice(at + 1);
}

export function isWorkEmail(email: string): boolean {
  return !FREE_MAIL.has(emailDomain(email));
}

export function isPlausibleEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(email);
}
