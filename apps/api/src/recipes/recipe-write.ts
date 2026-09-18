import { z } from 'zod';
import { QUANTITY_UNITS } from '@cuisinons/shared';
import { MAX_PHOTO_DATA_URL_LENGTH } from './recipe-photo.js';

export const recipeWriteSchema = z
  .object({
    name: z.string().min(1).max(160),
    description: z.string().max(4000).nullable().optional(),
    servings: z.number().positive().max(50),
    prepTimeMinutes: z.number().int().nonnegative().nullable().optional(),
    cookTimeMinutes: z.number().int().nonnegative().nullable().optional(),
    finalCookedWeight: z.number().positive().nullable().optional(),
    photoDataUrl: z.string().max(MAX_PHOTO_DATA_URL_LENGTH).nullable().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
    version: z.number().int().optional(),
    ingredients: z
      .array(
        z.object({
          ingredientId: z.string().min(1),
          quantity: z.number().nonnegative(),
          unit: z.enum(QUANTITY_UNITS),
          gramsManual: z.number().positive().nullable().optional(),
          displayQuantity: z.string().max(32).nullable().optional(),
        }),
      )
      .min(2, 'Ajoute au moins deux ingrédients distincts.'),
    steps: z.array(
      z.object({
        description: z.string().min(1).max(2000),
        durationMinutes: z.number().int().nonnegative().nullable().optional(),
      }),
    ),
    tagIds: z.array(z.string()),
    equipmentIds: z.array(z.string()),
  })
  .superRefine((val, ctx) => {
    const ids = val.ingredients.map((line) => line.ingredientId).filter(Boolean);
    if (new Set(ids).size < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ajoute au moins deux ingrédients distincts.',
        path: ['ingredients'],
      });
    }
  });
