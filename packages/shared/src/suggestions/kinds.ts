export const DISH_KINDS = [
  'poelee',
  'salade',
  'soupe',
  'omelette',
  'bowl',
  'gratin',
  'pates',
  'riz',
  'petit-dejeuner',
  'four',
  'wok',
  'curry',
] as const;
export type DishKind = (typeof DISH_KINDS)[number];

export const DISH_KIND_LABELS: Record<DishKind, string> = {
  poelee: 'Poêlée',
  salade: 'Salade',
  soupe: 'Soupe',
  omelette: 'Omelette',
  bowl: 'Bowl',
  gratin: 'Gratin',
  pates: 'Pâtes',
  riz: 'Riz',
  'petit-dejeuner': 'Petit-déjeuner',
  four: 'Four / papillote',
  wok: 'Wok',
  curry: 'Curry / dahl',
};
