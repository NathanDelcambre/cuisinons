import { NextRequest, NextResponse } from 'next/server';
import { originAllowed, parseCsrfCookie } from '../auth/csrf';
import { csrfCookieName } from '../auth/cookies';
import { nestFetch } from '../auth/session';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export function assertCsrf(request: NextRequest): NextResponse | null {
  if (SAFE.has(request.method)) return null;
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  if (!originAllowed(origin, referer)) {
    return NextResponse.json({ message: 'Origine non autorisée.' }, { status: 403 });
  }
  const cookieToken = parseCsrfCookie(request.cookies.get(csrfCookieName())?.value);
  const headerToken = request.headers.get('x-csrf-token');
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return NextResponse.json({ message: 'Jeton CSRF invalide.' }, { status: 403 });
  }
  return null;
}

export async function proxyToNest(request: NextRequest, path: string): Promise<Response> {
  const csrfError = assertCsrf(request);
  if (csrfError) return csrfError;
  const body =
    request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();
  const search = request.nextUrl.search;
  return nestFetch(`${path}${search}`, {
    method: request.method,
    body,
  });
}
