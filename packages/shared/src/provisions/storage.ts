import type { UxCategory } from '../ciqual/ux-categories.js';

export const STORAGE_AREAS = ['FRIDGE', 'FREEZER', 'PANTRY', 'BREAKFAST', 'OTHER'] as const;

export type StorageArea = (typeof STORAGE_AREAS)[number];

export const STORAGE_AREA_LABELS: Record<StorageArea, string> = {
  FRIDGE: 'Frigo',
  FREEZER: 'Congélateur',
  PANTRY: 'Placard',
  BREAKFAST: 'Petit déjeuner',
  OTHER: 'Autres',
};

const FRIDGE_CATEGORIES: ReadonlySet<UxCategory> = new Set<UxCategory>([
  'MEATS',
  'FISH',
  'SEAFOOD',
  'CHARCUTERIE',
  'EGGS',
  'CHEESES',
  'DAIRY',
  'VEGETABLES',
  'AROMATICS',
  'VEGETARIAN_PRODUCTS',
]);

/**
 * Zone proposee a l'ajout d'un ingredient en stock.
 *
 * On ne devine que le frigo et le placard, car la categorie Ciqual les determine
 * de facon fiable. « Congélateur » et « Petit déjeuner » sont des habitudes
 * personnelles, pas des proprietes de l'aliment : les proposer d'office serait
 * faux une fois sur deux, donc ils restent un choix explicite.
 */
export function defaultStorageArea(category: UxCategory): StorageArea {
  if (FRIDGE_CATEGORIES.has(category)) return 'FRIDGE';
  if (category === 'OTHER') return 'OTHER';
  return 'PANTRY';
}
