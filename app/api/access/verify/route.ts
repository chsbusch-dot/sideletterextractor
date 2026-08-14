import { NextResponse } from 'next/server';
import { checkCode, markVerified, peekQuota } from '@/lib/leads';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  normalizeEmail,
  signSession,
} from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: { email?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = normalizeEmail(body.email || '');
  const code = (body.code || '').trim();
  if (!email || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Enter the 6-digit code from the email.' }, { status: 400 });
  }

  let result;
  try {
    result = await checkCode(email, code);
  } catch {
    return NextResponse.json({ error: 'Verification is unavailable right now.' }, { status: 503 });
  }

  if (result === 'too_many_attempts') {
    return NextResponse.json(
      { error: 'Too many attempts. Request a new code.' },
      { status: 429 }
    );
  }
  if (result === 'expired') {
    return NextResponse.json(
      { error: 'That code has expired. Request a new one.' },
      { status: 400 }
    );
  }
  if (result === 'invalid') {
    return NextResponse.json({ error: 'That code is not right.' }, { status: 400 });
  }

  const token = await signSession(email);
  if (!token) {
    return NextResponse.json(
      { error: 'Sessions are not configured on this deployment.' },
      { status: 503 }
    );
  }

  await markVerified(email);
  const quota = await peekQuota(email);

  const res = NextResponse.json({ ok: true, quota });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
