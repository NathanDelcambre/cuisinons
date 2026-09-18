import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { recipeWriteSchema } from '../src/recipes/recipe-write.js';
import { publicRecipePhotoUrl } from '../src/recipes/recipe-photo.js';
import { nutritionFromSnapshot } from '@cuisinons/db';

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

  it('sert le PNG d’une idée healthy', () => {
    expect(publicRecipePhotoUrl('official-h42', null, new Date())).toBe('/recipes/official-h42.png');
  });
});

describe('frontière CJS Prisma / ESM shared', () => {
  it('le client @cuisinons/db chargé par l’API ne require pas shared', () => {
    const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../../../packages/db/dist');
    const index = readFileSync(resolve(dist, 'index.js'), 'utf8');
    const snapshot = readFileSync(resolve(dist, 'recipe-nutrition.js'), 'utf8');
    expect(index).not.toMatch(/@cuisinons\/shared/);
    expect(snapshot).not.toMatch(/@cuisinons\/shared/);
  });
});

describe('snapshot macros', () => {
  it('lit un snapshot JSON dénormalisé', () => {
    const snapshot = nutritionFromSnapshot({
      perServing: { kcal: 400, protein: 16, carbs: 40, fat: 10, fiber: 8 },
      per100g: null,
      complete: true,
    });
    expect(snapshot?.perServing.protein).toBe(16);
    expect(nutritionFromSnapshot(null)).toBeNull();
  });
});
