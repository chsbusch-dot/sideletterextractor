import { NextResponse, type NextRequest } from 'next/server';
import { recordLogin, type LoginEvent } from '@/lib/login-log';

const REALM = 'side-letter-extractor';
const USER = 'catalant';

const PAGE_ROUTES = ['/', '/register', '/calendar', '/mfn', '/review'];

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/cron).*)'],
};

function extractIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

function isPageRoute(pathname: string): boolean {
  return PAGE_ROUTES.includes(pathname);
}

export async function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();

  const header = req.headers.get('authorization');
  let authed = false;
  if (header && header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice('Basic '.length));
      const [u, p] = decoded.split(':');
      if (u === USER && p === password) authed = true;
    } catch {
      // fall through to challenge
    }
  }

  if (!authed) {
    return new NextResponse('Authentication required.', {
      status: 401,
      headers: { 'WWW-Authenticate': `Basic realm="${REALM}"` },
    });
  }

  const pathname = req.nextUrl.pathname;
  const isRsc = req.headers.get('rsc') !== null || req.nextUrl.search.includes('_rsc');
  if (isPageRoute(pathname) && !isRsc) {
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
    // Fire-and-forget; never block the response on logging.
    recordLogin(event).catch(() => {});
  }

  return NextResponse.next();
}
