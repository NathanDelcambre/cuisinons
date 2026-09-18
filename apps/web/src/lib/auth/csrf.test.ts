import { describe, expect, it } from 'vitest';
import { originAllowed } from './csrf';

function envFor(appUrl: string) {
  process.env.AUTH_SECRET = 'x'.repeat(32);
  process.env.INTERNAL_API_SECRET = 'y'.repeat(32);
  process.env.API_BASE_URL = 'http://localhost:3601';
  process.env.NEXT_PUBLIC_APP_URL = appUrl;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
}

describe('origin csrf', () => {
  it('refuse une origine tierce', () => {
    envFor('http://localhost:3600');
    expect(originAllowed('https://evil.test', null)).toBe(false);
    expect(originAllowed('http://localhost:3600', null)).toBe(true);
  });

  it('accepte www et l’apex du domaine de l’app', () => {
    envFor('https://cuisinons.dev');
    expect(originAllowed('https://cuisinons.dev', null)).toBe(true);
    expect(originAllowed('https://www.cuisinons.dev', null)).toBe(true);
    expect(originAllowed('https://cuisinons-web.vercel.app', null)).toBe(false);
  });
});
