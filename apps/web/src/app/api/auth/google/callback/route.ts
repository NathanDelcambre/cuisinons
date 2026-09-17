import { NextRequest, NextResponse } from 'next/server';
import { Google } from 'arctic';
import { cookieOptions, sessionCookieName } from '@/lib/auth/cookies';
import { nestWithKey } from '@/lib/auth/session';
import { loadWebEnv } from '@/lib/env';

export async function GET(request: NextRequest) {
  const env = loadWebEnv();
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const savedState = request.cookies.get('cuisinons_oauth_state')?.value;
  const verifier = request.cookies.get('cuisinons_oauth_verifier')?.value;
  const fail = () => NextResponse.redirect(new URL('/login?error=1', env.NEXT_PUBLIC_APP_URL));
  if (!code || !state || !savedState || !verifier || state !== savedState) {
    return fail();
  }
  const google = new Google(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
  );
  try {
    const tokens = await google.validateAuthorizationCode(code, verifier);
    const accessToken = tokens.accessToken();
    const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) return fail();
    const profile = (await userRes.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
    };
    if (!profile.email || !profile.sub) return fail();
    const login = await nestWithKey('/internal/auth/google', {
      method: 'POST',
      body: JSON.stringify({
        email: profile.email,
        emailVerified: Boolean(profile.email_verified),
        googleSub: profile.sub,
      }),
    });
    const data = (await login.json()) as { token?: string };
    if (!login.ok || !data.token) return fail();
    const response = NextResponse.redirect(new URL('/planning', env.NEXT_PUBLIC_APP_URL));
    response.cookies.set(
      sessionCookieName(),
      data.token,
      cookieOptions(env.SESSION_TTL_DAYS * 24 * 60 * 60),
    );
    response.cookies.set('cuisinons_oauth_state', '', { ...cookieOptions(0), maxAge: 0 });
    response.cookies.set('cuisinons_oauth_verifier', '', { ...cookieOptions(0), maxAge: 0 });
    return response;
  } catch {
    return fail();
  }
}
