import type { UxCategory } from '../ciqual/ux-categories.js';
import { foldText } from './names.js';

export const DIETS = ['omnivore', 'vegetarian', 'vegan'] as const;
export type Diet = (typeof DIETS)[number];

export const DIET_LABELS: Record<Diet, string> = {
  omnivore: 'Tout',
  vegetarian: 'Végétarien',
  vegan: 'Vegan',
};

export const CULINARY_ROLES = [
  'protein',
  'vegetable',
  'starch',
  'fat',
  'aromatic',
  'dairy',
  'fruit',
  'condiment',
  'egg',
] as const;
export type CulinaryRole = (typeof CULINARY_ROLES)[number];

export const ROLE_LABELS: Record<CulinaryRole, string> = {
  protein: 'une protéine',
  vegetable: 'un légume',
  starch: 'un féculent',
  fat: 'une matière grasse',
  aromatic: 'un aromate',
  dairy: 'un produit laitier',
  fruit: 'un fruit',
  condiment: 'un condiment',
  egg: 'des œufs',
};

const VEGETARIAN_EXCLUDED: ReadonlySet<UxCategory> = new Set([
  'MEATS',
  'FISH',
  'SEAFOOD',
  'CHARCUTERIE',
]);

const VEGAN_EXCLUDED: ReadonlySet<UxCategory> = new Set([
  ...VEGETARIAN_EXCLUDED,
  'EGGS',
  'DAIRY',
  'CHEESES',
]);

/** Catégories trop transformées ou hors assiette : on ne compose pas avec. */
const UNUSABLE: ReadonlySet<UxCategory> = new Set([
  'PREPARATIONS',
  'PASTRY',
  'SUGARS',
  'BEVERAGES',
  'PROCESSED',
  'OTHER',
]);

export function allowedByDiet(category: UxCategory, diet: Diet): boolean {
  if (diet === 'vegan') return !VEGAN_EXCLUDED.has(category);
  if (diet === 'vegetarian') return !VEGETARIAN_EXCLUDED.has(category);
  return true;
}

/**
 * Le mapping Ciqual se trompe parfois (un filet de poulet étiqueté « œufs »).
 * Le nom reste le filet de sécurité pour le filtre végétarien / vegan.
 */
const ANIMAL_NEEDLES = [
  'poulet',
  'dinde',
  'canard',
  'boeuf',
  'veau',
  'porc',
  'agneau',
  'viande',
  'steak',
  'hache',
  'jambon',
  'lardon',
  'bacon',
  'saucisse',
  'saumon',
  'thon',
  'cabillaud',
  'truite',
  'poisson',
  'crevette',
] as const;

export function looksAnimal(nameFr: string): boolean {
  const folded = foldText(nameFr);
  return ANIMAL_NEEDLES.some((needle) => folded.includes(needle));
}

export function ingredientAllowed(category: UxCategory, nameFr: string, diet: Diet): boolean {
  if (!allowedByDiet(category, diet)) return false;
  if (diet === 'omnivore') return true;
  return !looksAnimal(nameFr);
}

export function isAnimalCategory(category: UxCategory): boolean {
  return VEGETARIAN_EXCLUDED.has(category);
}

export function isVeganIncompatible(category: UxCategory): boolean {
  return VEGAN_EXCLUDED.has(category);
}

/**
 * Rôle principal d'un aliment. Un œuf est une protéine et, pour l'omelette,
 * un rôle dédié : le compositeur filtre ensuite selon le besoin.
 */
export function primaryRole(category: UxCategory): CulinaryRole | null {
  switch (category) {
    case 'MEATS':
    case 'FISH':
    case 'SEAFOOD':
    case 'CHARCUTERIE':
    case 'LEGUMES':
    case 'VEGETARIAN_PRODUCTS':
      return 'protein';
    case 'EGGS':
      return 'egg';
    case 'VEGETABLES':
      return 'vegetable';
    case 'STARCHES':
    case 'CEREALS':
    case 'BAKERY':
      return 'starch';
    case 'FATS':
      return 'fat';
    case 'AROMATICS':
    case 'SPICES':
      return 'aromatic';
    case 'DAIRY':
    case 'CHEESES':
      return 'dairy';
    case 'FRUITS':
      return 'fruit';
    case 'SAUCES':
    case 'CONDIMENTS':
      return 'condiment';
    case 'NUTS_SEEDS':
      return 'protein';
    default:
      return UNUSABLE.has(category) ? null : null;
  }
}

export function categoryFitsRole(category: UxCategory, role: CulinaryRole): boolean {
  switch (role) {
    case 'protein':
      return (
        category === 'MEATS' ||
        category === 'FISH' ||
        category === 'SEAFOOD' ||
        category === 'CHARCUTERIE' ||
        category === 'LEGUMES' ||
        category === 'VEGETARIAN_PRODUCTS' ||
        category === 'EGGS' ||
        category === 'NUTS_SEEDS'
      );
    case 'egg':
      return category === 'EGGS';
    case 'vegetable':
      return category === 'VEGETABLES';
    case 'starch':
      return category === 'STARCHES' || category === 'CEREALS' || category === 'BAKERY';
    case 'fat':
      return category === 'FATS';
    case 'aromatic':
      return category === 'AROMATICS' || category === 'SPICES';
    case 'dairy':
      return category === 'DAIRY' || category === 'CHEESES';
    case 'fruit':
      return category === 'FRUITS';
    case 'condiment':
      return category === 'SAUCES' || category === 'CONDIMENTS';
  }
}

export function nameMatches(
  nameFr: string,
  includes?: readonly string[],
  excludes?: readonly string[],
): boolean {
  const folded = foldText(nameFr);
  if (includes && includes.length > 0 && !includes.some((needle) => folded.includes(foldText(needle)))) {
    return false;
  }
  if (excludes?.some((needle) => folded.includes(foldText(needle)))) return false;
  return true;
}

/**
 * Note brute d'un aliment, hors quantité. La charcuterie reste utilisable
 * (un plat doit pouvoir partir de ce qu'on a) mais sera pénalisée plus bas.
 */
export function ingredientHealth(category: UxCategory): number {
  switch (category) {
    case 'VEGETABLES':
      return 1;
    case 'LEGUMES':
      return 0.95;
    case 'FISH':
      return 0.9;
    case 'FRUITS':
      return 0.86;
    case 'EGGS':
      return 0.8;
    case 'VEGETARIAN_PRODUCTS':
      return 0.78;
    case 'SEAFOOD':
      return 0.76;
    case 'CEREALS':
      return 0.74;
    case 'NUTS_SEEDS':
      return 0.72;
    case 'MEATS':
      return 0.68;
    case 'STARCHES':
      return 0.66;
    case 'AROMATICS':
    case 'SPICES':
      return 0.6;
    case 'DAIRY':
      return 0.55;
    case 'CHEESES':
      return 0.48;
    case 'BAKERY':
      return 0.42;
    case 'FATS':
      return 0.4;
    case 'CONDIMENTS':
      return 0.38;
    case 'SAUCES':
      return 0.3;
    case 'CHARCUTERIE':
      return 0.16;
    default:
      return 0.2;
  }
}
