import { loadWebEnv } from '../env';
import { mintInternalJwt } from './internal-jwt';
import { readSessionToken } from './cookies';

export async function resolveSession(): Promise<{
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
} | null> {
  const token = await readSessionToken();
  if (!token) return null;
  const env = loadWebEnv();
  const res = await fetch(`${env.API_BASE_URL}/internal/auth/session/resolve`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-key': env.INTERNAL_API_SECRET,
    },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) return null;
  return (await res.json()) as {
    userId: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export async function nestFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const session = await resolveSession();
  if (!session) {
    return new Response(JSON.stringify({ message: 'Non authentifié.' }), { status: 401 });
  }
  const jwt = await mintInternalJwt({ userId: session.userId, email: session.email });
  const env = loadWebEnv();
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${jwt}`);
  headers.set('content-type', headers.get('content-type') ?? 'application/json');
  return fetch(`${env.API_BASE_URL}${path}`, { ...init, headers });
}

export async function nestWithKey(path: string, init: RequestInit = {}): Promise<Response> {
  const env = loadWebEnv();
  const headers = new Headers(init.headers);
  headers.set('x-internal-key', env.INTERNAL_API_SECRET);
  headers.set('content-type', headers.get('content-type') ?? 'application/json');
  return fetch(`${env.API_BASE_URL}${path}`, { ...init, headers });
}
