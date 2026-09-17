export const GOAL_MODES = ['AT_LEAST', 'AT_MOST', 'TARGET', 'NONE'] as const;

export type GoalMode = (typeof GOAL_MODES)[number];

export const GOAL_MODE_LABELS: Record<GoalMode, string> = {
  AT_LEAST: 'au moins',
  AT_MOST: 'au maximum',
  TARGET: 'environ',
  NONE: "pas d'objectif",
};

export type NutrientGoal = {
  mode: GoalMode;
  value: number | null;
  tolerance: number | null;
};

export type NutritionGoals = {
  calories: NutrientGoal;
  protein: NutrientGoal;
  carbs: NutrientGoal;
  fat: NutrientGoal;
};

export function defaultGoals(): NutritionGoals {
  return {
    calories: { mode: 'NONE', value: null, tolerance: null },
    protein: { mode: 'NONE', value: null, tolerance: null },
    carbs: { mode: 'NONE', value: null, tolerance: null },
    fat: { mode: 'NONE', value: null, tolerance: null },
  };
}

export function goalPenalty(actual: number, goal: NutrientGoal, weight: number): number {
  if (goal.mode === 'NONE' || goal.value === null) {
    return 0;
  }
  if (goal.mode === 'AT_LEAST') {
    return actual >= goal.value ? 0 : weight * (goal.value - actual) ** 2;
  }
  if (goal.mode === 'AT_MOST') {
    return actual <= goal.value ? 0 : weight * (actual - goal.value) ** 2;
  }
  const tolerance = goal.tolerance ?? Math.max(goal.value * 0.08, 1);
  const delta = Math.abs(actual - goal.value);
  if (delta <= tolerance) {
    return 0;
  }
  return weight * (delta - tolerance) ** 2;
}

export type MacroTotals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export function nutritionPenalty(actual: MacroTotals, goals: NutritionGoals): number {
  return (
    goalPenalty(actual.kcal, goals.calories, 0.002) +
    goalPenalty(actual.protein, goals.protein, 1.2) +
    goalPenalty(actual.carbs, goals.carbs, 0.35) +
    goalPenalty(actual.fat, goals.fat, 1.4)
  );
}

export function remainingGap(actual: number, goal: NutrientGoal): number | null {
  if (goal.mode === 'NONE' || goal.value === null) {
    return null;
  }
  if (goal.mode === 'AT_LEAST') {
    return Math.max(0, goal.value - actual);
  }
  if (goal.mode === 'AT_MOST') {
    return Math.max(0, actual - goal.value);
  }
  return actual - goal.value;
}
