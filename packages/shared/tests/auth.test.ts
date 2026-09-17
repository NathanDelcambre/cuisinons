import { describe, expect, it } from 'vitest';
import { isAuthorizedEmail, normalizeEmail } from '../src/auth/emails';
import { validatePassword } from '../src/auth/password';

describe('email whitelist', () => {
  it('autorise Nathan et Jade', () => {
    expect(isAuthorizedEmail('nathan.delcambre@gmail.com')).toBe(true);
    expect(isAuthorizedEmail('jade.peroch@gmail.com')).toBe(true);
    expect(isAuthorizedEmail('  Nathan.Delcambre@gmail.com  ')).toBe(true);
  });

  it('refuse un troisième e-mail', () => {
    expect(isAuthorizedEmail('intrus@gmail.com')).toBe(false);
    expect(isAuthorizedEmail('nathan.delcambre+tag@gmail.com')).toBe(false);
  });

  it('normalise en minuscules', () => {
    expect(normalizeEmail('Jade.Peroch@Gmail.com')).toBe('jade.peroch@gmail.com');
  });
});

describe('password policy', () => {
  it('accepte un mot de passe fort', () => {
    expect(validatePassword('CuisineMaison42!').ok).toBe(true);
  });

  it('refuse un mot de passe faible', () => {
    expect(validatePassword('azerty').ok).toBe(false);
    expect(validatePassword('password123').ok).toBe(false);
    expect(validatePassword('abcdefghij').ok).toBe(false);
  });
});
