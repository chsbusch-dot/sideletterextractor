import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  generateCode,
  isConfigured,
  recordLead,
  storeCode,
  type Lead,
} from '@/lib/leads';
import {
  deliveryEmail,
  emailDomain,
  isPlausibleEmail,
  isWorkEmail,
  normalizeEmail,
} from '@/lib/session';
import { rateLimit, requestIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'Access requests are not configured on this deployment.' },
      { status: 503 }
    );
  }

  let body: { name?: string; email?: string; company?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  const company = (body.company || '').trim();
  const role = (body.role || '').trim();
  const email = normalizeEmail(body.email || '');
  const to = deliveryEmail(body.email || '');

  const clientIp = requestIp(req);
  const ipOk = await rateLimit('access-req-ip', clientIp, 5, 15 * 60);
  const emailOk = await rateLimit('access-req-email', email, 3, 15 * 60);
  if (!ipOk || !emailOk) {
    return NextResponse.json(
      { error: 'Too many code requests. Wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  if (name.length < 2) {
    return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
  }
  if (!isPlausibleEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (company.length < 2) {
    return NextResponse.json({ error: 'Please enter your company.' }, { status: 400 });
  }

  const code = generateCode();
  try {
    await storeCode(email, code);
  } catch {
    return NextResponse.json({ error: 'Could not start verification. Try again.' }, { status: 503 });
  }

  const lead: Lead = {
    ts: Date.now(),
    iso: new Date().toISOString(),
    name,
    email,
    company,
    role,
    domain: emailDomain(email),
    work_email: isWorkEmail(email),
    ip: clientIp,
    country: req.headers.get('x-vercel-ip-country') || '',
    city: decodeURIComponent(req.headers.get('x-vercel-ip-city') || ''),
    referrer: req.headers.get('referer') || '',
    verified_at: null,
  };
  await recordLead(lead);

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json(
      { error: 'Email delivery is not configured on this deployment.' },
      { status: 503 }
    );
  }

  const from =
    process.env.ACCESS_EMAIL_FROM ||
    process.env.LOGIN_DIGEST_FROM ||
    'Side Letter Extractor <onboarding@resend.dev>';

  try {
    const resend = new Resend(resendKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `Your access code: ${code}`,
      text: [
        `Your access code for the Side Letter Obligation Extractor is:`,
        ``,
        `    ${code}`,
        ``,
        `The code expires in 15 minutes.`,
        ``,
        `If you did not request this, you can ignore this email.`,
      ].join('\n'),
    });
    if (error) {
      return NextResponse.json(
        { error: 'Could not send the code. Check the address and try again.' },
        { status: 502 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Could not send the code. Check the address and try again.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, email: to });
}
