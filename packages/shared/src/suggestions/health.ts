import type { MacroNutrients, RecipeNutrition } from '../nutrition/macros.js';
import type { DishKind } from './archetypes.js';
import type { CulinaryRole } from './roles.js';
import { ingredientHealth, looksAnimal } from './roles.js';
import type { UxCategory } from '../ciqual/ux-categories.js';

export type HealthInput = {
  kind: DishKind;
  items: ReadonlyArray<{
    role: CulinaryRole;
    uxCategory: UxCategory;
    useGrams: number;
  }>;
  perServing: MacroNutrients;
};

export type HealthResult = {
  score: number;
  notes: string[];
  acceptable: boolean;
};

/**
 * Un plat « sain » ici, ce n'est pas un Nutri-Score : c'est une assiette
 * maison avec des légumes, une protéine identifiable, et peu d'aliments
 * ultra-transformés. Le seuil d'acceptation est volontairement au-dessus
 * d'un steak-frites au bacon, en dessous d'une poêlée de légumes.
 */
export function scoreHealth(input: HealthInput): HealthResult {
  const totalGrams = input.items.reduce((sum, item) => sum + item.useGrams, 0);
  const vegGrams = input.items
    .filter((item) => item.role === 'vegetable' || item.uxCategory === 'VEGETABLES')
    .reduce((sum, item) => sum + item.useGrams, 0);
  const hasVegetable = vegGrams > 30;
  const hasCharcuterie = input.items.some((item) => item.uxCategory === 'CHARCUTERIE');
  const hasLeanProtein = input.items.some(
    (item) =>
      (item.role === 'protein' || item.role === 'egg') &&
      item.uxCategory !== 'CHARCUTERIE' &&
      item.uxCategory !== 'NUTS_SEEDS',
  );
  const hasFishOrLegume = input.items.some(
    (item) => item.uxCategory === 'FISH' || item.uxCategory === 'LEGUMES',
  );
  const breakfast = input.kind === 'petit-dejeuner';

  let score = 50;
  const notes: string[] = [];

  if (totalGrams > 0) {
    const weighted =
      input.items.reduce((sum, item) => sum + ingredientHealth(item.uxCategory) * item.useGrams, 0) /
      totalGrams;
    score += Math.round((weighted - 0.5) * 40);
    const vegShare = vegGrams / totalGrams;
    if (vegShare >= 0.3) {
      score += 12;
      notes.push('Les légumes pèsent dans l’assiette');
    } else if (vegShare >= 0.15) {
      score += 5;
    }
  }

  if (hasVegetable) score += 6;
  else if (!breakfast) {
    score -= 12;
  }

  if (hasLeanProtein) {
    score += 8;
    notes.push('Protéine identifiable');
  }
  if (hasFishOrLegume) {
    score += 6;
    notes.push(input.items.some((item) => item.uxCategory === 'FISH') ? 'Poisson' : 'Légumineuses');
  }
  if (hasCharcuterie) {
    score -= 18;
    notes.push('Charcuterie : moins intéressant nutritionnellement');
  }

  const kcal = input.perServing.kcal;
  if (kcal >= 350 && kcal <= 900) score += 4;
  if (kcal > 1100) score -= 10;
  if (input.perServing.protein >= 20) {
    score += 6;
    notes.push('Portions de protéines correctes');
  }
  if (kcal > 0 && (input.perServing.fat * 9) / kcal > 0.45) score -= 8;
  if (input.perServing.fiber !== null && input.perServing.fiber >= 6) {
    score += 5;
    notes.push('Apport de fibres');
  }

  score = Math.max(0, Math.min(100, score));
  // Une salade de courgette à 20 kcal est saine sur le papier, ce n'est pas un plat.
  const tooLight = breakfast ? kcal < 70 : kcal < 90;
  const acceptable = !tooLight && (breakfast ? score >= 38 : score >= 47);
  if (score >= 70 && !notes.some((note) => note.startsWith('Les légumes'))) {
    notes.unshift('Assiette plutôt équilibrée');
  }
  return { score, notes: notes.slice(0, 3), acceptable };
}

export function extraTagSlugs(input: {
  items: ReadonlyArray<{ uxCategory: UxCategory; nameFr?: string }>;
  nutrition: RecipeNutrition;
  healthScore: number;
}): string[] {
  const slugs: string[] = [];
  const animal = input.items.some(
    (item) =>
      item.uxCategory === 'MEATS' ||
      item.uxCategory === 'FISH' ||
      item.uxCategory === 'SEAFOOD' ||
      item.uxCategory === 'CHARCUTERIE' ||
      Boolean(item.nameFr && looksAnimal(item.nameFr)),
  );
  const veganIncompatible =
    animal ||
    input.items.some(
      (item) =>
        item.uxCategory === 'EGGS' || item.uxCategory === 'DAIRY' || item.uxCategory === 'CHEESES',
    );
  if (!animal) slugs.push('vegetarien');
  if (!veganIncompatible) slugs.push('vegan');
  if (input.healthScore >= 68) slugs.push('healthy');
  if (input.nutrition.perServing.protein >= 25) slugs.push('proteine');
  return slugs;
}
