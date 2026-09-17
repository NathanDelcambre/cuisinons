import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { loadWebEnv } from '../env';

export function createCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}

export function signCsrf(token: string): string {
  const env = loadWebEnv();
  return createHmac('sha256', env.AUTH_SECRET).update(token).digest('base64url');
}

export function csrfCookieValue(token: string): string {
  return `${token}.${signCsrf(token)}`;
}

export function parseCsrfCookie(value: string | undefined): string | null {
  if (!value || !value.includes('.')) return null;
  const [token, sig] = value.split('.');
  if (!token || !sig) return null;
  const expected = signCsrf(token);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return token;
}

export function originAllowed(origin: string | null, referer: string | null): boolean {
  const env = loadWebEnv();
  const allowed = new URL(env.NEXT_PUBLIC_APP_URL).origin;
  if (origin) return origin === allowed;
  if (referer) {
    try {
      return new URL(referer).origin === allowed;
    } catch {
      return false;
    }
  }
  return false;
}
