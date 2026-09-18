import { Prisma } from '@cuisinons/db';
import { PrismaService } from '../prisma/prisma.service.js';
import { nutritionForRecipe } from './recipe-nutrition.js';

const MACRO_SELECT = {
  energyKcal: true,
  proteinG: true,
  carbG: true,
  fatG: true,
  fiberG: true,
} as const;

export async function persistRecipeNutritionSnapshot(prisma: PrismaService, recipeId: string) {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: { servings: true, finalCookedWeight: true },
  });
  if (!recipe) return null;
  const lines = await prisma.recipeIngredient.findMany({
    where: { recipeId },
    select: {
      grams: true,
      ingredient: { select: MACRO_SELECT },
    },
  });
  const nutrition = nutritionForRecipe(lines, Number(recipe.servings), recipe.finalCookedWeight);
  await prisma.recipe.update({
    where: { id: recipeId },
    data: { nutritionSnapshot: nutrition as Prisma.InputJsonValue },
  });
  return nutrition;
}
