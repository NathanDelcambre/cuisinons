import { z } from 'zod';

function strip(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, '');
  return trimmed.length > 0 ? trimmed : undefined;
}

function asUrl(value: string | undefined, fallback: string): string {
  const raw = strip(value) ?? fallback;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/$/, '');
}

function asFlag(value: string | undefined): boolean {
  const v = strip(value)?.toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  AUTH_SECRET: z.string().min(16),
  INTERNAL_API_SECRET: z.string().min(16),
  API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  SESSION_TTL_DAYS: z.coerce.number().default(7),
  INTERNAL_JWT_TTL_SECONDS: z.coerce.number().default(45),
  AUTH_COOKIE_SECURE: z.boolean(),
  AUTH_COOKIE_NAME_SESSION: z.string().default('cuisinons_session'),
  CSRF_COOKIE_NAME: z.string().default('cuisinons_csrf'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
});

export type WebEnv = z.infer<typeof schema>;

export function loadWebEnv(): WebEnv {
  const nodeEnv = strip(process.env.NODE_ENV) ?? 'development';
  const vercelUrl = strip(process.env.VERCEL_PROJECT_PRODUCTION_URL) ?? strip(process.env.VERCEL_URL);
  const parsed = schema.safeParse({
    NODE_ENV: nodeEnv,
    AUTH_SECRET: strip(process.env.AUTH_SECRET),
    INTERNAL_API_SECRET: strip(process.env.INTERNAL_API_SECRET),
    API_BASE_URL: asUrl(process.env.API_BASE_URL, 'http://localhost:4000'),
    NEXT_PUBLIC_APP_URL: asUrl(
      process.env.NEXT_PUBLIC_APP_URL,
      vercelUrl ? `https://${vercelUrl.replace(/^https?:\/\//, '')}` : 'http://localhost:3000',
    ),
    SESSION_TTL_DAYS: strip(process.env.SESSION_TTL_DAYS),
    INTERNAL_JWT_TTL_SECONDS: strip(process.env.INTERNAL_JWT_TTL_SECONDS),
    AUTH_COOKIE_SECURE: nodeEnv === 'production' ? true : asFlag(process.env.AUTH_COOKIE_SECURE),
    AUTH_COOKIE_NAME_SESSION: strip(process.env.AUTH_COOKIE_NAME_SESSION),
    CSRF_COOKIE_NAME: strip(process.env.CSRF_COOKIE_NAME),
    GOOGLE_CLIENT_ID: strip(process.env.GOOGLE_CLIENT_ID) ?? '',
    GOOGLE_CLIENT_SECRET: strip(process.env.GOOGLE_CLIENT_SECRET) ?? '',
  });
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid web env (${fields})`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production') {
    if (env.AUTH_SECRET.length < 32 || env.INTERNAL_API_SECRET.length < 32) {
      throw new Error('Secrets trop courts pour la production.');
    }
  }
  return env;
}
