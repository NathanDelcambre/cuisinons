import { NextRequest } from 'next/server';
import { proxyToNest } from '@/lib/bff/proxy';

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxyToNest(request, `/${path.join('/')}`);
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
