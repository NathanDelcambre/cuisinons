import {
  isMassUnit,
  metricQuantityToGrams,
  type QuantityUnit,
  volumeToMilliliters,
} from './units';

export type ConversionRecord = {
  unit: QuantityUnit;
  gramsPerUnit: number;
};

export type ResolvedGrams = {
  grams: number;
  estimated: boolean;
  source: 'metric' | 'conversion' | 'density' | 'manual';
};

export function resolveGrams(input: {
  quantity: number;
  unit: QuantityUnit;
  conversions: readonly ConversionRecord[];
  densityGPerMl?: number | null;
  manualGrams?: number | null;
}): ResolvedGrams | { needsManualGrams: true } {
  if (input.manualGrams !== null && input.manualGrams !== undefined) {
    return { grams: input.manualGrams, estimated: true, source: 'manual' };
  }
  const metric = metricQuantityToGrams(input.quantity, input.unit);
  if (metric !== null) {
    return { grams: metric, estimated: false, source: 'metric' };
  }
  const exact = input.conversions.find((c) => c.unit === input.unit);
  if (exact) {
    return {
      grams: input.quantity * exact.gramsPerUnit,
      estimated: true,
      source: 'conversion',
    };
  }
  const ml = volumeToMilliliters(input.quantity, input.unit);
  if (ml !== null) {
    const density =
      input.densityGPerMl ??
      input.conversions.find((c) => c.unit === 'ML')?.gramsPerUnit ??
      null;
    if (density !== null) {
      return { grams: ml * density, estimated: true, source: 'density' };
    }
  }
  if (isMassUnit(input.unit)) {
    return { needsManualGrams: true };
  }
  return { needsManualGrams: true };
}
