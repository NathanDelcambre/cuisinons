import { describe, expect, it } from 'vitest';
import { recipeWriteSchema } from '../src/recipes/recipe-write.js';
import { publicRecipePhotoUrl } from '../src/recipes/recipe-photo.js';

const base = {
  name: 'Test',
  servings: 2,
  steps: [{ description: 'Cuire.' }],
  tagIds: [],
  equipmentIds: [],
};

describe('création de recette', () => {
  it('refuse 0 ingrédient', () => {
    const result = recipeWriteSchema.safeParse({ ...base, ingredients: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/deux ingrédients/i);
    }
  });

  it('refuse 1 ingrédient', () => {
    const result = recipeWriteSchema.safeParse({
      ...base,
      ingredients: [{ ingredientId: 'a', quantity: 1, unit: 'G' }],
    });
    expect(result.success).toBe(false);
  });

  it('refuse deux fois le même ingrédient', () => {
    const result = recipeWriteSchema.safeParse({
      ...base,
      ingredients: [
        { ingredientId: 'a', quantity: 1, unit: 'G' },
        { ingredientId: 'a', quantity: 2, unit: 'G' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepte 2 ingrédients distincts', () => {
    const result = recipeWriteSchema.safeParse({
      ...base,
      ingredients: [
        { ingredientId: 'a', quantity: 1, unit: 'G' },
        { ingredientId: 'b', quantity: 2, unit: 'G' },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('photo publique', () => {
  it('laisse passer un chemin /recipes/ pour une recette perso', () => {
    expect(publicRecipePhotoUrl('id', '/recipes/salad.svg', new Date())).toBe('/recipes/salad.svg');
  });

  it('sert le PNG officiel même si la base pointe encore vers un SVG', () => {
    expect(publicRecipePhotoUrl('official-h01', '/recipes/oven.svg', new Date())).toBe('/recipes/official-h01.png');
  });
});
