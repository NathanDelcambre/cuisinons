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
  IMPOSED: 'Repas imposé',
};
