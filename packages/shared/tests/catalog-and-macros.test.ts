import { describe, expect, it } from 'vitest';
import { parseStepMentions, insertIngredientToken, scaleMentionQuantity, mentionTooltip } from '../src/recipes/step-mentions.js';
import { compareRecipesForSlot } from '../src/planner/slot-tags.js';
import { weekMacroAverages } from '../src/nutrition/planned-consumed.js';
import { aggregateUserStats } from '../src/nutrition/stats.js';
import { buildHealthyOfficialSpecs, HEALTHY_INGREDIENTS, HEALTHY_OFFICIAL_COUNT, OFFICIAL_RECIPE_COUNT, HANDCRAFTED_OFFICIAL_COUNT, IDEAS_RECIPE_IDS, IDEAS_RECIPE_COUNT, isIdeasRecipeId, isPreparedFoodName, pickHealthyIngredient } from '../src/suggestions/official-healthy.js';
import { HEALTHY_RECIPES } from '../src/suggestions/catalog.js';
import { DISH_KINDS } from '../src/suggestions/kinds.js';
import { categoryIconUrl } from '../src/ciqual/category-icons.js';

describe('mentions d’ingrédients dans les étapes', () => {
  it('parse les tokens sans HTML', () => {
    const parts = parseStepMentions('Faire revenir [[ing:abc]] avec [[ing:def]].');
    expect(parts).toEqual([
      { type: 'text', value: 'Faire revenir ' },
      { type: 'ingredient', id: 'abc' },
      { type: 'text', value: ' avec ' },
      { type: 'ingredient', id: 'def' },
      { type: 'text', value: '.' },
    ]);
  });

  it('insère un token à la place du slash', () => {
    const next = insertIngredientToken('Cuire /', 7, 'ing-1');
    expect(next.text).toBe('Cuire [[ing:ing-1]]');
  });

  it('met à l’échelle la quantité selon les portions', () => {
    expect(scaleMentionQuantity(100, 1.5)).toBe(150);
    expect(
      mentionTooltip({ id: 'x', name: 'Poulet', quantity: 100, unitLabel: 'g' }, 0.5),
    ).toContain('50');
  });
});

describe('priorité des tags par créneau', () => {
  it('classe le goûter avant un plat principal pour SNACK', () => {
    const snack = { name: 'Skyr', tags: ['gouter'] };
    const main = { name: 'Bowl', tags: ['plat-principal'] };
    expect(compareRecipesForSlot(snack, main, 'SNACK')).toBeLessThan(0);
  });

  it('classe le petit-déjeuner en premier pour BREAKFAST', () => {
    const breakfast = { name: 'Porridge', tags: ['petit-dejeuner'] };
    const salad = { name: 'Salade', tags: ['salade'] };
    expect(compareRecipesForSlot(breakfast, salad, 'BREAKFAST')).toBeLessThan(0);
  });
});

describe('macros prévues vs consommées', () => {
  const serving = { kcal: 200, protein: 20, carbs: 10, fat: 5, fiber: 0 };

  it('divise la semaine par 7 et ignore les portions à 0', () => {
    const result = weekMacroAverages({
      userId: 'n',
      todayIso: '2026-09-18',
      meals: [
        {
          date: '2026-09-14',
          perServing: serving,
          portions: [
            { userId: 'n', portions: 1, consumedAt: '2026-09-14T12:00:00Z' },
            { userId: 'j', portions: 1 },
          ],
        },
        {
          date: '2026-09-18',
          perServing: serving,
          portions: [{ userId: 'n', portions: 0 }],
        },
      ],
    });
    expect(result.planned.kcal).toBeCloseTo(200 / 7);
    expect(result.consumed.kcal).toBeCloseTo(200 / 7);
  });
});

