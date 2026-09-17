export const QUANTITY_UNITS = [
  'G',
  'KG',
  'ML',
  'CL',
  'L',
  'TSP',
  'TBSP',
  'PIECE',
  'PINCH',
  'SLICE',
  'SACHET',
  'JAR',
  'CUSTOM',
] as const;

export type QuantityUnit = (typeof QUANTITY_UNITS)[number];

export const UNIT_LABELS: Record<QuantityUnit, string> = {
  G: 'g',
  KG: 'kg',
  ML: 'ml',
  CL: 'cl',
  L: 'l',
  TSP: 'c.à.c',
  TBSP: 'c.à.s',
  PIECE: 'pièce',
  PINCH: 'pincée',
  SLICE: 'tranche',
  SACHET: 'sachet',
  JAR: 'pot',
  CUSTOM: 'quantité',
};

export function isMassUnit(unit: QuantityUnit): boolean {
  return unit === 'G' || unit === 'KG';
}

export function isVolumeUnit(unit: QuantityUnit): boolean {
  return unit === 'ML' || unit === 'CL' || unit === 'L' || unit === 'TSP' || unit === 'TBSP';
}

/** Convert a quantity in the given unit to grams when the conversion is purely metric. */
export function metricQuantityToGrams(quantity: number, unit: QuantityUnit): number | null {
  switch (unit) {
    case 'G':
      return quantity;
    case 'KG':
      return quantity * 1000;
    default:
      return null;
  }
}

export function volumeToMilliliters(quantity: number, unit: QuantityUnit): number | null {
  switch (unit) {
    case 'ML':
      return quantity;
    case 'CL':
      return quantity * 10;
    case 'L':
      return quantity * 1000;
    case 'TSP':
      return quantity * 5;
    case 'TBSP':
      return quantity * 15;
    default:
      return null;
  }
}
