import { NextResponse } from 'next/server';
import { getBalance } from '@/lib/billing';
import { sessionFromRequest } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No session.' }, { status: 401 });
  }
  const balance = await getBalance(session.email);
  return NextResponse.json({ email: session.email, balance });
}
