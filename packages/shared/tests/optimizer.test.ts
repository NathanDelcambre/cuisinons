import { describe, expect, it } from 'vitest';
import { optimizeDay } from '../src/optimization/engine.js';
import type { MacroNutrients } from '../src/nutrition/macros.js';
import { mapCiqualToUxCategory } from '../src/ciqual/ux-categories.js';

const chicken: MacroNutrients = {
  kcal: 165,
  protein: 31,
  carbs: 0,
  fat: 3.6,
  fiber: 0,
};

const rice: MacroNutrients = {
  kcal: 130,
  protein: 2.7,
  carbs: 28,
  fat: 0.3,
  fiber: 0.4,
};

const yogurt: MacroNutrients = {
  kcal: 60,
  protein: 10,
  carbs: 4,
  fat: 0.4,
  fiber: 0,
};

describe('optimizer', () => {
  it('augmente les portions pour atteindre un AT_LEAST protéines', () => {
    const result = optimizeDay({
      meals: [
        {
          id: 'm1',
          recipeId: 'r1',
          recipeName: 'Poulet curry',
          slot: 'LUNCH',
          portions: 1,
          perServing: chicken,
          nutritionComplete: true,
        },
        {
          id: 'm2',
          recipeId: 'r2',
          recipeName: 'Riz',
          slot: 'DINNER',
          portions: 1,
          perServing: rice,
          nutritionComplete: true,
        },
      ],
      emptySlots: ['SNACK'],
      recipes: [
        {
          id: 'r3',
          name: 'Skyr fruits rouges',
          tags: ['gouter'],
          perServing: yogurt,
          nutritionComplete: true,
        },
      ],
      goals: {
        calories: { mode: 'NONE', value: null, tolerance: null },
        protein: { mode: 'AT_LEAST', value: 50, tolerance: null },
        carbs: { mode: 'AT_MOST', value: 80, tolerance: null },
        fat: { mode: 'AT_MOST', value: 20, tolerance: null },
      },
      prefs: {
        minPortionMultiplier: 0.5,
        maxPortionMultiplier: 2,
        allowAutoAdd: true,
      },
    });
    expect(result.after.protein).toBeGreaterThanOrEqual(50);
    expect(result.after.fat).toBeLessThanOrEqual(20);
    expect(result.penaltyAfter).toBeLessThanOrEqual(result.penaltyBefore);
  });

  it('n’invente pas de macros pour une recette incomplète', () => {
    const result = optimizeDay({
      meals: [
        {
          id: 'm1',
          recipeId: 'r1',
          recipeName: 'Incomplet',
          slot: 'LUNCH',
          portions: 1,
          perServing: chicken,
          nutritionComplete: false,
        },
      ],
      emptySlots: [],
      recipes: [],
      goals: {
        calories: { mode: 'NONE', value: null, tolerance: null },
        protein: { mode: 'AT_LEAST', value: 140, tolerance: null },
        carbs: { mode: 'NONE', value: null, tolerance: null },
        fat: { mode: 'NONE', value: null, tolerance: null },
      },
      prefs: { minPortionMultiplier: 0.5, maxPortionMultiplier: 2, allowAutoAdd: false },
    });
    expect(result.excludedIncomplete).toBe(1);
    expect(result.portionChanges).toHaveLength(0);
  });
});

describe('ciqual UX mapping', () => {
  it('mappe les groupes Ciqual vers des catégories simples', () => {
    expect(mapCiqualToUxCategory({ groupName: 'Viandes cuites' })).toBe('MEATS');
    expect(mapCiqualToUxCategory({ groupName: 'Fromages' })).toBe('CHEESES');
    expect(mapCiqualToUxCategory({ groupName: 'Légumes' })).toBe('VEGETABLES');
    expect(mapCiqualToUxCategory({ groupName: 'Inconnu spatial' })).toBe('OTHER');
  });
});
