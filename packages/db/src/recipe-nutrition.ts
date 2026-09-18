import { computeRecipeNutrition, type RecipeNutrition } from '@cuisinons/shared';
import { Prisma, type PrismaClient } from '../generated/client';

/** Colonnes Ciqual utiles au calcul des macros — rien d’autre. */
export const INGREDIENT_MACRO_SELECT = {
  energyKcal: true,
  proteinG: true,
  carbG: true,
  fatG: true,
  fiberG: true,
} as const;

type Db = {
  recipe: PrismaClient['recipe'];
  recipeIngredient: PrismaClient['recipeIngredient'];
};

function num(value: { toNumber(): number } | number | null): number | null {
  if (value === null) return null;
  return typeof value === 'number' ? value : value.toNumber();
}

export function nutritionFromSnapshot(value: Prisma.JsonValue | null | undefined): RecipeNutrition | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const perServing = row.perServing;
  if (!perServing || typeof perServing !== 'object') return null;
  return value as unknown as RecipeNutrition;
}

export async function refreshRecipeNutritionSnapshot(db: Db, recipeId: string): Promise<RecipeNutrition | null> {
  const recipe = await db.recipe.findUnique({
    where: { id: recipeId },
    select: { servings: true, finalCookedWeight: true },
  });
  if (!recipe) return null;
  const lines = await db.recipeIngredient.findMany({
    where: { recipeId },
    select: {
      grams: true,
      ingredient: { select: INGREDIENT_MACRO_SELECT },
    },
  });
  const nutrition = computeRecipeNutrition(
    lines.map((line) => ({
      grams: num(line.grams),
      energyKcalPer100g: num(line.ingredient.energyKcal),
      proteinPer100g: num(line.ingredient.proteinG),
      carbsPer100g: num(line.ingredient.carbG),
      fatPer100g: num(line.ingredient.fatG),
      fiberPer100g: num(line.ingredient.fiberG),
    })),
    Number(recipe.servings),
    num(recipe.finalCookedWeight),
  );
  await db.recipe.update({
    where: { id: recipeId },
    data: { nutritionSnapshot: nutrition as Prisma.InputJsonValue },
  });
  return nutrition;
}

export async function refreshMissingNutritionSnapshots(db: Db): Promise<number> {
  const missing = await db.recipe.findMany({
    where: { nutritionSnapshot: { equals: Prisma.DbNull } },
    select: { id: true },
  });
  for (const row of missing) {
    await refreshRecipeNutritionSnapshot(db, row.id);
  }
  return missing.length;
}
