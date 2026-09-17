import { describe, expect, it } from 'vitest';
import { culinaryName, complementDe, foldText, joinFrench } from '../src/suggestions/names.js';
import { HEALTHY_RECIPES } from '../src/suggestions/catalog.js';
import {
  DEFAULT_SUGGESTION_FILTERS,
  suggestDishes,
  type PantryIngredient,
  type SuggestionFilters,
} from '../src/suggestions/compose.js';
import type { UxCategory } from '../src/ciqual/ux-categories.js';
import type { QuantityUnit } from '../src/nutrition/units.js';

function item(
  id: string,
  nameFr: string,
  uxCategory: UxCategory,
  quantity: number,
  macros: { kcal: number; protein: number; carbs: number; fat: number; fiber?: number },
  unit: QuantityUnit = 'G',
): PantryIngredient {
  return {
    ingredientId: id,
    nameFr,
    iconUrl: null,
    uxCategory,
    quantity,
    unit,
    conversions: [],
    energyKcal: macros.kcal,
    proteinG: macros.protein,
    carbG: macros.carbs,
    fatG: macros.fat,
    fiberG: macros.fiber ?? 2,
  };
}

const chicken = item('chicken', 'Poulet, filet, cru', 'MEATS', 400, {
  kcal: 110,
  protein: 23,
  carbs: 0,
  fat: 2,
});
const zucchini = item('zucchini', 'Courgette, crue', 'VEGETABLES', 500, {
  kcal: 17,
  protein: 1,
  carbs: 3,
  fat: 0,
  fiber: 1,
});
const onion = item('onion', 'Oignon cru', 'AROMATICS', 150, {
  kcal: 40,
  protein: 1,
  carbs: 8,
  fat: 0,
});
const oil = item('oil', "Huile d'olive vierge", 'FATS', 80, {
  kcal: 884,
  protein: 0,
  carbs: 0,
  fat: 100,
  fiber: 0,
});
const rice = item('rice', 'Riz blanc cuit', 'CEREALS', 400, {
  kcal: 130,
  protein: 2.5,
  carbs: 28,
  fat: 0.3,
});
const pasta = item('pasta', 'Pâtes sèches', 'CEREALS', 400, {
  kcal: 350,
  protein: 12,
  carbs: 70,
  fat: 2,
});
const eggs = item(
  'eggs',
  'Œuf de poule, cru',
  'EGGS',
  6,
  { kcal: 140, protein: 12, carbs: 1, fat: 10 },
  'PIECE',
);
const yogurt = item('yogurt', 'Yaourt nature', 'DAIRY', 250, {
  kcal: 60,
  protein: 4,
  carbs: 5,
  fat: 3,
});
const banana = item('banana', 'Banane', 'FRUITS', 200, {
  kcal: 90,
  protein: 1,
  carbs: 21,
  fat: 0,
  fiber: 2,
});
const oats = item('oats', "Flocons d'avoine", 'CEREALS', 300, {
  kcal: 370,
  protein: 13,
  carbs: 56,
  fat: 7,
  fiber: 10,
});
const bacon = item('bacon', 'Lardons fumés', 'CHARCUTERIE', 200, {
  kcal: 280,
  protein: 15,
  carbs: 1,
  fat: 24,
});

function filters(overrides: Partial<SuggestionFilters> = {}): SuggestionFilters {
  return { ...DEFAULT_SUGGESTION_FILTERS, ...overrides };
}

describe('noms de plat', () => {
  it('retire les précisions Ciqual', () => {
    expect(culinaryName('Poulet, filet, cru')).toBe('poulet');
    expect(culinaryName('Crème fraîche épaisse 30% MG')).toBe('crème fraîche épaisse');
    expect(foldText('Œuf de poule')).toContain('oeuf');
  });

  it('construit un complément sans se tromper de genre', () => {
    expect(complementDe('poulet')).toBe('de poulet');
    expect(complementDe('oignon')).toBe('d’oignon');
    expect(joinFrench(['courgette', 'poivron'])).toBe('courgette et poivron');
  });
});

