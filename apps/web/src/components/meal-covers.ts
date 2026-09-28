import type { MealKind, MealSlot } from '@cuisinons/shared';

const KIND_COVER: Partial<Record<MealKind, string>> = {
  SKIPPED: '/meals/skipped.png',
  RESTAURANT: '/meals/restaurant.png',
};

/** Visuel générique d’un repas saisi à la main, selon le créneau. */
export const MANUAL_COVER: Record<MealSlot, string> = {
  BREAKFAST: '/meals/breakfast.png',
  LUNCH: '/meals/lunch.png',
  SNACK: '/meals/snack.png',
  DINNER: '/meals/dinner.png',
};

export function specialMealCover(kind: MealKind, slot?: MealSlot): string | null {
  if (kind === 'IMPOSED') return MANUAL_COVER[slot ?? 'LUNCH'];
  return KIND_COVER[kind] ?? null;
}
