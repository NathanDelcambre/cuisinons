import { NextRequest, NextResponse } from 'next/server';
import { cookieOptions, readSessionToken, sessionCookieName } from '@/lib/auth/cookies';
import { assertCsrf } from '@/lib/bff/proxy';
import { nestWithKey } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const csrfError = assertCsrf(request);
  if (csrfError) return csrfError;
  const token = await readSessionToken();
  if (token) {
    await nestWithKey('/internal/auth/session/revoke', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName(), '', { ...cookieOptions(0), maxAge: 0 });
  return response;
}
