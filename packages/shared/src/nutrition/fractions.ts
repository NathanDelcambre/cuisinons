const FRACTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 1 / 8, label: '1/8' },
  { value: 1 / 6, label: '1/6' },
  { value: 1 / 5, label: '1/5' },
  { value: 1 / 4, label: '1/4' },
  { value: 1 / 3, label: '1/3' },
  { value: 3 / 8, label: '3/8' },
  { value: 2 / 5, label: '2/5' },
  { value: 1 / 2, label: '1/2' },
  { value: 3 / 5, label: '3/5' },
  { value: 5 / 8, label: '5/8' },
  { value: 2 / 3, label: '2/3' },
  { value: 3 / 4, label: '3/4' },
  { value: 4 / 5, label: '4/5' },
  { value: 5 / 6, label: '5/6' },
  { value: 7 / 8, label: '7/8' },
];

export class QuantityParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuantityParseError';
  }
}

function parseFractionToken(token: string): number | null {
  const parts = token.split('/');
  if (parts.length !== 2) {
    return null;
  }
  const num = Number(parts[0]);
  const den = Number(parts[1]);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
    return null;
  }
  return num / den;
}

/** Parse UX quantities: "0,5", "1/2", "1 1/2", "2.5". */
export function parseQuantity(raw: string): number {
  const value = raw.trim().replace(',', '.');
  if (value.length === 0) {
    throw new QuantityParseError('Quantité vide.');
  }
  const mixed = /^(\d+)\s+(\d+\/\d+)$/.exec(value);
  if (mixed) {
    const whole = Number(mixed[1]);
    const frac = parseFractionToken(mixed[2] ?? '');
    if (!Number.isFinite(whole) || frac === null) {
      throw new QuantityParseError(`Quantité invalide : ${raw}`);
    }
    return whole + frac;
  }
  if (value.includes('/')) {
    const frac = parseFractionToken(value);
    if (frac === null) {
      throw new QuantityParseError(`Quantité invalide : ${raw}`);
    }
    return frac;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new QuantityParseError(`Quantité invalide : ${raw}`);
  }
  return numeric;
}

export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const whole = Math.trunc(value);
  const frac = value - whole;
  if (Math.abs(frac) < 1e-9) {
    return String(whole);
  }
  let best = FRACTIONS[0];
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const candidate of FRACTIONS) {
    const delta = Math.abs(frac - candidate.value);
    if (delta < bestDelta) {
      best = candidate;
      bestDelta = delta;
    }
  }
  if (best && bestDelta <= 0.02) {
    return whole === 0 ? best.label : `${String(whole)} ${best.label}`;
  }
  return value.toFixed(2).replace('.', ',').replace(/,?0+$/, '').replace(/,$/, '');
}
