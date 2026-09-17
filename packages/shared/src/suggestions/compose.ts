import { resolveGrams, type ConversionRecord } from '../nutrition/conversions.js';
import { computeRecipeNutrition, type RecipeNutrition } from '../nutrition/macros.js';
import { volumeToMilliliters, type QuantityUnit } from '../nutrition/units.js';
import type { UxCategory } from '../ciqual/ux-categories.js';
import {
  ARCHETYPES,
  type Archetype,
  type DishKind,
  type PickedIngredient,
  type RoleNeed,
} from './archetypes.js';
import { extraTagSlugs, scoreHealth } from './health.js';
import {
  categoryFitsRole,
  ingredientAllowed,
  ingredientHealth,
  nameMatches,
  ROLE_LABELS,
  type CulinaryRole,
  type Diet,
} from './roles.js';

export type SuggestionFilters = {
  servings: number;
  maxMinutes: number | null;
  maxIngredients: number | null;
  kind: DishKind | null;
  diet: Diet;
};

export const DEFAULT_SUGGESTION_FILTERS: SuggestionFilters = {
  servings: 2,
  maxMinutes: null,
  maxIngredients: null,
  kind: null,
  diet: 'omnivore',
};

export type PantryIngredient = {
  ingredientId: string;
  nameFr: string;
  iconUrl: string | null;
  uxCategory: UxCategory;
  quantity: number;
  unit: QuantityUnit;
  conversions: readonly ConversionRecord[];
  energyKcal: number | null;
  proteinG: number | null;
  carbG: number | null;
  fatG: number | null;
  fiberG: number | null;
};

export type ComposedLine = PickedIngredient & {
  iconUrl: string | null;
  quantity: number;
  unit: QuantityUnit;
  displayQuantity: string;
  energyKcal: number | null;
  proteinG: number | null;
  carbG: number | null;
  fatG: number | null;
  fiberG: number | null;
};

export type ComposedDish = {
  key: string;
  archetypeId: string;
  kind: DishKind;
  name: string;
  description: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  healthScore: number;
  healthNotes: string[];
  ingredients: ComposedLine[];
  steps: Array<{ description: string; durationMinutes: number | null }>;
  tagSlugs: string[];
  equipmentSlugs: string[];
  nutrition: RecipeNutrition;
};

export type Shortage = {
  title: string;
  explanation: string;
  missing: string[];
  alternative: {
    label: string;
    explanation: string;
    relaxedFilters: SuggestionFilters;
    dish: ComposedDish;
  } | null;
};

export type SuggestionResult = {
  dishes: ComposedDish[];
  shortage: Shortage | null;
};

type Usable = PantryIngredient & { grams: number };

type FailureReason = 'diet' | 'time' | 'count' | 'kind' | 'missing-role' | 'unhealthy' | 'empty';

type Failure = {
  reason: FailureReason;
  archetypeId: string;
  detail: string;
  missingRole?: CulinaryRole;
};

function gramsOf(item: PantryIngredient): number | null {
  const resolved = resolveGrams({
    quantity: item.quantity,
    unit: item.unit,
    conversions: item.conversions,
  });
  if (!('needsManualGrams' in resolved)) return resolved.grams;
  const ml = volumeToMilliliters(item.quantity, item.unit);
  if (ml !== null) return ml;
  if (item.unit === 'PIECE' && item.uxCategory === 'EGGS') return item.quantity * 60;
  if (item.unit === 'PINCH') return item.quantity * 0.4;
  return null;
}

function mergeUsable(pantry: readonly PantryIngredient[]): Usable[] {
  const byId = new Map<string, Usable>();
  for (const item of pantry) {
    const grams = gramsOf(item);
    if (grams === null || grams <= 0) continue;
    const prev = byId.get(item.ingredientId);
    if (prev) {
      prev.grams += grams;
      continue;
    }
    byId.set(item.ingredientId, { ...item, grams });
  }
  return [...byId.values()];
}

function tidyGrams(grams: number): number {
  if (grams >= 100) return Math.round(grams);
  return Math.round(grams * 10) / 10;
}

function toLine(item: Usable, role: CulinaryRole, useGrams: number): ComposedLine {
  const quantity = tidyGrams(useGrams);
  return {
    ingredientId: item.ingredientId,
    nameFr: item.nameFr,
    uxCategory: item.uxCategory,
    useGrams: quantity,
    role,
    iconUrl: item.iconUrl,
    quantity,
    unit: 'G',
    displayQuantity: String(quantity),
    energyKcal: item.energyKcal,
    proteinG: item.proteinG,
    carbG: item.carbG,
    fatG: item.fatG,
    fiberG: item.fiberG,
  };
}

