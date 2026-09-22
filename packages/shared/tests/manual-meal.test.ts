import { describe, expect, it } from 'vitest';
import { manualMealName } from '../src/planner/manual-meal.js';

describe('nom des repas manuels', () => {
  it('garde les trois ingrédients les plus importants', () => {
    expect(
      manualMealName([
        { nameFr: 'Persil frais', grams: 5, quantity: 5 },
        { nameFr: 'Saumon cru', grams: 180, quantity: 180 },
        { nameFr: 'Riz cuit', grams: 140, quantity: 140 },
        { nameFr: 'Courgette', grams: 100, quantity: 100 },
      ]),
    ).toBe('Saumon & Riz & Courgette');
  });

  it('retombe sur la quantité et évite les doublons', () => {
    expect(
      manualMealName([
        { nameFr: 'Tomate crue', quantity: 2 },
        { nameFr: 'Tomate crue', quantity: 1 },
        { nameFr: 'Œuf, cru', quantity: 3 },
      ]),
    ).toBe('Œuf & Tomate');
  });
});
