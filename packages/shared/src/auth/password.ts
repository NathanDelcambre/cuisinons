import { z } from 'zod';

const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  'password',
  'password1',
  'password123',
  'p@ssw0rd',
  '12345678',
  '123456789',
  'qwerty',
  'qwerty123',
  'azerty',
  'azerty123',
  'abc123',
  'abcd1234',
  'admin',
  'admin123',
  'welcome',
  'welcome1',
  'letmein',
  'changeme',
  'passw0rd',
  'cuisinons',
  'cuisinons1',
  'cuisinons123',
  'nathan123',
  'jade1234',
]);

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export function looksLikeKeyboardPattern(value: string): boolean {
  const v = value.toLowerCase();
  if (/(.)\1{3,}/.test(v)) {
    return true;
  }
  const sequentialRows = [
    '1234567890',
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
    'azertyuiop',
    'qsdfghjklm',
    'wxcvbn',
  ];
  for (const row of sequentialRows) {
    for (let i = 0; i + 4 <= row.length; i++) {
      const window = row.slice(i, i + 4);
      if (v.includes(window)) {
        return true;
      }
    }
  }
  for (let i = 0; i + 4 <= v.length; i++) {
    const a = v.charCodeAt(i);
    const b = v.charCodeAt(i + 1);
    const c = v.charCodeAt(i + 2);
    const d = v.charCodeAt(i + 3);
    if (b === a + 1 && c === b + 1 && d === c + 1) {
      return true;
    }
    if (b === a - 1 && c === b - 1 && d === c - 1) {
      return true;
    }
  }
  return false;
}

export function hasLetterAndDigit(value: string): boolean {
  return /[a-zA-Z]/.test(value) && /\d/.test(value);
}

export function isCommonPassword(value: string): boolean {
  return COMMON_PASSWORDS.has(value.toLowerCase());
}

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Le mot de passe doit contenir au moins ${String(PASSWORD_MIN_LENGTH)} caractères.`)
  .max(PASSWORD_MAX_LENGTH, 'Le mot de passe est trop long.')
  .refine((v) => v === v.trim(), 'Le mot de passe ne doit pas commencer ou finir par un espace.')
  .refine(hasLetterAndDigit, 'Le mot de passe doit contenir au moins une lettre et un chiffre.')
  .refine((v) => !isCommonPassword(v), 'Ce mot de passe est trop courant.')
  .refine(
    (v) => !looksLikeKeyboardPattern(v),
    'Le mot de passe contient une séquence trop évidente.',
  );

export function validatePassword(password: string): { ok: true } | { ok: false; message: string } {
  const parsed = passwordSchema.safeParse(password);
  if (parsed.success) {
    return { ok: true };
  }
  return { ok: false, message: parsed.error.issues[0]?.message ?? 'Mot de passe invalide.' };
}
