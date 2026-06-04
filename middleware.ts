import { NextResponse, type NextRequest } from 'next/server';

const REALM = 'side-letter-extractor';
const USER = 'catalant';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

export function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();

  const header = req.headers.get('authorization');
  if (header && header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice('Basic '.length));
      const [u, p] = decoded.split(':');
      if (u === USER && p === password) return NextResponse.next();
    } catch {
      // fall through to challenge
    }
  }

  return new NextResponse('Authentication required.', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${REALM}"` },
  });
}
