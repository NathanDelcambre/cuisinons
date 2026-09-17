import { describe, expect, it } from 'vitest';
import { isAuthorizedEmail } from '@cuisinons/shared';

describe('autorisation e-mail API', () => {
  it('refuse un troisième compte', () => {
    expect(isAuthorizedEmail('hacker@gmail.com')).toBe(false);
    expect(isAuthorizedEmail('nathan.delcambre@gmail.com')).toBe(true);
    expect(isAuthorizedEmail('jade.peroch@gmail.com')).toBe(true);
  });
});
