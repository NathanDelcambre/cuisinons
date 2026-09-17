import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  AUTH_SECRET: z.string().min(16),
  INTERNAL_API_SECRET: z.string().min(16),
  API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  SESSION_TTL_DAYS: z.coerce.number().default(7),
  INTERNAL_JWT_TTL_SECONDS: z.coerce.number().default(45),
  AUTH_COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  AUTH_COOKIE_NAME_SESSION: z.string().default('cuisinons_session'),
  CSRF_COOKIE_NAME: z.string().default('cuisinons_csrf'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
});

export type WebEnv = z.infer<typeof schema>;

export function loadWebEnv(): WebEnv {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid web env: ${parsed.error.message}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production') {
    if (!env.AUTH_COOKIE_SECURE) {
      throw new Error('AUTH_COOKIE_SECURE doit être true en production.');
    }
    if (env.AUTH_SECRET.length < 32 || env.INTERNAL_API_SECRET.length < 32) {
      throw new Error('Secrets trop courts pour la production.');
    }
  }
  return env;
}