function pickNeed(
  need: RoleNeed,
  pool: Usable[],
  remaining: Map<string, number>,
  servings: number,
  diet: Diet,
): ComposedLine[] {
  const target = need.gramsPerServing * servings;
  const candidates = pool
    .filter((item) => ingredientAllowed(item.uxCategory, item.nameFr, diet))
    .filter((item) => categoryFitsRole(item.uxCategory, need.role))
    .filter((item) => nameMatches(item.nameFr, need.nameIncludes, need.nameExcludes))
    .filter((item) => (remaining.get(item.ingredientId) ?? 0) >= 5)
    .sort((a, b) => {
      const health = ingredientHealth(b.uxCategory) - ingredientHealth(a.uxCategory);
      if (Math.abs(health) > 0.04) return health;
      return (remaining.get(b.ingredientId) ?? 0) - (remaining.get(a.ingredientId) ?? 0);
    });

  const picked: ComposedLine[] = [];
  let still = target;
  for (const candidate of candidates) {
    if (picked.length >= need.maxItems || still <= 0) break;
    const available = remaining.get(candidate.ingredientId) ?? 0;
    const take = Math.min(available, still);
    if (take < 5) continue;
    picked.push(toLine(candidate, need.role, take));
    remaining.set(candidate.ingredientId, available - take);
    still -= take;
  }
  const used = target - still;
  const min = (need.minRatio ?? 0.7) * target;
  if (need.required && used < min) {
    for (const line of picked) {
      remaining.set(line.ingredientId, (remaining.get(line.ingredientId) ?? 0) + line.useGrams);
    }
    return [];
  }
  if (!need.required && used < min) {
    for (const line of picked) {
      remaining.set(line.ingredientId, (remaining.get(line.ingredientId) ?? 0) + line.useGrams);
    }
    return [];
  }
  return picked;
}

function trimToMax(lines: ComposedLine[], maxIngredients: number, needs: readonly RoleNeed[]): ComposedLine[] | null {
  if (lines.length <= maxIngredients) return lines;
  const requiredRoles = new Set(needs.filter((need) => need.required).map((need) => need.role));
  const optional = lines.filter((line) => !requiredRoles.has(line.role));
  const required = lines.filter((line) => requiredRoles.has(line.role));
  if (required.length > maxIngredients) return null;
  const keptOptional = optional.slice(0, Math.max(0, maxIngredients - required.length));
  return [...required, ...keptOptional];
}

function nutritionOf(lines: readonly ComposedLine[], servings: number): RecipeNutrition {
  return computeRecipeNutrition(
    lines.map((line) => ({
      grams: line.useGrams,
      energyKcalPer100g: line.energyKcal,
      proteinPer100g: line.proteinG,
      carbsPer100g: line.carbG,
      fatPer100g: line.fatG,
      fiberPer100g: line.fiberG,
    })),
    servings,
  );
}

