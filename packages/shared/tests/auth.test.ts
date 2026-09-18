import { describe, expect, it } from 'vitest';
import {
  avatarUrlForEmail,
  isAuthorizedEmail,
  normalizeEmail,
  resolveAuthorizedEmail,
} from '../src/auth/emails.js';
import { validatePassword } from '../src/auth/password.js';

describe('email whitelist', () => {
  it('autorise Nathan et Jade', () => {
    expect(isAuthorizedEmail('nathan.delcambre@gmail.com')).toBe(true);
    expect(isAuthorizedEmail('jade.peroch@gmail.com')).toBe(true);
    expect(isAuthorizedEmail('  Nathan.Delcambre@gmail.com  ')).toBe(true);
  });

  it('ignore les points, que Gmail ne distingue pas', () => {
    expect(isAuthorizedEmail('nathandelcambre@gmail.com')).toBe(true);
    expect(isAuthorizedEmail('n.a.t.h.a.n.delcambre@gmail.com')).toBe(true);
    expect(isAuthorizedEmail('jadeperoch@googlemail.com')).toBe(true);
  });

  it('ramène toujours à l’orthographe de référence', () => {
    expect(resolveAuthorizedEmail('NathanDelcambre@Gmail.com')).toBe('nathan.delcambre@gmail.com');
    expect(resolveAuthorizedEmail('jadeperoch@googlemail.com')).toBe('jade.peroch@gmail.com');
    expect(resolveAuthorizedEmail('intrus@gmail.com')).toBeNull();
  });

  it('refuse un troisième e-mail', () => {
    expect(isAuthorizedEmail('intrus@gmail.com')).toBe(false);
    expect(isAuthorizedEmail('nathan.delcambre+tag@gmail.com')).toBe(false);
    expect(isAuthorizedEmail('nathan.delcambre@autre.com')).toBe(false);
  });

  it('normalise en minuscules', () => {
    expect(normalizeEmail('Jade.Peroch@Gmail.com')).toBe('jade.peroch@gmail.com');
  });

  it('associe une photo de profil à Nathan et Jade', () => {
    expect(avatarUrlForEmail('nathan.delcambre@gmail.com')).toBe('/avatars/nathan.jpg');
    expect(avatarUrlForEmail('nathandelcambre@gmail.com')).toBe('/avatars/nathan.jpg');
    expect(avatarUrlForEmail('jade.peroch@gmail.com')).toBe('/avatars/jade.jpg?v=4');
    expect(avatarUrlForEmail('jadeperoch@googlemail.com')).toBe('/avatars/jade.jpg?v=4');
    expect(avatarUrlForEmail('intrus@gmail.com')).toBeNull();
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
