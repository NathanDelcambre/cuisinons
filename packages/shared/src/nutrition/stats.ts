import type { MealSlot } from '../planner/slots.js';
import { MEAL_SLOTS } from '../planner/slots.js';
import { isPortionConsumed, type PlannedMealPortion } from './planned-consumed.js';
import { scaleNutritionByPortions, type MacroNutrients } from './macros.js';

export const STATS_PERIODS = ['day', 'week', 'month', 'year'] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];

export type StatsMeal = {
  date: string;
  slot: MealSlot;
  recipeId: string | null;
  recipeName: string | null;
  perServing: MacroNutrients;
  portions: readonly PlannedMealPortion[];
};

export type SlotFavorite = {
  slot: MealSlot;
  recipeId: string | null;
  recipeName: string | null;
  count: number;
};

export type UserNutritionStats = {
  userId: string;
  displayName: string;
  days: number;
  planned: MacroNutrients;
  consumed: MacroNutrients;
  plannedDaily: MacroNutrients;
  consumedDaily: MacroNutrients;
  favorites: SlotFavorite[];
};

function emptyMacros(): MacroNutrients {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
}

function addInto(target: MacroNutrients, extra: MacroNutrients) {
  target.kcal += extra.kcal;
  target.protein += extra.protein;
  target.carbs += extra.carbs;
  target.fat += extra.fat;
  if (target.fiber === null || extra.fiber === null) {
    target.fiber = null;
  } else {
    target.fiber += extra.fiber;
  }
}

function average(total: MacroNutrients, days: number): MacroNutrients {
  if (days <= 0) return emptyMacros();
  return scaleNutritionByPortions(total, 1 / days);
}

export function periodDayCount(period: StatsPeriod, from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  const days = Math.floor(ms / 86_400_000) + 1;
  if (period === 'day') return 1;
  return Math.max(1, days);
}

export function aggregateUserStats(input: {
  userId: string;
  displayName: string;
  meals: readonly StatsMeal[];
  todayIso: string;
  days: number;
}): UserNutritionStats {
  const planned = emptyMacros();
  const consumed = emptyMacros();
  const counts = new Map<MealSlot, Map<string, { name: string; count: number }>>();
  for (const slot of MEAL_SLOTS) counts.set(slot, new Map());

  for (const meal of input.meals) {
    const portion = meal.portions.find((p) => p.userId === input.userId);
    const qty = portion ? Number(portion.portions) : 0;
    if (qty <= 0) continue;
    const macros = scaleNutritionByPortions(meal.perServing, qty);
    addInto(planned, macros);
    if (portion && isPortionConsumed(portion, meal.date, input.todayIso)) {
      addInto(consumed, macros);
    }
    if (meal.recipeId && meal.recipeName) {
      const bucket = counts.get(meal.slot);
      if (!bucket) continue;
      const current = bucket.get(meal.recipeId) ?? { name: meal.recipeName, count: 0 };
      current.count += 1;
      bucket.set(meal.recipeId, current);
    }
  }

  const favorites: SlotFavorite[] = MEAL_SLOTS.map((slot) => {
    const bucket = counts.get(slot) ?? new Map();
    let best: { id: string; name: string; count: number } | null = null;
    for (const [id, value] of bucket) {
      if (!best || value.count > best.count || (value.count === best.count && value.name.localeCompare(best.name, 'fr') < 0)) {
        best = { id, name: value.name, count: value.count };
      }
    }
    return {
      slot,
      recipeId: best?.id ?? null,
      recipeName: best?.name ?? null,
      count: best?.count ?? 0,
    };
  });

  return {
    userId: input.userId,
    displayName: input.displayName,
    days: input.days,
    planned,
    consumed,
    plannedDaily: average(planned, input.days),
    consumedDaily: average(consumed, input.days),
    favorites,
  };
}
