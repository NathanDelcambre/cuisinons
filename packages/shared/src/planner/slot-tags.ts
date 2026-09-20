import type { MealSlot } from './slots.js';

/** Tags préférés par créneau, du plus spécifique au fallback. Jamais une exclusion. */
export const SLOT_PREFERRED_TAGS: Record<MealSlot, readonly string[]> = {
  BREAKFAST: ['petit-dejeuner'],
  LUNCH: ['plat-principal', 'salade', 'soupe'],
  SNACK: ['gouter', 'dessert'],
  DINNER: ['plat-principal', 'salade', 'soupe'],
};

function normalizeTag(tag: string): string {
  return tag.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

export function slotTagRank(tags: readonly string[], slot: MealSlot): number {
  const wanted = SLOT_PREFERRED_TAGS[slot];
  const have = new Set(tags.map(normalizeTag));
  const index = wanted.findIndex((tag) => have.has(normalizeTag(tag)));
  return index === -1 ? wanted.length : index;
}

export function recipeFitsSlot(tags: readonly string[], slot: MealSlot): boolean {
  const normalized = new Set(tags.map(normalizeTag));
  return SLOT_PREFERRED_TAGS[slot].some((tag) => normalized.has(normalizeTag(tag)));
}

export function primarySlotForRecipe(tags: readonly string[], fallback: MealSlot): MealSlot {
  const normalized = new Set(tags.map(normalizeTag));
  if (normalized.has('petit-dejeuner')) return 'BREAKFAST';
  if (normalized.has('gouter') || normalized.has('dessert')) return 'SNACK';
  if (normalized.has('plat-principal') || normalized.has('salade') || normalized.has('soupe')) {
    return fallback === 'DINNER' ? 'DINNER' : 'LUNCH';
  }
  return fallback;
}

export function compareRecipesForSlot(
  a: { tags: readonly string[]; name?: string },
  b: { tags: readonly string[]; name?: string },
  slot: MealSlot,
): number {
  const rank = slotTagRank(a.tags, slot) - slotTagRank(b.tags, slot);
  if (rank !== 0) return rank;
  return (a.name ?? '').localeCompare(b.name ?? '', 'fr');
}