describe('compositeur de plats', () => {
  it('propose une poêlée quand le stock couvre protéine et légume', () => {
    const { dishes, shortage } = suggestDishes([chicken, zucchini, onion, oil], filters());
    expect(shortage).toBeNull();
    expect(dishes.length).toBeGreaterThan(0);
    const poelee = dishes.find((dish) => dish.kind === 'poelee');
    expect(poelee?.name.toLowerCase()).toContain('poulet');
    expect(poelee?.name.toLowerCase()).toContain('courgette');
    expect(poelee?.ingredients.every((line) => line.useGrams <= 500)).toBe(true);
  });

  it('ne dépasse jamais le stock', () => {
    const smallChicken = { ...chicken, quantity: 80 };
    const { dishes } = suggestDishes([smallChicken, zucchini], filters({ servings: 1 }));
    for (const dish of dishes) {
      const used = dish.ingredients.find((line) => line.ingredientId === 'chicken');
      if (used) expect(used.useGrams).toBeLessThanOrEqual(80);
    }
  });

  it('n’utilise pas de viande dans un plat végétarien', () => {
    const { dishes } = suggestDishes([chicken, zucchini, oil], filters({ diet: 'vegetarian' }));
    expect(dishes.every((dish) => dish.ingredients.every((line) => line.ingredientId !== 'chicken'))).toBe(
      true,
    );
  });

  it('refuse un plat végétarien s’il n’y a que du poulet', () => {
    const { dishes, shortage } = suggestDishes([chicken, zucchini], filters({ diet: 'vegetarian' }));
    expect(dishes).toEqual([]);
    expect(shortage).not.toBeNull();
    expect(shortage?.alternative?.relaxedFilters.diet).toBe('omnivore');
    expect(shortage?.alternative?.dish.ingredients.some((line) => line.ingredientId === 'chicken')).toBe(
      true,
    );
  });

  it('propose une omelette avec des œufs, pas un plat vegan', () => {
    const { dishes } = suggestDishes([eggs, zucchini, oil], filters({ diet: 'vegetarian' }));
    expect(dishes.some((dish) => dish.kind === 'omelette')).toBe(true);
    const vegan = suggestDishes([eggs, zucchini, oil], filters({ diet: 'vegan' }));
    expect(vegan.dishes.every((dish) => dish.kind !== 'omelette')).toBe(true);
  });

  it('écarte un gratin si le temps max est trop court', () => {
    const { dishes } = suggestDishes(
      [zucchini, yogurt, chicken],
      filters({ maxMinutes: 15, kind: 'gratin' }),
    );
    expect(dishes).toEqual([]);
    const relaxed = suggestDishes(
      [zucchini, yogurt, chicken],
      filters({ maxMinutes: 15, kind: 'gratin' }),
    );
    expect(relaxed.shortage?.alternative?.relaxedFilters.maxMinutes).toBeNull();
  });

  it('respecte un plafond d’ingrédients', () => {
    const { dishes } = suggestDishes(
      [chicken, zucchini, onion, oil, rice],
      filters({ maxIngredients: 2, kind: 'poelee' }),
    );
    for (const dish of dishes) {
      expect(dish.ingredients.length).toBeLessThanOrEqual(2);
    }
  });

  it('ne propose rien si les réserves sont vides, sans alternative inventée', () => {
    const { dishes, shortage } = suggestDishes([], filters());
    expect(dishes).toEqual([]);
    expect(shortage?.title).toMatch(/vides/i);
    expect(shortage?.alternative).toBeNull();
  });

  it('reconnaît pâtes et riz par le nom, pas seulement la catégorie', () => {
    const withPasta = suggestDishes([pasta, zucchini, chicken], filters({ kind: 'pates' }));
    expect(withPasta.dishes.some((dish) => dish.kind === 'pates')).toBe(true);
    const riceAsPasta = suggestDishes([rice, zucchini, chicken], filters({ kind: 'pates' }));
    expect(riceAsPasta.dishes).toEqual([]);
    const withRice = suggestDishes([rice, zucchini, chicken], filters({ kind: 'riz' }));
    expect(withRice.dishes.some((dish) => dish.kind === 'riz')).toBe(true);
  });

  it('assemble un petit-déjeuner fruit + laitier ou céréale', () => {
    const { dishes } = suggestDishes([banana, yogurt, oats], filters({ kind: 'petit-dejeuner' }));
    expect(dishes[0]?.kind).toBe('petit-dejeuner');
    const fruitOnly = suggestDishes([banana], filters({ kind: 'petit-dejeuner' }));
    expect(fruitOnly.dishes).toEqual([]);
  });

  it('préfère une protéine saine à la charcuterie quand les deux sont là', () => {
    const { dishes } = suggestDishes([chicken, bacon, zucchini], filters({ kind: 'poelee' }));
    const protein = dishes[0]?.ingredients.find((line) => line.role === 'protein');
    expect(protein?.ingredientId).toBe('chicken');
  });

  it('ne prend pas un poulet mal catégorisé pour une omelette', () => {
    const mislabelled = item('chicken-eggs', 'Poulet, filet sans peau cru', 'EGGS', 400, {
      kcal: 110,
      protein: 23,
      carbs: 0,
      fat: 2,
    });
    const { dishes } = suggestDishes([mislabelled, zucchini], filters({ kind: 'omelette' }));
    expect(dishes).toEqual([]);
    const vegetarian = suggestDishes([mislabelled, zucchini, oil], filters({ diet: 'vegetarian' }));
    expect(
      vegetarian.dishes.every((dish) => dish.ingredients.every((line) => line.ingredientId !== 'chicken-eggs')),
    ).toBe(true);
  });

  it('compte 100 recettes healthy recensées', () => {
    expect(HEALTHY_RECIPES).toHaveLength(100);
    expect(new Set(HEALTHY_RECIPES.map((spec) => spec.id)).size).toBe(100);
  });

  it('propose un plat saumon quand le stock en contient', () => {
    const salmon = item('salmon', 'Saumon, cru', 'FISH', 400, {
      kcal: 180,
      protein: 20,
      carbs: 0,
      fat: 12,
      fiber: 0,
    });
    const { dishes } = suggestDishes([salmon, zucchini, oil], filters());
    expect(dishes.some((dish) => dish.archetypeId.includes('saumon') || /saumon/i.test(dish.name))).toBe(true);
  });
});
