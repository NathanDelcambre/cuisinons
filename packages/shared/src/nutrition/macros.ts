export type MacroNutrients = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
};

export type MacroValueKind = 'VALUE' | 'TRACES' | 'LESS_THAN' | 'ABSENT' | 'NA';

export type RecipeLineInput = {
  grams: number | null;
  energyKcalPer100g: number | null;
  energyKcalKind?: MacroValueKind;
  proteinPer100g: number | null;
  proteinKind?: MacroValueKind;
  carbsPer100g: number | null;
  carbsKind?: MacroValueKind;
  fatPer100g: number | null;
  fatKind?: MacroValueKind;
  fiberPer100g: number | null;
  fiberKind?: MacroValueKind;
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

function macroAmount(
  value: number | null,
  kind: MacroValueKind | undefined,
): number | null {
  if (value !== null) return value;
  if (kind === 'TRACES' || kind === 'ABSENT') return 0;
  // Compatibilité des appels historiques : avant l'ajout des kinds, les
  // macros absentes étaient considérées comme nulles de contribution.
  return kind === undefined ? 0 : null;
}

export function macrosFromGrams(line: RecipeLineInput): MacroNutrients | null {
  if (line.grams === null || line.grams < 0) {
    return null;
  }

  const protein = macroAmount(line.proteinPer100g, line.proteinKind);
  const carbs = macroAmount(line.carbsPer100g, line.carbsKind);
  const fat = macroAmount(line.fatPer100g, line.fatKind);
  if (protein === null || carbs === null || fat === null) {
    return null;
  }

  const fiber = macroAmount(line.fiberPer100g, line.fiberKind);
  const reportedEnergy =
    line.energyKcalPer100g ??
    (line.energyKcalKind === 'TRACES' || line.energyKcalKind === 'ABSENT' ? 0 : null);
  // Quand Ciqual ne publie pas l'énergie mais publie les constituants, appliquer
  // les facteurs UE 1169/2011 (4/4/9 kcal et 2 kcal/g de fibres) est un calcul,
  // pas une estimation arbitraire.
  const energy =
    reportedEnergy ?? protein * 4 + carbs * 4 + fat * 9 + (fiber ?? 0) * 2;
  const factor = line.grams / 100;
  return {
    kcal: energy * factor,
    protein: protein * factor,
    carbs: carbs * factor,
    fat: fat * factor,
    fiber: fiber === null ? null : fiber * factor,
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
