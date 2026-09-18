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

function addOrigin(origins: Set<string>, raw: string): void {
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    origins.add(url.origin);
    const host = url.hostname;
    if (host === 'localhost' || host.endsWith('.localhost') || /^[\d.]+$/.test(host)) return;
    const sibling = host.startsWith('www.') ? host.slice(4) : `www.${host}`;
    origins.add(`${url.protocol}//${sibling}`);
  } catch {
    // Valeur d'env malformee : on ignore plutot que de casser le CSRF.
  }
}

/** Apex, www et hote de production Vercel : le cookie __Host- reste par hote, le CSRF doit suivre. */
export function appOrigins(): Set<string> {
  const origins = new Set<string>();
  addOrigin(origins, loadWebEnv().NEXT_PUBLIC_APP_URL);
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) addOrigin(origins, vercelProd);
  return origins;
}

export function canonicalAppOrigin(requestOrigin?: string | null): string {
  const fallback = new URL(loadWebEnv().NEXT_PUBLIC_APP_URL).origin;
  if (requestOrigin && appOrigins().has(requestOrigin)) return requestOrigin;
  return fallback;
}

export function originAllowed(origin: string | null, referer: string | null): boolean {
  const allowed = appOrigins();
  if (origin) return allowed.has(origin);
  if (referer) {
    try {
      return allowed.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }
  return false;
}
