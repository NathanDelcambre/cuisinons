import type { GoalMode } from './goals.js';

const ASSUMED_AGE = 30;
/** Moyenne des constantes Mifflin homme (+5) et femme (−161). */
const SEX_OFFSET = 78;
const ACTIVITY = 1.45;

export const BODY_HEIGHT_CM = { min: 120, max: 230 } as const;
export const BODY_WEIGHT_KG = { min: 35, max: 250 } as const;

export type EstimatedMacros = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  tdee: number;
  stable: boolean;
};

export type BodyEstimateInput = {
  weightKg: number;
  heightCm: number;
  /** `null` = rester stable. */
  targetWeightKg: number | null;
};

export type EstimatedNutritionGoals = {
  caloriesMode: GoalMode;
  caloriesValue: number;
  caloriesTolerance: number;
  proteinMode: GoalMode;
  proteinValue: number;
  proteinTolerance: null;
  carbsMode: GoalMode;
  carbsValue: number;
  carbsTolerance: number;
  fatMode: GoalMode;
  fatValue: number;
  fatTolerance: number;
};

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function inRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

export function isValidBodyEstimateInput(input: BodyEstimateInput): boolean {
  if (!inRange(input.weightKg, BODY_WEIGHT_KG.min, BODY_WEIGHT_KG.max)) return false;
  if (!inRange(input.heightCm, BODY_HEIGHT_CM.min, BODY_HEIGHT_CM.max)) return false;
  if (input.targetWeightKg !== null && !inRange(input.targetWeightKg, BODY_WEIGHT_KG.min, BODY_WEIGHT_KG.max)) {
    return false;
  }
  return true;
}

/** Métabolisme de base Mifflin-St Jeor, sexe moyenné, âge 30 ans. */
export function estimateBmrKcal(weightKg: number, heightCm: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * ASSUMED_AGE - SEX_OFFSET;
}

/**
 * Ordre de grandeur des besoins journaliers. Pas un bilan clinique :
 * activité légère (1,45), protéines 1,8 g/kg, lipides 0,9 g/kg, glucides le reste.
 */
export function estimateDailyMacros(input: BodyEstimateInput): EstimatedMacros | null {
  if (!isValidBodyEstimateInput(input)) return null;

  const tdee = estimateBmrKcal(input.weightKg, input.heightCm) * ACTIVITY;
  const target = input.targetWeightKg;
  const deltaKg = target === null ? 0 : target - input.weightKg;
  const stable = Math.abs(deltaKg) < 0.5;

  let kcal = tdee;
  if (!stable && target !== null) {
    if (deltaKg < 0) {
      kcal = tdee - Math.min(550, Math.max(250, 110 * Math.min(4, Math.abs(deltaKg))));
    } else {
      kcal = tdee + Math.min(400, Math.max(200, 90 * Math.min(4, deltaKg)));
    }
  }
  kcal = Math.max(kcal, Math.min(1400, tdee * 0.78));

  const protein = Math.max(50, roundTo(1.8 * input.weightKg, 5));
  const fat = Math.max(35, roundTo(0.9 * input.weightKg, 5));
  const remainKcal = Math.max(0, kcal - protein * 4 - fat * 9);
  const carbs = Math.max(40, roundTo(remainKcal / 4, 5));

  return {
    kcal: roundTo(protein * 4 + carbs * 4 + fat * 9, 10),
    protein,
    carbs,
    fat,
    tdee: roundTo(tdee, 10),
    stable,
  };
}

export function nutritionGoalsFromEstimate(macros: EstimatedMacros): EstimatedNutritionGoals {
  return {
    caloriesMode: 'TARGET',
    caloriesValue: macros.kcal,
    caloriesTolerance: Math.max(50, roundTo(macros.kcal * 0.08, 10)),
    proteinMode: 'AT_LEAST',
    proteinValue: macros.protein,
    proteinTolerance: null,
    carbsMode: 'TARGET',
    carbsValue: macros.carbs,
    carbsTolerance: Math.max(10, roundTo(macros.carbs * 0.1, 5)),
    fatMode: 'TARGET',
    fatValue: macros.fat,
    fatTolerance: Math.max(5, roundTo(macros.fat * 0.1, 5)),
  };
}
