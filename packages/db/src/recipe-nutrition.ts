import type { RecipeNutrition } from '@cuisinons/shared';
import type { Prisma } from '../generated/client';

/** Colonnes Ciqual utiles au calcul des macros — rien d’autre. */
export const INGREDIENT_MACRO_SELECT = {
  energyKcalKind: true,
  energyKcal: true,
  proteinKind: true,
  proteinG: true,
  carbKind: true,
  carbG: true,
  fatKind: true,
  fatG: true,
  fiberKind: true,
  fiberG: true,
} as const;

export function nutritionFromSnapshot(value: Prisma.JsonValue | null | undefined): RecipeNutrition | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const perServing = row.perServing;
  if (!perServing || typeof perServing !== 'object') return null;
  return value as unknown as RecipeNutrition;
}
