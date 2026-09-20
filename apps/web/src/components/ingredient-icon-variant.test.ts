import { describe, expect, it } from 'vitest';
import { ingredientIconVariant } from './ingredient-icon-variant';

describe('ingredientIconVariant', () => {
  it.each([
    ['Petits pois surgelés', 'frozen'],
    ['Tomates appertisées, égouttées', 'canned'],
    ['Champignon séché', 'dried'],
    ['Amande en poudre', 'powder'],
    ['Carotte cuite à la vapeur', 'cooked'],
    ['Concombre cru', 'raw'],
  ] as const)('détecte %s', (name, expected) => {
    expect(ingredientIconVariant(name)).toBe(expected);
  });

  it('ne décore pas un ingrédient sans état explicite', () => {
    expect(ingredientIconVariant('Feta')).toBeNull();
  });
});
