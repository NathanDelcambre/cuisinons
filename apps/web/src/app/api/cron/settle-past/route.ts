import { nestWithKey } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Appelé par Vercel Cron une fois par jour. Déduit les repas des jours
 * passés pour Nathan et Jade, sans ouvrir l’app. Idempotent.
 */
export async function GET() {
  const upstream = await nestWithKey('/internal/provisions/settle-past', { method: 'POST' });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-store',
    },
  });
}
