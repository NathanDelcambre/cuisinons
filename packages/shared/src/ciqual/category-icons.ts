import type { UxCategory } from './ux-categories.js';

export const UX_CATEGORY_ICON_SLUGS: Record<UxCategory, string> = {
  VEGETABLES: 'cat-legumes',
  FRUITS: 'cat-fruits',
  STARCHES: 'cat-feculents',
  CEREALS: 'cat-cereales',
  LEGUMES: 'cat-legumineuses',
  MEATS: 'cat-viandes',
  FISH: 'cat-poissons',
  SEAFOOD: 'cat-fruits-de-mer',
  CHARCUTERIE: 'cat-charcuterie',
  EGGS: 'cat-oeufs',
  CHEESES: 'cat-fromages',
  DAIRY: 'cat-laitiers',
  FATS: 'cat-matieres-grasses',
  NUTS_SEEDS: 'cat-noix',
  SPICES: 'cat-epices',
  AROMATICS: 'cat-aromates',
  SAUCES: 'cat-sauces',
  CONDIMENTS: 'cat-condiments',
  PREPARATIONS: 'cat-preparations',
  BAKERY: 'cat-boulangerie',
  PASTRY: 'cat-patisserie',
  SUGARS: 'cat-sucres',
  BEVERAGES: 'cat-boissons',
  VEGETARIAN_PRODUCTS: 'cat-vegetarien',
  PROCESSED: 'cat-transformes',
  OTHER: 'cat-autres',
};

const SLUGS = new Set<string>(Object.values(UX_CATEGORY_ICON_SLUGS));

export function categoryIconSlug(uxCategory: string | null | undefined): string {
  if (uxCategory && uxCategory in UX_CATEGORY_ICON_SLUGS) {
    return UX_CATEGORY_ICON_SLUGS[uxCategory as UxCategory];
  }
  return UX_CATEGORY_ICON_SLUGS.OTHER;
}

export function categoryIconUrl(uxCategory: string | null | undefined): string {
  return `/ingredients/${categoryIconSlug(uxCategory)}.svg`;
}

export function isCategoryIconSlug(slug: string): boolean {
  return SLUGS.has(slug);
}
