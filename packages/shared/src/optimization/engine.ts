import {
  nutritionPenalty,
  remainingGap,
  type MacroTotals,
  type NutritionGoals,
} from '../nutrition/goals';
import type { MacroNutrients } from '../nutrition/macros';
import type { MealSlot } from '../planner/slots';

export type OptimizerMealItem = {
  id: string;
  recipeId: string;
  recipeName: string;
  slot: MealSlot;
  portions: number;
  perServing: MacroNutrients;
  nutritionComplete: boolean;
};

export type CandidateRecipe = {
  id: string;
  name: string;
  tags: readonly string[];
  perServing: MacroNutrients;
  nutritionComplete: boolean;
};

export type OptimizerPrefs = {
  minPortionMultiplier: number;
  maxPortionMultiplier: number;
  allowAutoAdd: boolean;
};

export type PortionChange = {
  mealItemId: string;
  recipeName: string;
  slot: MealSlot;
  fromPortions: number;
  toPortions: number;
  delta: MacroTotals;
};

export type SuggestedAdd = {
  recipeId: string;
  recipeName: string;
  slot: MealSlot;
  portions: number;
  delta: MacroTotals;
};

export type OptimizerResult = {
  before: MacroTotals;
  after: MacroTotals;
  penaltyBefore: number;
  penaltyAfter: number;
  portionChanges: PortionChange[];
  suggestedAdds: SuggestedAdd[];
  remaining: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  };
  summary: string;
  excludedIncomplete: number;
};

const SLOT_TAGS: Record<MealSlot, readonly string[]> = {
  BREAKFAST: ['petit-dejeuner'],
  LUNCH: ['plat-principal'],
  SNACK: ['gouter', 'dessert'],
  DINNER: ['plat-principal'],
};

function macrosOf(perServing: MacroNutrients, portions: number): MacroTotals {
  return {
    kcal: perServing.kcal * portions,
    protein: perServing.protein * portions,
    carbs: perServing.carbs * portions,
    fat: perServing.fat * portions,
  };
}

function addTotals(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

function subTotals(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    kcal: a.kcal - b.kcal,
    protein: a.protein - b.protein,
    carbs: a.carbs - b.carbs,
    fat: a.fat - b.fat,
  };
}

