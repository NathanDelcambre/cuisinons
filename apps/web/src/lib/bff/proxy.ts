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

/**
 * Ne jamais relayer les en-tetes de transport de la reponse Nest. `fetch` a
 * deja decompresse le corps, mais laisse `content-encoding: gzip` dans les
 * en-tetes : le navigateur tenterait alors de degzipper du JSON clair et
 * echouerait en `ERR_CONTENT_DECODING_FAILED` — seulement sur les reponses
 * assez grosses pour que Vercel les compresse, ce qui rend le bug intermittent.
 * `content-length` ne correspondrait plus non plus.
 */
export function relay(upstream: Response): Response {
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      // Reponses personnelles : aucun cache intermediaire.
      'cache-control': 'no-store',
    },
  });
}

export async function proxyToNest(request: NextRequest, path: string): Promise<Response> {
  const csrfError = assertCsrf(request);
  if (csrfError) return csrfError;
  const body =
    request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();
  const search = request.nextUrl.search;
  const upstream = await nestFetch(`${path}${search}`, {
    method: request.method,
    body,
  });
  return relay(upstream);
}
