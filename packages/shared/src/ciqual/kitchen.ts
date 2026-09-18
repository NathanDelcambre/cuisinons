import { foldText, kitchenLabel } from '../suggestions/names.js';

const NOISE = [
  'preleve a',
  'aliment moyen',
  'infant',
  'petit pot',
  'sans precision',
  'nectar',
  'chips d',
  'tarte aux',
];

export function isKitchenNoise(nameFr: string, groupName?: string | null): boolean {
  const haystack = foldText(`${nameFr} ${groupName ?? ''}`);
  return NOISE.some((needle) => haystack.includes(needle));
}

export function queryWantsIndustrial(query: string): boolean {
  const q = foldText(query);
  return ['sirop', 'nectar', 'chips', 'tarte', 'appertise', 'infant'].some((needle) => q.includes(needle));
}

export function kitchenPickScore(input: {
  nameFr: string;
  dedicatedIcon?: boolean;
  groupName?: string | null;
}): number {
  const folded = foldText(input.nameFr);
  let score = 80 - Math.min(60, input.nameFr.length);
  if (input.dedicatedIcon) score += 20;
  if (/(, cru|, crue)$/.test(folded)) score += 25;
  if (!input.nameFr.includes(',')) score += 10;
  if (isKitchenNoise(input.nameFr, input.groupName)) score -= 80;
  if (folded.includes(' au sirop')) score -= 15;
  if (folded.includes(' nectar')) score -= 20;
  return score;
}

export function collapseKitchenIngredients<T extends { nameFr: string }>(
  items: readonly T[],
  extra?: (item: T) => { dedicatedIcon?: boolean; groupName?: string | null },
): T[] {
  const best = new Map<string, { item: T; score: number }>();
  for (const item of items) {
    const meta = extra?.(item) ?? {};
    const key = foldText(kitchenLabel(item.nameFr));
    const score = kitchenPickScore({ nameFr: item.nameFr, ...meta });
    const current = best.get(key);
    if (!current || score > current.score) best.set(key, { item, score });
  }
  return [...best.values()]
    .sort((a, b) =>
      kitchenLabel(a.item.nameFr).localeCompare(kitchenLabel(b.item.nameFr), 'fr', {
        sensitivity: 'base',
      }),
    )
    .map((entry) => entry.item);
}
