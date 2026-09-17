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

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3601),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  PASSWORD_PEPPER: z.string().min(16),
  INTERNAL_API_SECRET: z.string().min(16),
  SESSION_TTL_DAYS: z.coerce.number().default(7),
  INTERNAL_JWT_TTL_SECONDS: z.coerce.number().default(45),
  WEB_ORIGIN: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
});

export type ApiEnv = z.infer<typeof envSchema>;

export function loadApiEnv(): ApiEnv {
  const parsed = envSchema.safeParse({
    NODE_ENV: strip(process.env.NODE_ENV),
    APP_ENV: strip(process.env.APP_ENV),
    PORT: strip(process.env.PORT),
    DATABASE_URL: strip(process.env.DATABASE_URL),
    AUTH_SECRET: strip(process.env.AUTH_SECRET),
    PASSWORD_PEPPER: strip(process.env.PASSWORD_PEPPER),
    INTERNAL_API_SECRET: strip(process.env.INTERNAL_API_SECRET),
    SESSION_TTL_DAYS: strip(process.env.SESSION_TTL_DAYS),
    INTERNAL_JWT_TTL_SECONDS: strip(process.env.INTERNAL_JWT_TTL_SECONDS),
    WEB_ORIGIN: asUrl(process.env.WEB_ORIGIN, 'http://localhost:3600'),
    GOOGLE_CLIENT_ID: strip(process.env.GOOGLE_CLIENT_ID) ?? '',
  });
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid API env (${fields})`);
  }
  const env = parsed.data;
  if (env.APP_ENV === 'production' || env.NODE_ENV === 'production') {
    if (env.AUTH_SECRET.length < 32 || env.PASSWORD_PEPPER.length < 32 || env.INTERNAL_API_SECRET.length < 32) {
      throw new Error('Secrets trop courts pour la production.');
    }
    if (!env.WEB_ORIGIN.startsWith('https://')) {
      throw new Error('WEB_ORIGIN doit être en HTTPS en production.');
    }
  }
  return env;
}
