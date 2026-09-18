import { NextRequest, NextResponse } from 'next/server';
import { Google } from 'arctic';
import { cookieOptions, sessionCookieName } from '@/lib/auth/cookies';
import { nestWithKey } from '@/lib/auth/session';
import { loadWebEnv } from '@/lib/env';
import { canonicalAppOrigin } from '@/lib/auth/csrf';

export async function GET(request: NextRequest) {
  const env = loadWebEnv();
  const origin = canonicalAppOrigin(request.nextUrl.origin);
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const savedState = request.cookies.get('cuisinons_oauth_state')?.value;
  const verifier = request.cookies.get('cuisinons_oauth_verifier')?.value;
  // La cause reste dans les logs serveur : l'utilisateur ne voit qu'une erreur generique.
  const fail = (reason: string, detail?: unknown) => {
    console.error('google callback rejete', reason, detail ?? '');
    return NextResponse.redirect(new URL('/connexion?error=1', origin));
  };
  if (!code || !state || !savedState || !verifier || state !== savedState) {
    return fail('etat oauth invalide', {
      code: Boolean(code),
      state: Boolean(state),
      cookieState: Boolean(savedState),
      verifier: Boolean(verifier),
      concordance: state === savedState,
    });
  }
  const google = new Google(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${origin}/api/auth/google/callback`,
  );
  try {
    const tokens = await google.validateAuthorizationCode(code, verifier);
    const accessToken = tokens.accessToken();
    const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) return fail('userinfo google en echec', userRes.status);
    const profile = (await userRes.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
    };
    if (!profile.email || !profile.sub) {
      return fail('profil google incomplet', { email: profile.email, sub: Boolean(profile.sub) });
    }
    const login = await nestWithKey('/internal/auth/google', {
      method: 'POST',
      body: JSON.stringify({
        email: profile.email,
        emailVerified: Boolean(profile.email_verified),
        googleSub: profile.sub,
      }),
    });
    const body = await login.text();
    if (!login.ok) {
      return fail('api interne refuse', {
        status: login.status,
        body: body.slice(0, 200),
        email: profile.email,
        emailVerifie: Boolean(profile.email_verified),
      });
    }
    const data = JSON.parse(body) as { token?: string };
    if (!data.token) return fail('api interne sans jeton', body.slice(0, 200));
    const response = NextResponse.redirect(new URL('/planning', origin));
    response.cookies.set(
      sessionCookieName(),
      data.token,
      cookieOptions(env.SESSION_TTL_DAYS * 24 * 60 * 60),
    );
    response.cookies.set('cuisinons_oauth_state', '', { ...cookieOptions(0), maxAge: 0 });
    response.cookies.set('cuisinons_oauth_verifier', '', { ...cookieOptions(0), maxAge: 0 });
    return response;
  } catch (error) {
    return fail('exception', error instanceof Error ? error.message : error);
  }
}
