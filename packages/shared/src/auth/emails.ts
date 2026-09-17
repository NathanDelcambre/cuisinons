export const AUTHORIZED_EMAILS = [
  'nathan.delcambre@gmail.com',
  'jade.peroch@gmail.com',
] as const;

export type AuthorizedEmail = (typeof AUTHORIZED_EMAILS)[number];

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAuthorizedEmail(email: string): email is AuthorizedEmail {
  const normalized = normalizeEmail(email);
  return (AUTHORIZED_EMAILS as readonly string[]).includes(normalized);
}

export function displayNameForEmail(email: string): string {
  const normalized = normalizeEmail(email);
  if (normalized === 'nathan.delcambre@gmail.com') {
    return 'Nathan';
  }
  if (normalized === 'jade.peroch@gmail.com') {
    return 'Jade';
  }
  return 'Invité';
}
