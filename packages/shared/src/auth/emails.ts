export const AUTHORIZED_EMAILS = [
  'nathan.delcambre@gmail.com',
  'jade.peroch@gmail.com',
] as const;

export type AuthorizedEmail = (typeof AUTHORIZED_EMAILS)[number];

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * Chez Gmail les points du nom local ne distinguent pas deux comptes :
 * nathandelcambre@ et nathan.delcambre@ sont la même boîte, et Google renvoie
 * l'orthographe enregistrée sur le compte, pas celle de notre liste. On compare
 * donc sans les points sur ces domaines. Les suffixes +tag restent refusés :
 * Google ne les renvoie jamais, et les accepter élargirait la liste pour rien.
 */
function mailboxIdentity(email: string): string {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf('@');
  if (at === -1) return normalized;
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  if (!GMAIL_DOMAINS.has(domain)) return normalized;
  return `${local.replaceAll('.', '')}@gmail.com`;
}

/** Orthographe de référence du compte autorisé, ou null s'il ne l'est pas. */
export function resolveAuthorizedEmail(email: string): AuthorizedEmail | null {
  const identity = mailboxIdentity(email);
  return AUTHORIZED_EMAILS.find((known) => mailboxIdentity(known) === identity) ?? null;
}

export function isAuthorizedEmail(email: string): boolean {
  return resolveAuthorizedEmail(email) !== null;
}

export function displayNameForEmail(email: string): string {
  switch (resolveAuthorizedEmail(email)) {
    case 'nathan.delcambre@gmail.com':
      return 'Nathan';
    case 'jade.peroch@gmail.com':
      return 'Jade';
    default:
      return 'Invité';
  }
}
