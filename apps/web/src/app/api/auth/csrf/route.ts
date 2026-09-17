import { NextResponse } from 'next/server';
import { cookieOptions, csrfCookieName } from '@/lib/auth/cookies';
import { createCsrfToken, csrfCookieValue } from '@/lib/auth/csrf';
import { loadWebEnv } from '@/lib/env';

export async function GET() {
  const token = createCsrfToken();
  const env = loadWebEnv();
  const response = NextResponse.json({ csrfToken: token });
  response.cookies.set(
    csrfCookieName(),
    csrfCookieValue(token),
    cookieOptions(env.SESSION_TTL_DAYS * 24 * 60 * 60),
  );
  return response;
}
