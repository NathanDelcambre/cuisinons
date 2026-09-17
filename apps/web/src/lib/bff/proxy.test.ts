import { describe, expect, it } from 'vitest';
import { relay } from './proxy';

describe('relais des reponses Nest', () => {
  it('ne recopie pas les en-tetes de transport', async () => {
    const upstream = new Response('{"ok":true}', {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        // Ce que Vercel renvoie sur une reponse compressee : `fetch` a decompresse
        // le corps, garder ces en-tetes casse le decodage cote navigateur.
        'content-encoding': 'gzip',
        'content-length': '512',
        etag: 'W/"abc"',
      },
    });

    const response = relay(upstream);

    expect(response.headers.get('content-encoding')).toBeNull();
    expect(response.headers.get('content-length')).toBeNull();
    expect(response.headers.get('etag')).toBeNull();
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ ok: true });
  });

  it('conserve le statut et suppose du JSON sans type de contenu', () => {
    const response = relay(new Response(null, { status: 404 }));
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toBe('application/json');
  });
});