function composeArchetype(
  archetype: Archetype,
  pool: Usable[],
  filters: SuggestionFilters,
): { dish: ComposedDish } | { failure: Failure } {
  if (!archetype.diets.includes(filters.diet)) {
    return {
      failure: {
        reason: 'diet',
        archetypeId: archetype.id,
        detail: `${archetype.kind} n’est pas compatible avec ce régime.`,
      },
    };
  }
  const totalTime = archetype.prepTimeMinutes + archetype.cookTimeMinutes;
  if (filters.maxMinutes !== null && totalTime > filters.maxMinutes) {
    return {
      failure: {
        reason: 'time',
        archetypeId: archetype.id,
        detail: `Demande ${String(totalTime)} min.`,
      },
    };
  }

  const remaining = new Map(pool.map((item) => [item.ingredientId, item.grams]));
  const lines: ComposedLine[] = [];
  for (const need of archetype.needs) {
    const picked = pickNeed(need, pool, remaining, filters.servings, filters.diet);
    if (need.required && picked.length === 0) {
      return {
        failure: {
          reason: 'missing-role',
          archetypeId: archetype.id,
          missingRole: need.role,
          detail: `Il manque ${ROLE_LABELS[need.role]}.`,
        },
      };
    }
    lines.push(...picked);
  }

  if (archetype.requireAny) {
    const filled = new Set(lines.map((line) => line.role));
    if (!archetype.requireAny.some((role) => filled.has(role))) {
      const missing = archetype.requireAny.map((role) => ROLE_LABELS[role]);
      return {
        failure: {
          reason: 'missing-role',
          archetypeId: archetype.id,
          missingRole: archetype.requireAny[0],
          detail: `Il manque ${missing.join(' ou ')}.`,
        },
      };
    }
  }

  const trimmed =
    filters.maxIngredients === null ? lines : trimToMax(lines, filters.maxIngredients, archetype.needs);
  if (!trimmed || trimmed.length === 0) {
    return {
      failure: {
        reason: 'count',
        archetypeId: archetype.id,
        detail: `Dépasserait ${String(filters.maxIngredients)} ingrédients.`,
      },
    };
  }

  const requiredCount = archetype.needs.filter((need) => need.required).length;
  const stillHasRequired = archetype.needs
    .filter((need) => need.required)
    .every((need) => trimmed.some((line) => line.role === need.role));
  if (!stillHasRequired || trimmed.length < requiredCount) {
    return {
      failure: {
        reason: 'count',
        archetypeId: archetype.id,
        detail: `Dépasserait ${String(filters.maxIngredients)} ingrédients.`,
      },
    };
  }

  const nutrition = nutritionOf(trimmed, filters.servings);
  const health = scoreHealth({
    kind: archetype.kind,
    items: trimmed,
    perServing: nutrition.perServing,
  });
  if (!health.acceptable) {
    return {
      failure: {
        reason: 'unhealthy',
        archetypeId: archetype.id,
        detail: 'Le résultat ne ferait pas une assiette assez saine.',
      },
    };
  }

  const picked: PickedIngredient[] = trimmed;
  const tags = [...new Set([...archetype.baseTagSlugs, ...extraTagSlugs({ items: trimmed, nutrition, healthScore: health.score })])];
  return {
    dish: {
      key: `${archetype.id}:${trimmed.map((line) => line.ingredientId).sort().join('+')}`,
      archetypeId: archetype.id,
      kind: archetype.kind,
      name: archetype.title(picked),
      description: archetype.description(picked),
      servings: filters.servings,
      prepTimeMinutes: archetype.prepTimeMinutes,
      cookTimeMinutes: archetype.cookTimeMinutes,
      healthScore: health.score,
      healthNotes: health.notes,
      ingredients: trimmed,
      steps: archetype.steps(picked),
      tagSlugs: tags,
      equipmentSlugs: [...archetype.equipmentSlugs],
      nutrition,
    },
  };
}

function composeMatching(pool: Usable[], filters: SuggestionFilters): {
  dishes: ComposedDish[];
  failures: Failure[];
} {
  const failures: Failure[] = [];
  const dishes: ComposedDish[] = [];
  for (const archetype of ARCHETYPES) {
    if (filters.kind && archetype.kind !== filters.kind) {
      failures.push({
        reason: 'kind',
        archetypeId: archetype.id,
        detail: 'Type différent.',
      });
      continue;
    }
    const result = composeArchetype(archetype, pool, filters);
    if ('dish' in result) dishes.push(result.dish);
    else failures.push(result.failure);
  }
  dishes.sort((a, b) => b.healthScore - a.healthScore);
  return { dishes, failures };
}

const MAX_SUGGESTIONS = 6;

/** Un de chaque type d'abord, pour ne pas remplir la liste de six poêlées de poulet. */
function diversify(dishes: ComposedDish[]): ComposedDish[] {
  const chosen: ComposedDish[] = [];
  const kinds = new Set<string>();
  for (const dish of dishes) {
    if (!kinds.has(dish.kind)) {
      chosen.push(dish);
      kinds.add(dish.kind);
    }
    if (chosen.length >= MAX_SUGGESTIONS) return chosen;
  }
  for (const dish of dishes) {
    if (chosen.includes(dish)) continue;
    chosen.push(dish);
    if (chosen.length >= MAX_SUGGESTIONS) break;
  }
  return chosen;
}

function presentRoles(pool: Usable[], diet: Diet): Set<CulinaryRole> {
  const roles = new Set<CulinaryRole>();
  for (const item of pool) {
    if (!ingredientAllowed(item.uxCategory, item.nameFr, diet)) continue;
    for (const role of ['protein', 'vegetable', 'starch', 'fat', 'aromatic', 'dairy', 'fruit', 'condiment', 'egg'] as const) {
      if (categoryFitsRole(item.uxCategory, role)) roles.add(role);
    }
  }
  return roles;
}

function missingFromFailures(failures: Failure[]): string[] {
  const roles = new Set<string>();
  for (const failure of failures) {
    if (failure.reason === 'missing-role' && failure.missingRole) {
      roles.add(ROLE_LABELS[failure.missingRole]);
    }
  }
  return [...roles];
}

