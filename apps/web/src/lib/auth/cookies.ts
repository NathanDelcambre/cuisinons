import { cookies } from 'next/headers';
import { loadWebEnv } from '../env';

export function sessionCookieName(): string {
  const env = loadWebEnv();
  if (env.AUTH_COOKIE_SECURE) {
    return env.AUTH_COOKIE_NAME_SESSION.startsWith('__Host-')
      ? env.AUTH_COOKIE_NAME_SESSION
      : `__Host-${env.AUTH_COOKIE_NAME_SESSION}`;
  }
  return env.AUTH_COOKIE_NAME_SESSION;
}

export function csrfCookieName(): string {
  const env = loadWebEnv();
  if (env.AUTH_COOKIE_SECURE) {
    return env.CSRF_COOKIE_NAME.startsWith('__Host-')
      ? env.CSRF_COOKIE_NAME
      : `__Host-${env.CSRF_COOKIE_NAME}`;
  }
  return env.CSRF_COOKIE_NAME;
}

export function cookieOptions(maxAgeSeconds: number) {
  const env = loadWebEnv();
  const name = sessionCookieName();
  const hostPrefixed = name.startsWith('__Host-');
  return {
    httpOnly: true,
    secure: hostPrefixed ? true : env.AUTH_COOKIE_SECURE,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export async function readSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(sessionCookieName())?.value ?? null;
}
