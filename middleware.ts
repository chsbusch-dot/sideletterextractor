import { NextResponse, type NextRequest } from 'next/server';
import { recordLogin, type LoginEvent } from '@/lib/login-log';
import { SESSION_COOKIE, readSession } from '@/lib/session';

const REALM = 'side-letter-extractor';
const ADMIN_USER = process.env.SITE_USER || 'admin';

const PAGE_ROUTES = ['/', '/register', '/calendar', '/mfn', '/review'];

// Reachable without a session: the landing page, the access API, and the cron route.
const PUBLIC_PREFIXES = ['/access', '/api/access', '/api/cron'];

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

function extractIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Optional break-glass basic auth so the owner is never locked out by a misconfigured session. */
function adminAuthed(req: NextRequest): boolean {
  const password = process.env.SITE_PASSWORD;
  if (!password) return false;
  const header = req.headers.get('authorization');
  if (!header || !header.startsWith('Basic ')) return false;
  try {
    const [u, p] = atob(header.slice('Basic '.length)).split(':');
    return u === ADMIN_USER && p === password;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  const authed = Boolean(session) || adminAuthed(req);

  if (!authed) {
    // A stale basic-auth challenge is only useful to the owner; everyone else gets the landing page.
    if (process.env.SITE_PASSWORD && req.headers.get('authorization')) {
      return new NextResponse('Authentication required.', {
        status: 401,
        headers: { 'WWW-Authenticate': `Basic realm="${REALM}"` },
      });
    }
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Access required. Register at /access to get a code.' },
        { status: 401 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = '/access';
    url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  const isRsc = req.headers.get('rsc') !== null || req.nextUrl.search.includes('_rsc');
  if (PAGE_ROUTES.includes(pathname) && !isRsc) {
    const now = Date.now();
    const event: LoginEvent = {
      ts: now,
      iso: new Date(now).toISOString(),
      ip: extractIp(req),
      country: req.headers.get('x-vercel-ip-country') || '',
      region: req.headers.get('x-vercel-ip-country-region') || '',
      city: decodeURIComponent(req.headers.get('x-vercel-ip-city') || ''),
      ua: req.headers.get('user-agent') || '',
      path: pathname,
    };
    await recordLogin(event);
  }

  return NextResponse.next();
}