function explainShortage(pool: Usable[], filters: SuggestionFilters, failures: Failure[]): {
  title: string;
  explanation: string;
  missing: string[];
} {
  if (pool.length === 0) {
    return {
      title: 'Réserves vides',
      explanation:
        'Sans ingrédients en stock, on ne peut pas inventer un plat. Ajoute d’abord ce que tu as dans tes réserves.',
      missing: [],
    };
  }
  const missing = missingFromFailures(failures);
  const roles = presentRoles(pool, filters.diet);
  if (filters.diet !== 'omnivore' && !roles.has('protein') && !roles.has('egg') && !roles.has('vegetable')) {
    return {
      title: 'Rien de compatible',
      explanation: `Avec le filtre ${filters.diet === 'vegan' ? 'vegan' : 'végétarien'}, tes réserves ne couvrent pas une assiette.`,
      missing,
    };
  }
  if (failures.every((failure) => failure.reason === 'time') && filters.maxMinutes !== null) {
    return {
      title: 'Trop court',
      explanation: `Rien ne tient en ${String(filters.maxMinutes)} min avec ce que tu as.`,
      missing,
    };
  }
  if (failures.some((failure) => failure.reason === 'count') && failures.every((failure) => failure.reason === 'count' || failure.reason === 'kind')) {
    return {
      title: 'Trop peu d’ingrédients autorisés',
      explanation: 'Les plats possibles dépassent le nombre d’ingrédients demandé.',
      missing,
    };
  }
  if (missing.length > 0) {
    return {
      title: 'Aucun plat imaginable',
      explanation: `Avec ce stock, il manque ${missing.join(', ')} pour composer un plat sain.`,
      missing,
    };
  }
  return {
    title: 'Aucun plat imaginable',
    explanation: 'Les contraintes (temps, type, régime) ne laissent passer aucun plat honnête avec ce stock.',
    missing,
  };
}

type Relaxation = {
  label: string;
  explanation: string;
  filters: SuggestionFilters;
};

function relaxations(filters: SuggestionFilters): Relaxation[] {
  const next: Relaxation[] = [];
  if (filters.diet !== 'omnivore') {
    next.push({
      label: 'Sans filtre de régime',
      explanation: 'Voici ce qu’on peut faire en élargissant au-delà du végétarien / vegan.',
      filters: { ...filters, diet: 'omnivore' },
    });
  }
  if (filters.maxMinutes !== null) {
    next.push({
      label: 'Sans limite de temps',
      explanation: 'Un plat un peu plus long resterait possible avec tes réserves.',
      filters: { ...filters, maxMinutes: null },
    });
  }
  if (filters.maxIngredients !== null) {
    next.push({
      label: 'Sans limite d’ingrédients',
      explanation: 'En autorisant plus d’ingrédients, un plat se dessine.',
      filters: { ...filters, maxIngredients: null },
    });
  }
  if (filters.kind !== null) {
    next.push({
      label: 'Un autre type de plat',
      explanation: 'Ce type-là ne passe pas, mais un autre plat tient avec le même stock.',
      filters: { ...filters, kind: null },
    });
  }
  if (filters.servings > 1) {
    next.push({
      label: 'Pour une personne',
      explanation: 'Les quantités en stock suffisent pour une portion, pas pour le nombre demandé.',
      filters: { ...filters, servings: 1 },
    });
  }
  return next;
}

/**
 * Propose au plus quelques plats. Rien n'est écrit : le résultat est une
 * suggestion à valider. Si aucun archétype ne se remplit honnêtement, on
 * renvoie la pénurie et, si possible, un plat obtenu en relâchant une seule
 * contrainte — jamais un plat inventé hors stock.
 */
export function suggestDishes(
  pantry: readonly PantryIngredient[],
  filters: SuggestionFilters,
): SuggestionResult {
  const pool = mergeUsable(pantry);
  if (pool.length === 0) {
    return {
      dishes: [],
      shortage: {
        title: 'Réserves vides',
        explanation:
          'Sans ingrédients en stock, on ne peut pas inventer un plat. Ajoute d’abord ce que tu as dans tes réserves.',
        missing: [],
        alternative: null,
      },
    };
  }

  const { dishes, failures } = composeMatching(pool, filters);
  if (dishes.length > 0) {
    return { dishes: diversify(dishes), shortage: null };
  }

  const base = explainShortage(pool, filters, failures);
  for (const attempt of relaxations(filters)) {
    const found = composeMatching(pool, attempt.filters).dishes[0];
    if (found) {
      return {
        dishes: [],
        shortage: {
          ...base,
          alternative: {
            label: attempt.label,
            explanation: attempt.explanation,
            relaxedFilters: attempt.filters,
            dish: found,
          },
        },
      };
    }
  }

  return { dishes: [], shortage: { ...base, alternative: null } };
}

