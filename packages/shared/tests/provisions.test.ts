import { describe, expect, it } from 'vitest';
import {
  aggregateQuantities,
  bulkPieceSuggestion,
  canonicalQuantity,
  portionRequirement,
  roundForPurchase,
  subtractStock,
} from '../src/provisions/quantities.js';
import { defaultStorageArea } from '../src/provisions/storage.js';

describe('unite de reference', () => {
  it('ramene les masses au gramme et les volumes au millilitre', () => {
    expect(canonicalQuantity(1.5, 'KG')).toEqual({ quantity: 1500, unit: 'G' });
    expect(canonicalQuantity(2, 'L')).toEqual({ quantity: 2000, unit: 'ML' });
    expect(canonicalQuantity(3, 'CL')).toEqual({ quantity: 30, unit: 'ML' });
    expect(canonicalQuantity(2, 'TBSP')).toEqual({ quantity: 30, unit: 'ML' });
  });

  it('laisse intactes les unites sans equivalent metrique', () => {
    expect(canonicalQuantity(3, 'PIECE')).toEqual({ quantity: 3, unit: 'PIECE' });
    expect(canonicalQuantity(1, 'PINCH')).toEqual({ quantity: 1, unit: 'PINCH' });
  });
});

describe('cumul des besoins', () => {
  it('additionne un meme ingredient exprime dans deux unites de la meme famille', () => {
    const lines = aggregateQuantities([
      { ingredientId: 'farine', quantity: 250, unit: 'G' },
      { ingredientId: 'farine', quantity: 0.5, unit: 'KG' },
    ]);
    expect(lines).toEqual([{ ingredientId: 'farine', quantity: 750, unit: 'G' }]);
  });

  it('garde deux lignes quand les unites ne sont pas convertibles', () => {
    const lines = aggregateQuantities([
      { ingredientId: 'oeuf', quantity: 2, unit: 'PIECE' },
      { ingredientId: 'oeuf', quantity: 100, unit: 'G' },
    ]);
    expect(lines).toHaveLength(2);
  });

  it('ignore les quantites nulles ou negatives', () => {
    expect(aggregateQuantities([{ ingredientId: 'sel', quantity: 0, unit: 'G' }])).toEqual([]);
  });
});

describe('deduction du stock', () => {
  it('ne liste que ce qui manque', () => {
    const missing = subtractStock(
      [
        { ingredientId: 'farine', quantity: 500, unit: 'G' },
        { ingredientId: 'lait', quantity: 1000, unit: 'ML' },
      ],
      [
        { ingredientId: 'farine', quantity: 200, unit: 'G' },
        { ingredientId: 'lait', quantity: 2, unit: 'L' },
      ],
    );
    expect(missing).toEqual([{ ingredientId: 'farine', quantity: 300, unit: 'G' }]);
  });

  it('ne produit jamais de quantite negative', () => {
    const missing = subtractStock(
      [{ ingredientId: 'riz', quantity: 100, unit: 'G' }],
      [{ ingredientId: 'riz', quantity: 900, unit: 'G' }],
    );
    expect(missing).toEqual([]);
  });
});

describe('quantite a acheter', () => {
  it('arrondit au-dessus ce qui se vend a l’unite', () => {
    expect(roundForPurchase(1.2, 'PIECE')).toBe(2);
    expect(roundForPurchase(0.3, 'SACHET')).toBe(1);
  });

  it('arrondit les masses au gramme superieur', () => {
    expect(roundForPurchase(333.4, 'G')).toBe(334);
  });
});

describe('équivalent vrac', () => {
  it('traduit 200 g de poivron en deux pièces estimées', () => {
    expect(
      bulkPieceSuggestion({
        quantity: 200,
        unit: 'G',
        category: 'VEGETABLES',
        gramsPerPiece: 150,
      }),
    ).toEqual({ quantity: 2, unit: 'PIECE', label: 'Vrac : environ 2 unités' });
  });

  it('ne propose pas de pièces pour les céréales', () => {
    expect(
      bulkPieceSuggestion({ quantity: 200, unit: 'G', category: 'CEREALS', gramsPerPiece: 150 }),
    ).toBeNull();
  });
});

describe('besoin d’un convive', () => {
  it('proratise sur le nombre de portions', () => {
    const need = portionRequirement(
      { ingredientId: 'farine', quantity: 2, unit: 'PIECE', grams: 400 },
      4,
      2,
    );
    expect(need).toEqual({ ingredientId: 'farine', quantity: 200, unit: 'G' });
  });

  it('retombe sur l’unite saisie quand le gramme est inconnu', () => {
    const need = portionRequirement(
      { ingredientId: 'oeuf', quantity: 4, unit: 'PIECE', grams: null },
      2,
      1,
    );
    expect(need).toEqual({ ingredientId: 'oeuf', quantity: 2, unit: 'PIECE' });
  });

  it('ignore une portion nulle', () => {
    expect(
      portionRequirement({ ingredientId: 'x', quantity: 1, unit: 'G', grams: 1 }, 2, 0),
    ).toBeNull();
  });
});

describe('zone de rangement par defaut', () => {
  it('met au frigo ce qui s’y conserve', () => {
    expect(defaultStorageArea('DAIRY')).toBe('FRIDGE');
    expect(defaultStorageArea('MEATS')).toBe('FRIDGE');
    expect(defaultStorageArea('VEGETABLES')).toBe('FRIDGE');
  });

  it('met le reste au placard', () => {
    expect(defaultStorageArea('CEREALS')).toBe('PANTRY');
    expect(defaultStorageArea('SPICES')).toBe('PANTRY');
  });

  it('ne devine jamais une habitude personnelle', () => {
    // Congelateur et petit dejeuner ne se deduisent pas de l'aliment.
    for (const category of ['DAIRY', 'CEREALS', 'BAKERY', 'OTHER'] as const) {
      expect(['FREEZER', 'BREAKFAST']).not.toContain(defaultStorageArea(category));
    }
  });
});
