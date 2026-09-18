import { scaleNutritionByPortions, sumMacros, type MacroNutrients } from './macros.js';

export type PlannedMealPortion = {
  userId: string;
  portions: number;
  consumedAt?: string | Date | null;
  skipAutoConsume?: boolean;
};

export type PlannedMeal = {
  date: string;
  perServing: MacroNutrients;
  portions: readonly PlannedMealPortion[];
};

function dateKey(value: string): string {
  return value.slice(0, 10);
}

export function isPortionConsumed(
  portion: PlannedMealPortion,
  mealDate: string,
  todayIso: string,
): boolean {
  if (portion.consumedAt) return true;
  if (portion.skipAutoConsume) return false;
  return dateKey(mealDate) < todayIso;
}

function emptyMacros(): MacroNutrients {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
}

function userQty(meal: PlannedMeal, userId: string): number {
  const portion = meal.portions.find((p) => p.userId === userId);
  const qty = portion ? Number(portion.portions) : 0;
  return qty > 0 ? qty : 0;
}

export function weekMacroAverages(input: {
  meals: readonly PlannedMeal[];
  userId: string;
  todayIso: string;
  dayCount?: number;
}): { planned: MacroNutrients; consumed: MacroNutrients } {
  const days = input.dayCount && input.dayCount > 0 ? input.dayCount : 7;
  const plannedParts: MacroNutrients[] = [];
  const consumedParts: MacroNutrients[] = [];

  for (const meal of input.meals) {
    const qty = userQty(meal, input.userId);
    if (qty <= 0) continue;
    const macros = scaleNutritionByPortions(meal.perServing, qty);
    plannedParts.push(macros);
    const portion = meal.portions.find((p) => p.userId === input.userId);
    if (portion && isPortionConsumed(portion, meal.date, input.todayIso)) {
      consumedParts.push(macros);
    }
  }

  const plannedTotal = plannedParts.length ? sumMacros(plannedParts) : emptyMacros();
  const consumedTotal = consumedParts.length ? sumMacros(consumedParts) : emptyMacros();
  return {
    planned: scaleNutritionByPortions(plannedTotal, 1 / days),
    consumed: scaleNutritionByPortions(consumedTotal, 1 / days),
  };
}
