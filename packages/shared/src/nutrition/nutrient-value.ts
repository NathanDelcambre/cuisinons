export const NUTRIENT_VALUE_KINDS = ['VALUE', 'TRACES', 'LESS_THAN', 'ABSENT', 'NA'] as const;

export type NutrientValueKind = (typeof NUTRIENT_VALUE_KINDS)[number];

export type NutrientValue =
  | { kind: 'VALUE'; amount: number }
  | { kind: 'TRACES' }
  | { kind: 'LESS_THAN'; amount: number }
  | { kind: 'ABSENT' }
  | { kind: 'NA' };

export function parseCiqualNutrient(raw: string | number | null | undefined): NutrientValue {
  if (raw === null || raw === undefined) {
    return { kind: 'NA' };
  }
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) {
      return { kind: 'NA' };
    }
    return { kind: 'VALUE', amount: raw };
  }
  const text = raw.trim();
  if (text.length === 0 || text === '-' || text === '—' || /^n\.?a\.?$/i.test(text)) {
    return { kind: 'NA' };
  }
  const lower = text.toLowerCase();
  if (lower === 'traces' || lower === 'trace') {
    return { kind: 'TRACES' };
  }
  if (lower === 'absents' || lower === 'absent' || lower === 'non applicable') {
    return { kind: 'ABSENT' };
  }
  const lt = /^<\s*([0-9]+(?:[.,][0-9]+)?)/.exec(text);
  if (lt?.[1]) {
    return { kind: 'LESS_THAN', amount: Number(lt[1].replace(',', '.')) };
  }
  const numeric = Number(text.replace(',', '.').replace(/\s/g, ''));
  if (!Number.isFinite(numeric)) {
    return { kind: 'NA' };
  }
  return { kind: 'VALUE', amount: numeric };
}

/** Numeric contribution for recipe math. Unknown values stay unknown (null), never 0. */
export function nutrientAmountForMath(value: NutrientValue): number | null {
  if (value.kind === 'VALUE') {
    return value.amount;
  }
  return null;
}

export function scaleNutrient(value: NutrientValue, grams: number): NutrientValue | null {
  if (value.kind === 'VALUE') {
    return { kind: 'VALUE', amount: (value.amount * grams) / 100 };
  }
  if (value.kind === 'TRACES' || value.kind === 'ABSENT' || value.kind === 'NA') {
    return value;
  }
  if (value.kind === 'LESS_THAN') {
    return { kind: 'LESS_THAN', amount: (value.amount * grams) / 100 };
  }
  return null;
}
