import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PASSWORD_PEPPER: z.string().min(16),
  SEED_NATHAN_PASSWORD: z.string().optional(),
  SEED_JADE_PASSWORD: z.string().optional(),
});

export function loadDbEnv() {
  return envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    PASSWORD_PEPPER: process.env.PASSWORD_PEPPER,
    SEED_NATHAN_PASSWORD: process.env.SEED_NATHAN_PASSWORD,
    SEED_JADE_PASSWORD: process.env.SEED_JADE_PASSWORD,
  });
}
