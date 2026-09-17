import { NextResponse } from 'next/server';
import { avatarUrlForEmail } from '@cuisinons/shared';
import { resolveSession } from '@/lib/auth/session';

export async function GET() {
  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      displayName: session.displayName,
      avatarUrl: session.avatarUrl ?? avatarUrlForEmail(session.email),
    },
  });
}
