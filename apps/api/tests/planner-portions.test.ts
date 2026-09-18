import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const portionLine = z.object({ userId: z.string(), portions: z.number().min(0).max(6) });
const portionsSchema = z.array(portionLine).superRefine((val, ctx) => {
  if (!val.some((line) => line.portions > 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Au moins une personne doit garder une portion.',
      path: ['portions'],
    });
  }
});

describe('portions planning', () => {
  it('accepte 0 pour une personne', () => {
    const result = portionsSchema.safeParse([
      { userId: 'n', portions: 0 },
      { userId: 'j', portions: 1 },
    ]);
    expect(result.success).toBe(true);
  });

  it('refuse tout le monde à 0', () => {
    const result = portionsSchema.safeParse([
      { userId: 'n', portions: 0 },
      { userId: 'j', portions: 0 },
    ]);
    expect(result.success).toBe(false);
  });
});
