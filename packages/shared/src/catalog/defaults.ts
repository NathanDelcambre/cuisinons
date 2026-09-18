import { DISH_KIND_LABELS, DISH_KINDS } from '../suggestions/kinds.js';

/** Tags de type de plat : la même liste que le filtre « Proposer un plat ». */
const DISH_TAGS = DISH_KINDS.map((slug) => ({ slug, label: DISH_KIND_LABELS[slug] }));

const EXTRA_TAGS = [
  { slug: 'viande', label: 'Viande' },
  { slug: 'poisson', label: 'Poisson' },
  { slug: 'fruits-de-mer', label: 'Fruits de mer' },
  { slug: 'vegetarien', label: 'Végétarien' },
  { slug: 'vegan', label: 'Vegan' },
  { slug: 'burger', label: 'Burger' },
  { slug: 'pizza', label: 'Pizza' },
  { slug: 'fast-food', label: 'Fast-food' },
  { slug: 'healthy', label: 'Healthy' },
  { slug: 'proteine', label: 'Protéiné' },
  { slug: 'dessert', label: 'Dessert' },
  { slug: 'patisserie', label: 'Pâtisserie' },
  { slug: 'gouter', label: 'Goûter' },
  { slug: 'aperitif', label: 'Apéritif' },
  { slug: 'plat-principal', label: 'Plat principal' },
  { slug: 'accompagnement', label: 'Accompagnement' },
  { slug: 'sauce', label: 'Sauce' },
  { slug: 'autre', label: 'Autre' },
] as const;

const TAGS_BY_SLUG = new Map<string, { slug: string; label: string }>();
for (const tag of [...DISH_TAGS, ...EXTRA_TAGS]) {
  if (!TAGS_BY_SLUG.has(tag.slug)) TAGS_BY_SLUG.set(tag.slug, { slug: tag.slug, label: tag.label });
}

export const DEFAULT_TAGS = [...TAGS_BY_SLUG.values()];

export const RECIPE_SOURCES = ['USER', 'CATALOG'] as const;
export type RecipeSource = (typeof RECIPE_SOURCES)[number];
export const RECIPE_SOURCE_LABELS: Record<RecipeSource, string> = {
  USER: 'Personnelle',
  CATALOG: 'Catalogue',
};

export const DEFAULT_EQUIPMENT = [
  { slug: 'four', label: 'Four' },
  { slug: 'micro-ondes', label: 'Micro-ondes' },
  { slug: 'air-fryer', label: 'Air fryer' },
  { slug: 'plaques', label: 'Plaques' },
  { slug: 'poele', label: 'Poêle' },
  { slug: 'casserole', label: 'Casserole' },
  { slug: 'wok', label: 'Wok' },
  { slug: 'blender', label: 'Blender' },
  { slug: 'mixeur-plongeant', label: 'Mixeur plongeant' },
  { slug: 'robot-patissier', label: 'Robot pâtissier' },
  { slug: 'robot-multifonction', label: 'Robot multifonction' },
  { slug: 'batteur', label: 'Batteur' },
  { slug: 'grille-pain', label: 'Grille-pain' },
  { slug: 'bouilloire', label: 'Bouilloire' },
  { slug: 'autocuiseur', label: 'Autocuiseur' },
  { slug: 'cocotte', label: 'Cocotte' },
  { slug: 'barbecue', label: 'Barbecue' },
  { slug: 'plancha', label: 'Plancha' },
  { slug: 'balance', label: 'Balance' },
  { slug: 'verre-doseur', label: 'Verre doseur' },
  { slug: 'saladier', label: 'Saladier' },
  { slug: 'fouet', label: 'Fouet' },
  { slug: 'spatule', label: 'Spatule' },
  { slug: 'maryse', label: 'Maryse' },
  { slug: 'couteau', label: 'Couteau' },
  { slug: 'econome', label: 'Économe' },
  { slug: 'rape', label: 'Râpe' },
  { slug: 'passoire', label: 'Passoire' },
  { slug: 'tamis', label: 'Tamis' },
  { slug: 'moule', label: 'Moule' },
  { slug: 'plaque-cuisson', label: 'Plaque de cuisson' },
  { slug: 'papier-cuisson', label: 'Papier cuisson' },
] as const;
