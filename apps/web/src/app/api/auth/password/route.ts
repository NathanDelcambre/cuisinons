import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertCsrf } from '@/lib/bff/proxy';
import { nestFetch } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const csrfError = assertCsrf(request);
  if (csrfError) return csrfError;
  const parsed = z
    .object({ currentPassword: z.string().min(1), nextPassword: z.string().min(1) })
    .safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: 'Requête invalide.' }, { status: 400 });
  }
  const res = await nestFetch('/internal/auth/password', {
    method: 'POST',
    body: JSON.stringify(parsed.data),
  });
  return new NextResponse(await res.text(), { status: res.status });
}
