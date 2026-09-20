export const MEAL_SLOTS = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'] as const;

export type MealSlot = (typeof MEAL_SLOTS)[number];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  BREAKFAST: 'Matin',
  LUNCH: 'Midi',
  SNACK: 'Goûter',
  DINNER: 'Soir',
};

export const MEAL_KINDS = ['RECIPE', 'SKIPPED', 'RESTAURANT', 'IMPOSED'] as const;
export type MealKind = (typeof MEAL_KINDS)[number];

export const MEAL_KIND_LABELS: Record<MealKind, string> = {
  RECIPE: 'Recette',
  SKIPPED: 'Repas sauté',
  RESTAURANT: 'Restaurant',
  IMPOSED: 'Ajouter manuellement',
};

function dayKey(date: string | Date) {
  return typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10);
}

/**
 * Un convive n'occupe qu'un repas par créneau. Les lignes à 0 portion (l'autre
 * personne mange autre chose) sont ignorées ; s'il en reste plusieurs, on garde
 * la plus récente.
 */
export function mealsForEater<
  T extends {
    date: string | Date;
    slot: string;
    portions: ReadonlyArray<{ userId: string; portions: unknown }>;
  },
>(items: readonly T[], userId: string | undefined): T[] {
  const latest = new Map<string, T>();
  for (const item of items) {
    const qty = Number(item.portions.find((p) => p.userId === userId)?.portions ?? 0);
    if (qty <= 0) continue;
    latest.set(`${dayKey(item.date)}:${item.slot}`, item);
  }
  return [...latest.values()];
}
