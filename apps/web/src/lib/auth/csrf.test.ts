import { describe, expect, it } from 'vitest';
import { originAllowed } from './csrf';

describe('origin csrf', () => {
  it('refuse une origine tierce', () => {
    process.env.AUTH_SECRET = 'x'.repeat(32);
    process.env.INTERNAL_API_SECRET = 'y'.repeat(32);
    process.env.API_BASE_URL = 'http://localhost:3601';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3600';
    expect(originAllowed('https://evil.test', null)).toBe(false);
    expect(originAllowed('http://localhost:3600', null)).toBe(true);
  });
});
