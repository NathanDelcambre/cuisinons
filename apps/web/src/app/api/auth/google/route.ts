import { NextRequest, NextResponse } from 'next/server';
import { Google, generateCodeVerifier, generateState } from 'arctic';
import { loadWebEnv } from '@/lib/env';
import { cookieOptions } from '@/lib/auth/cookies';
import { canonicalAppOrigin } from '@/lib/auth/csrf';

function googleClient(origin: string) {
  const env = loadWebEnv();
  return new Google(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${origin}/api/auth/google/callback`,
  );
}

export async function GET(request: NextRequest) {
  try {
    const env = loadWebEnv();
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json({ message: 'Google OAuth n’est pas configuré.' }, { status: 501 });
    }
    const origin = canonicalAppOrigin(request.nextUrl.origin);
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const url = googleClient(origin).createAuthorizationURL(state, codeVerifier, [
      'openid',
      'email',
      'profile',
    ]);
    const response = NextResponse.redirect(url);
    const short = cookieOptions(10 * 60);
    response.cookies.set('cuisinons_oauth_state', state, short);
    response.cookies.set('cuisinons_oauth_verifier', codeVerifier, short);
    return response;
  } catch (error) {
    console.error('google oauth start failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ message: 'Impossible de démarrer Google OAuth.' }, { status: 500 });
  }
}
