export const MEAL_SLOTS = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'] as const;

export type MealSlot = (typeof MEAL_SLOTS)[number];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  BREAKFAST: 'Matin',
  LUNCH: 'Midi',
  SNACK: 'Goûter',
  DINNER: 'Soir',
};
