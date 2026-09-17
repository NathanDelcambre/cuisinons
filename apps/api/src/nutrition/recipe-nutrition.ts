import { computeRecipeNutrition, type RecipeLineInput } from '@cuisinons/shared';
import type { Prisma } from '@cuisinons/db';

type IngredientRow = {
  energyKcal: Prisma.Decimal | null;
  proteinG: Prisma.Decimal | null;
  carbG: Prisma.Decimal | null;
  fatG: Prisma.Decimal | null;
  fiberG: Prisma.Decimal | null;
};

type LineRow = {
  grams: Prisma.Decimal | null;
  ingredient: IngredientRow;
};

export function recipeLinesToInput(lines: LineRow[]): RecipeLineInput[] {
  return lines.map((line) => ({
    grams: line.grams === null ? null : Number(line.grams),
    energyKcalPer100g: line.ingredient.energyKcal === null ? null : Number(line.ingredient.energyKcal),
    proteinPer100g: line.ingredient.proteinG === null ? null : Number(line.ingredient.proteinG),
    carbsPer100g: line.ingredient.carbG === null ? null : Number(line.ingredient.carbG),
    fatPer100g: line.ingredient.fatG === null ? null : Number(line.ingredient.fatG),
    fiberPer100g: line.ingredient.fiberG === null ? null : Number(line.ingredient.fiberG),
  }));
}

export function nutritionForRecipe(
  lines: LineRow[],
  servings: number,
  finalCookedWeight?: Prisma.Decimal | null,
) {
  return computeRecipeNutrition(
    recipeLinesToInput(lines),
    servings,
    finalCookedWeight === null || finalCookedWeight === undefined
      ? null
      : Number(finalCookedWeight),
  );
}
