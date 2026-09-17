import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
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
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid API env: ${parsed.error.message}`);
  }
  const env = parsed.data;
  if (env.APP_ENV === 'production') {
    if (env.AUTH_SECRET.length < 32 || env.PASSWORD_PEPPER.length < 32 || env.INTERNAL_API_SECRET.length < 32) {
      throw new Error('Secrets trop courts pour la production.');
    }
    if (!env.WEB_ORIGIN.startsWith('https://')) {
      throw new Error('WEB_ORIGIN doit être en HTTPS en production.');
    }
  }
  return env;
}
