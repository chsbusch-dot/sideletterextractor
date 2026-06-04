import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { fetchLogins, type LoginEvent } from '@/lib/login-log';

export const runtime = 'nodejs';
export const maxDuration = 60;

const WINDOW_MS = 24 * 60 * 60 * 1000;

function fmtPacific(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function geo(e: LoginEvent): string {
  const parts = [e.city, e.region, e.country].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function uaShort(ua: string): string {
  const m = ua.match(/(Chrome|Safari|Firefox|Edg|Opera)\/[\d.]+/);
  const platform = ua.match(/\((Macintosh|Windows|iPhone|iPad|Linux|Android)[^)]*\)/);
  return [platform?.[1] || '', m?.[1] || ''].filter(Boolean).join(' / ') || ua.slice(0, 60);
}

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get('authorization');
  if (!header) return false;
  return header === `Bearer ${secret}`;
}

function buildHtml(events: LoginEvent[], to: string): string {
  if (events.length === 0) {
    return `<p>No sign-ins in the last 24 hours on Side Letter Obligation Extractor.</p>`;
  }

  const bySession = new Map<string, LoginEvent[]>();
  for (const e of events) {
    const sessionKey = `${e.ip}::${uaShort(e.ua)}`;
    if (!bySession.has(sessionKey)) bySession.set(sessionKey, []);
    bySession.get(sessionKey)!.push(e);
  }

  const sessions = [...bySession.entries()].sort(
    (a, b) => b[1][b[1].length - 1].ts - a[1][a[1].length - 1].ts
  );

  const sessionRows = sessions
    .map(([key, ev]) => {
      const first = ev[0];
      const last = ev[ev.length - 1];
      const pages = [...new Set(ev.map((e) => e.path))].join(' · ');
      return `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top">
            <div style="font-weight:600">${escapeHtml(geo(first))}</div>
            <div style="font-family:ui-monospace,monospace;font-size:12px;color:#475569">${escapeHtml(first.ip)}</div>
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top">
            <div>${escapeHtml(fmtPacific(first.iso))} <span style="color:#94a3b8">→</span> ${escapeHtml(fmtPacific(last.iso))}</div>
            <div style="font-size:12px;color:#475569">${ev.length} request${ev.length === 1 ? '' : 's'}</div>
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top">
            <div style="font-size:12px;font-family:ui-monospace,monospace;color:#475569">${escapeHtml(pages)}</div>
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top">
            <div style="font-size:12px;color:#475569">${escapeHtml(uaShort(first.ua))}</div>
          </td>
        </tr>
      `;
    })
    .join('');

  const uniqueIps = new Set(events.map((e) => e.ip)).size;

  return `
    <div style="font-family:-apple-system,Segoe UI,sans-serif;color:#0b1320;max-width:760px">
      <h2 style="margin:0 0 4px 0">Sign-ins · last 24 hours</h2>
      <p style="margin:0 0 16px 0;color:#475569">
        ${events.length} request${events.length === 1 ? '' : 's'} from ${sessions.length} session${sessions.length === 1 ? '' : 's'} · ${uniqueIps} unique IP${uniqueIps === 1 ? '' : 's'}
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f8fafc;text-align:left">
            <th style="padding:8px 10px;border-bottom:1px solid #cbd5e1">Where</th>
            <th style="padding:8px 10px;border-bottom:1px solid #cbd5e1">When (PT)</th>
            <th style="padding:8px 10px;border-bottom:1px solid #cbd5e1">Pages</th>
            <th style="padding:8px 10px;border-bottom:1px solid #cbd5e1">Client</th>
          </tr>
        </thead>
        <tbody>${sessionRows}</tbody>
      </table>
      <p style="margin-top:24px;font-size:12px;color:#94a3b8">
        Delivered to ${escapeHtml(to)} · Side Letter Obligation Extractor.
      </p>
    </div>
  `;
}

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const to = process.env.LOGIN_DIGEST_TO;
  const from = process.env.LOGIN_DIGEST_FROM || 'Side Letter Extractor <onboarding@resend.dev>';
  const resendKey = process.env.RESEND_API_KEY;

  if (!to) {
    return NextResponse.json(
      { error: 'LOGIN_DIGEST_TO not set.' },
      { status: 500 }
    );
  }
  if (!resendKey) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY not set.' },
      { status: 500 }
    );
  }

  let events: LoginEvent[];
  try {
    events = await fetchLogins(Date.now() - WINDOW_MS);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to read login log.' },
      { status: 500 }
    );
  }

  const html = buildHtml(events, to);
  const subject =
    events.length === 0
      ? 'Side Letter Extractor — no sign-ins today'
      : `Side Letter Extractor — ${events.length} request${events.length === 1 ? '' : 's'} (${
          new Set(events.map((e) => e.ip)).size
        } IP${new Set(events.map((e) => e.ip)).size === 1 ? '' : 's'})`;

  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Resend send failed.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ sent: true, count: events.length });
}
