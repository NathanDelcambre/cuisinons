export type MacroNutrients = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
};

export type RecipeLineInput = {
  grams: number | null;
  energyKcalPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  fiberPer100g: number | null;
};

export type RecipeNutrition = {
  total: MacroNutrients;
  perServing: MacroNutrients;
  per100g: MacroNutrients | null;
  totalWeightGrams: number;
  usedCookedWeight: boolean;
  incompleteLines: number;
  complete: boolean;
};

function emptyMacros(): MacroNutrients {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
}

function scaleMacros(macros: MacroNutrients, factor: number): MacroNutrients {
  return {
    kcal: macros.kcal * factor,
    protein: macros.protein * factor,
    carbs: macros.carbs * factor,
    fat: macros.fat * factor,
    fiber: macros.fiber === null ? null : macros.fiber * factor,
  };
}

export function macrosFromGrams(line: RecipeLineInput): MacroNutrients | null {
  if (line.grams === null || line.grams < 0) {
    return null;
  }
  // Ciqual laisse souvent glucides/protéines à NA pour les huiles : on garde
  // l'énergie connue et on traite les macros manquantes comme 0, plutôt que
  // d'ignorer toute la ligne (vinaigrette à 1 kcal, patate douce à 0 g de lipides).
  if (line.energyKcalPer100g === null) {
    return null;
  }
  const factor = line.grams / 100;
  return {
    kcal: line.energyKcalPer100g * factor,
    protein: (line.proteinPer100g ?? 0) * factor,
    carbs: (line.carbsPer100g ?? 0) * factor,
    fat: (line.fatPer100g ?? 0) * factor,
    fiber: line.fiberPer100g === null ? null : line.fiberPer100g * factor,
  };
}

export function computeRecipeNutrition(
  lines: readonly RecipeLineInput[],
  servings: number,
  finalCookedWeightGrams?: number | null,
): RecipeNutrition {
  const safeServings = servings > 0 ? servings : 1;
  const total = emptyMacros();
  let totalWeightGrams = 0;
  let incompleteLines = 0;
  let fiberComplete = true;

  for (const line of lines) {
    const macros = macrosFromGrams(line);
    if (macros === null || line.grams === null) {
      incompleteLines += 1;
      continue;
    }
    total.kcal += macros.kcal;
    total.protein += macros.protein;
    total.carbs += macros.carbs;
    total.fat += macros.fat;
    if (macros.fiber === null) {
      fiberComplete = false;
    } else {
      total.fiber = (total.fiber ?? 0) + macros.fiber;
    }
    totalWeightGrams += line.grams;
  }

  if (!fiberComplete) {
    total.fiber = null;
  }

  const usedCookedWeight =
    finalCookedWeightGrams !== null &&
    finalCookedWeightGrams !== undefined &&
    finalCookedWeightGrams > 0;
  const weightFor100g = usedCookedWeight ? finalCookedWeightGrams : totalWeightGrams;
  const per100g =
    weightFor100g > 0
      ? scaleMacros(total, 100 / weightFor100g)
      : null;

  return {
    total,
    perServing: scaleMacros(total, 1 / safeServings),
    per100g,
    totalWeightGrams: usedCookedWeight ? weightFor100g : totalWeightGrams,
    usedCookedWeight,
    incompleteLines,
    complete: incompleteLines === 0 && lines.length > 0,
  };
}

export function scaleNutritionByPortions(macros: MacroNutrients, portions: number): MacroNutrients {
  return scaleMacros(macros, portions);
}

export function sumMacros(items: readonly MacroNutrients[]): MacroNutrients {
  const total = emptyMacros();
  let fiberComplete = true;
  for (const item of items) {
    total.kcal += item.kcal;
    total.protein += item.protein;
    total.carbs += item.carbs;
    total.fat += item.fat;
    if (item.fiber === null) {
      fiberComplete = false;
    } else {
      total.fiber = (total.fiber ?? 0) + item.fiber;
    }
  }
  if (!fiberComplete) {
    total.fiber = null;
  }
  return total;
}
