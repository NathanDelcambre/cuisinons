import { describe, expect, it } from 'vitest';
import { formatQuantity, parseQuantity } from '../src/nutrition/fractions.js';
import { computeRecipeNutrition } from '../src/nutrition/macros.js';
import { parseCiqualNutrient, nutrientAmountForMath } from '../src/nutrition/nutrient-value.js';
import { resolveGrams } from '../src/nutrition/conversions.js';
import { estimateDailyMacros } from '../src/nutrition/body-estimate.js';

describe('fractions', () => {
  it('parse 1/2, 0,5 et mixte', () => {
    expect(parseQuantity('1/2')).toBeCloseTo(0.5);
    expect(parseQuantity('0,5')).toBeCloseTo(0.5);
    expect(parseQuantity('1 1/2')).toBeCloseTo(1.5);
    expect(parseQuantity('2/3')).toBeCloseTo(2 / 3);
  });

  it('formate vers une fraction lisible', () => {
    expect(formatQuantity(0.5)).toBe('1/2');
    expect(formatQuantity(1.25)).toBe('1 1/4');
  });
});

describe('nutrient values', () => {
  it('ne transforme jamais une inconnue en 0', () => {
    expect(parseCiqualNutrient('-')).toEqual({ kind: 'NA' });
    expect(parseCiqualNutrient('traces')).toEqual({ kind: 'TRACES' });
    expect(parseCiqualNutrient('< 0,5')).toEqual({ kind: 'LESS_THAN', amount: 0.5 });
    expect(nutrientAmountForMath({ kind: 'NA' })).toBeNull();
    expect(nutrientAmountForMath({ kind: 'TRACES' })).toBeNull();
    expect(nutrientAmountForMath({ kind: 'VALUE', amount: 12 })).toBe(12);
  });
});

describe('macros', () => {
  it('calcule total, portion et 100 g', () => {
    const result = computeRecipeNutrition(
      [
        {
          grams: 150,
          energyKcalPer100g: 110,
          proteinPer100g: 23,
          carbsPer100g: 0,
          fatPer100g: 2,
          fiberPer100g: 0,
        },
        {
          grams: 120,
          energyKcalPer100g: 130,
          proteinPer100g: 2.7,
          carbsPer100g: 28,
          fatPer100g: 0.3,
          fiberPer100g: 0.4,
        },
      ],
      2,
    );
    expect(result.total.kcal).toBeCloseTo(150 * 1.1 + 120 * 1.3);
    expect(result.perServing.protein).toBeCloseTo((150 * 0.23 + 120 * 0.027) / 2);
    expect(result.per100g).not.toBeNull();
    expect(result.complete).toBe(true);
  });

  it('signale les lignes incomplètes sans inventer de macros', () => {
    const result = computeRecipeNutrition(
      [
        {
          grams: null,
          energyKcalPer100g: 100,
          proteinPer100g: 10,
          carbsPer100g: 10,
          fatPer100g: 10,
          fiberPer100g: 0,
        },
      ],
      1,
    );
    expect(result.complete).toBe(false);
    expect(result.incompleteLines).toBe(1);
    expect(result.total.kcal).toBe(0);
  });

  it('compte une huile dont les glucides Ciqual sont inconnus', () => {
    const result = computeRecipeNutrition(
      [
        {
          grams: 13.5,
          energyKcalPer100g: 899,
          proteinPer100g: 0,
          carbsPer100g: null,
          fatPer100g: 99.9,
          fiberPer100g: 0,
        },
      ],
      1,
    );
    expect(result.complete).toBe(true);
    expect(result.total.kcal).toBeCloseTo(121.365);
    expect(result.total.fat).toBeCloseTo(13.4865);
    expect(result.total.carbs).toBe(0);
  });
});

describe('body estimate', () => {
  it('propose des macros cohérentes pour un maintien', () => {
    const result = estimateDailyMacros({ weightKg: 80, heightCm: 180, targetWeightKg: null });
    expect(result).not.toBeNull();
    expect(result!.stable).toBe(true);
    expect(result!.protein).toBe(145);
    expect(result!.fat).toBe(70);
    expect(result!.kcal).toBe(result!.protein * 4 + result!.carbs * 4 + result!.fat * 9);
    expect(result!.kcal).toBeGreaterThan(2000);
    expect(result!.kcal).toBeLessThan(3000);
  });

  it('abaisse les calories si le poids visé est plus bas', () => {
    const keep = estimateDailyMacros({ weightKg: 80, heightCm: 180, targetWeightKg: null })!;
    const lose = estimateDailyMacros({ weightKg: 80, heightCm: 180, targetWeightKg: 74 })!;
    expect(lose.stable).toBe(false);
    expect(lose.kcal).toBeLessThan(keep.kcal);
  });

  it('refuse des mesures hors plage', () => {
    expect(estimateDailyMacros({ weightKg: 10, heightCm: 180, targetWeightKg: null })).toBeNull();
  });
});

describe('conversions', () => {
  it('convertit les grammes et sacs', () => {
    expect(resolveGrams({ quantity: 0.5, unit: 'KG', conversions: [] })).toEqual({
      grams: 500,
      estimated: false,
      source: 'metric',
    });
    const halfSachet = resolveGrams({
      quantity: 0.5,
      unit: 'SACHET',
      conversions: [{ unit: 'SACHET', gramsPerUnit: 11 }],
    });
    expect(halfSachet).toEqual({ grams: 5.5, estimated: true, source: 'conversion' });
  });

  it('demande les grammes si aucune conversion fiable', () => {
    expect(resolveGrams({ quantity: 1, unit: 'PIECE', conversions: [] })).toEqual({
      needsManualGrams: true,
    });
  });
});