function sumWorking(
  items: ReadonlyArray<{ perServing: MacroNutrients; portions: number }>,
): MacroTotals {
  return items.reduce<MacroTotals>(
    (acc, item) => addTotals(acc, macrosOf(item.perServing, item.portions)),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function discreteMultipliers(min: number, max: number): number[] {
  const values: number[] = [];
  for (let v = min; v <= max + 1e-9; v += 0.05) {
    values.push(Math.round(v * 100) / 100);
  }
  return values;
}

function recipeFitsSlot(recipe: CandidateRecipe, slot: MealSlot): boolean {
  const wanted = SLOT_TAGS[slot];
  const tags = recipe.tags.map((t) => t.toLowerCase().normalize('NFD').replace(/\p{M}/gu, ''));
  return wanted.some((tag) => tags.includes(tag));
}

function buildSummary(result: Omit<OptimizerResult, 'summary'>): string {
  const lines: string[] = [];
  for (const change of result.portionChanges) {
    const protein = change.delta.protein;
    const sign = protein >= 0 ? '+' : '';
    lines.push(
      `${change.recipeName} ${change.fromPortions.toFixed(2)} → ${change.toPortions.toFixed(2)} portion (${sign}${protein.toFixed(0)} g protéines)`,
    );
  }
  for (const add of result.suggestedAdds) {
    lines.push(
      `Ajouter ${add.recipeName} (${add.portions.toFixed(2)} portion, +${add.delta.protein.toFixed(0)} g protéines)`,
    );
  }
  if (lines.length === 0) {
    return 'Aucun ajustement utile trouvé sans dépasser tes contraintes.';
  }
  lines.push(
    `Résultat estimé : protéines ${result.before.protein.toFixed(0)} → ${result.after.protein.toFixed(0)} g, lipides ${result.before.fat.toFixed(0)} → ${result.after.fat.toFixed(0)} g, glucides ${result.before.carbs.toFixed(0)} → ${result.after.carbs.toFixed(0)} g.`,
  );
  return lines.join('\n');
}

export function optimizeDay(input: {
  meals: readonly OptimizerMealItem[];
  emptySlots: readonly MealSlot[];
  recipes: readonly CandidateRecipe[];
  goals: NutritionGoals;
  prefs: OptimizerPrefs;
}): OptimizerResult {
  const excludedIncomplete = input.meals.filter((m) => !m.nutritionComplete).length;
  const working = input.meals
    .filter((m) => m.nutritionComplete)
    .map((m) => ({ ...m }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const originalPortions = new Map(working.map((m) => [m.id, m.portions]));
  const before = sumWorking(working);
  const penaltyBefore = nutritionPenalty(before, input.goals);
  const multipliers = discreteMultipliers(
    input.prefs.minPortionMultiplier,
    input.prefs.maxPortionMultiplier,
  );

  let currentPenalty = penaltyBefore;
  let improved = true;
  while (improved) {
    improved = false;
    let bestIndex = -1;
    let bestPortions = 0;
    let bestPenalty = currentPenalty;
    for (let i = 0; i < working.length; i++) {
      const item = working[i];
      if (!item) continue;
      for (const portions of multipliers) {
        if (Math.abs(portions - item.portions) < 1e-9) continue;
        const previous = item.portions;
        item.portions = portions;
        const penalty = nutritionPenalty(sumWorking(working), input.goals);
        item.portions = previous;
        if (penalty + 1e-6 < bestPenalty) {
          bestPenalty = penalty;
          bestIndex = i;
          bestPortions = portions;
        }
      }
    }
    if (bestIndex >= 0) {
      const item = working[bestIndex];
      if (item) {
        item.portions = bestPortions;
        currentPenalty = bestPenalty;
        improved = true;
      }
    }
  }

  const portionChanges: PortionChange[] = [];
  for (const item of working) {
    const from = originalPortions.get(item.id) ?? item.portions;
    if (Math.abs(from - item.portions) < 1e-9) continue;
    portionChanges.push({
      mealItemId: item.id,
      recipeName: item.recipeName,
      slot: item.slot,
      fromPortions: from,
      toPortions: item.portions,
      delta: subTotals(macrosOf(item.perServing, item.portions), macrosOf(item.perServing, from)),
    });
  }

  const suggestedAdds: SuggestedAdd[] = [];
  const occupied = new Set(working.map((m) => m.slot));
  const emptySlots = [...input.emptySlots]
    .filter((slot) => !occupied.has(slot))
    .sort((a, b) => a.localeCompare(b));

  if (input.prefs.allowAutoAdd) {
    const recipes = input.recipes
      .filter((r) => r.nutritionComplete)
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));

    for (const slot of emptySlots) {
      let best: SuggestedAdd | null = null;
      let bestPenalty = currentPenalty;
      for (const recipe of recipes) {
        if (!recipeFitsSlot(recipe, slot)) continue;
        const delta = macrosOf(recipe.perServing, 1);
        const penalty = nutritionPenalty(addTotals(sumWorking(working), delta), input.goals);
        if (penalty + 1e-6 < bestPenalty) {
          bestPenalty = penalty;
          best = {
            recipeId: recipe.id,
            recipeName: recipe.name,
            slot,
            portions: 1,
            delta,
          };
        }
      }
      if (best) {
        suggestedAdds.push(best);
        working.push({
          id: `suggested:${best.recipeId}:${best.slot}`,
          recipeId: best.recipeId,
          recipeName: best.recipeName,
          slot: best.slot,
          portions: best.portions,
          perServing: {
            kcal: best.delta.kcal,
            protein: best.delta.protein,
            carbs: best.delta.carbs,
            fat: best.delta.fat,
            fiber: null,
          },
          nutritionComplete: true,
        });
        occupied.add(best.slot);
        currentPenalty = bestPenalty;
      }
    }
  }

  const after = sumWorking(working);
  const result = {
    before,
    after,
    penaltyBefore,
    penaltyAfter: nutritionPenalty(after, input.goals),
    portionChanges,
    suggestedAdds,
    remaining: {
      calories: remainingGap(after.kcal, input.goals.calories),
      protein: remainingGap(after.protein, input.goals.protein),
      carbs: remainingGap(after.carbs, input.goals.carbs),
      fat: remainingGap(after.fat, input.goals.fat),
    },
    excludedIncomplete,
  };
  return { ...result, summary: buildSummary(result) };
}
