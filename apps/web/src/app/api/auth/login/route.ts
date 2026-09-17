import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookieOptions, sessionCookieName } from '@/lib/auth/cookies';
import { assertCsrf } from '@/lib/bff/proxy';
import { nestWithKey } from '@/lib/auth/session';
import { loadWebEnv } from '@/lib/env';

export async function POST(request: NextRequest) {
  const csrfError = assertCsrf(request);
  if (csrfError) return csrfError;
  const body = await request.json();
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Identifiants incorrects.' }, { status: 401 });
  }
  const res = await nestWithKey('/internal/auth/login', {
    method: 'POST',
    body: JSON.stringify(parsed.data),
  });
  const data = (await res.json()) as { token?: string; message?: string };
  if (!res.ok || !data.token) {
    return NextResponse.json({ message: 'Identifiants incorrects.' }, { status: 401 });
  }
  const env = loadWebEnv();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    sessionCookieName(),
    data.token,
    cookieOptions(env.SESSION_TTL_DAYS * 24 * 60 * 60),
  );
  return response;
}