describe('statistiques nutrition', () => {
  it('désigne la recette la plus fréquente par créneau', () => {
    const serving = { kcal: 100, protein: 10, carbs: 10, fat: 2, fiber: 0 };
    const stats = aggregateUserStats({
      userId: 'n',
      displayName: 'Nathan',
      todayIso: '2026-09-18',
      days: 7,
      meals: [
        {
          date: '2026-09-14',
          slot: 'SNACK',
          recipeId: 'skyr',
          recipeName: 'Skyr',
          perServing: serving,
          portions: [{ userId: 'n', portions: 1, consumedAt: '2026-09-14T16:00:00Z' }],
        },
        {
          date: '2026-09-15',
          slot: 'SNACK',
          recipeId: 'skyr',
          recipeName: 'Skyr',
          perServing: serving,
          portions: [{ userId: 'n', portions: 1, consumedAt: '2026-09-15T16:00:00Z' }],
        },
        {
          date: '2026-09-16',
          slot: 'SNACK',
          recipeId: 'cake',
          recipeName: 'Cake',
          perServing: serving,
          portions: [{ userId: 'n', portions: 1 }],
        },
      ],
    });
    expect(stats.favorites.find((f) => f.slot === 'SNACK')?.recipeName).toBe('Skyr');
  });
});

describe('catalogue healthy officiel', () => {
  it('produit une fiche par spec, avec au moins 2 ingrédients', () => {
    const specs = buildHealthyOfficialSpecs();
    expect(HEALTHY_RECIPES).toHaveLength(200);
    expect(specs).toHaveLength(HEALTHY_OFFICIAL_COUNT);
    expect(OFFICIAL_RECIPE_COUNT).toBe(HANDCRAFTED_OFFICIAL_COUNT + HEALTHY_OFFICIAL_COUNT);
    expect(new Set(specs.map((s) => s.id)).size).toBe(200);
    expect(specs.every((s) => s.id.startsWith('official-h'))).toBe(true);
    expect(specs.every((s) => s.ingredients.length >= 2)).toBe(true);
    expect(specs.every((s) => s.tagSlugs.includes('healthy'))).toBe(true);
    expect(specs.every((s) => DISH_KINDS.some((kind) => s.tagSlugs.includes(kind)))).toBe(true);
    expect(specs.every((s) => s.steps.length >= 2)).toBe(true);
    expect(OFFICIAL_RECIPE_COUNT).toBe(222);
    expect(IDEAS_RECIPE_IDS).toHaveLength(200);
    expect(IDEAS_RECIPE_COUNT).toBe(200);
    expect(IDEAS_RECIPE_IDS.every((id) => id.startsWith('official-h'))).toBe(true);
    expect(isIdeasRecipeId('official-h01')).toBe(true);
    expect(isIdeasRecipeId('official-vinaigrette-crudites')).toBe(false);
    expect(specs.every((s) => s.servings === 2)).toBe(true);
    const meatKeys = new Set([
      'chicken',
      'turkey',
      'pork',
      'salmon',
      'cod',
      'hake',
      'pollock',
      'trout',
      'tuna',
      'sardine',
      'mackerel',
    ]);
    for (const spec of specs) {
      const meat = spec.ingredients.find((line) => meatKeys.has(line.key));
      if (!meat) continue;
      const perPerson = meat.grams / spec.servings;
      expect(perPerson).toBeGreaterThanOrEqual(100);
      expect(perPerson).toBeLessThanOrEqual(150);
    }
    expect(specs.some((s) => s.tagSlugs.includes('petit-dejeuner') && s.tagSlugs.includes('gouter'))).toBe(
      true,
    );
    const lentilSoup = specs.find((s) => s.id === 'official-h98');
    expect(lentilSoup?.ingredients.find((line) => line.key === 'lentils')?.grams).toBe(280);
    expect(Object.values(HEALTHY_INGREDIENTS).every((ref) => ref.code != null && ref.code > 0)).toBe(true);
  });

  it('ignore les plats Ciqual tout-prêts au matching par nom', () => {
    expect(isPreparedFoodName('soupe a la carotte preemballee a rechauffer')).toBe(true);
    expect(isPreparedFoodName('carotte crue')).toBe(false);
    const picked = pickHealthyIngredient(
      [
        { ciqualCode: 25913, nameNormalized: 'soupe a la carotte preemballee a rechauffer' },
        { ciqualCode: 20009, nameNormalized: 'carotte crue' },
      ],
      { key: 'carrot', code: null, names: ['carotte'] },
    );
    expect(picked?.ciqualCode).toBe(20009);
  });
});

describe('icônes de catégories', () => {
  it('pointe vers /ingredients/cat-*.svg', () => {
    expect(categoryIconUrl('VEGETABLES')).toBe('/ingredients/cat-legumes.svg');
    expect(categoryIconUrl('INCONNU')).toBe('/ingredients/cat-autres.svg');
  });
});
