import { computeRecipeNutrition, type RecipeNutrition } from '@cuisinons/shared';
import { Prisma, type PrismaClient } from '../generated/client';
import { INGREDIENT_MACRO_SELECT } from './recipe-nutrition';

type Db = {
  recipe: PrismaClient['recipe'];
  recipeIngredient: PrismaClient['recipeIngredient'];
};

function num(value: { toNumber(): number } | number | null): number | null {
  if (value === null) return null;
  return typeof value === 'number' ? value : value.toNumber();
}

/** Réservé au seed / tsx : @cuisinons/shared est ESM, le client Prisma CJS ne doit pas le require() au boot Vercel. */
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
