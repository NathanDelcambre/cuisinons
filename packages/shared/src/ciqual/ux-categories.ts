export const UX_CATEGORIES = [
  'VEGETABLES',
  'FRUITS',
  'STARCHES',
  'CEREALS',
  'LEGUMES',
  'MEATS',
  'FISH',
  'SEAFOOD',
  'CHARCUTERIE',
  'EGGS',
  'CHEESES',
  'DAIRY',
  'FATS',
  'NUTS_SEEDS',
  'SPICES',
  'AROMATICS',
  'SAUCES',
  'CONDIMENTS',
  'PREPARATIONS',
  'BAKERY',
  'PASTRY',
  'SUGARS',
  'BEVERAGES',
  'VEGETARIAN_PRODUCTS',
  'PROCESSED',
  'OTHER',
] as const;

export type UxCategory = (typeof UX_CATEGORIES)[number];

export const UX_CATEGORY_LABELS: Record<UxCategory, string> = {
  VEGETABLES: 'Légumes',
  FRUITS: 'Fruits',
  STARCHES: 'Féculents',
  CEREALS: 'Céréales',
  LEGUMES: 'Légumineuses',
  MEATS: 'Viandes',
  FISH: 'Poissons',
  SEAFOOD: 'Fruits de mer',
  CHARCUTERIE: 'Charcuterie',
  EGGS: 'Œufs',
  CHEESES: 'Fromages',
  DAIRY: 'Produits laitiers',
  FATS: 'Matières grasses',
  NUTS_SEEDS: 'Noix et graines',
  SPICES: 'Épices',
  AROMATICS: 'Aromates',
  SAUCES: 'Sauces',
  CONDIMENTS: 'Condiments',
  PREPARATIONS: 'Préparations',
  BAKERY: 'Boulangerie',
  PASTRY: 'Pâtisserie / dessert',
  SUGARS: 'Sucre / produits sucrés',
  BEVERAGES: 'Boissons',
  VEGETARIAN_PRODUCTS: 'Produits végétariens',
  PROCESSED: 'Produits transformés',
  OTHER: 'Autres',
};

/**
 * Sous-groupes Ciqual 2025, du plus precis au plus large.
 * On ne matche JAMAIS le groupe parent « fruits, légumes, légumineuses et
 * oléagineux » ni « viandes, oeufs, poissons » : ils mélangent trop de rayons.
 */
const SUBGROUP_KEYS: ReadonlyArray<readonly [string, UxCategory]> = [
  ['fruits a coque et graines oleagineuses', 'NUTS_SEEDS'],
  ['fruits', 'FRUITS'],
  ['legumineuses', 'LEGUMES'],
  ['legumes', 'VEGETABLES'],
  ['pommes de terre et autres tubercules', 'STARCHES'],
  ['algues', 'VEGETABLES'],
  ['charcuteries', 'CHARCUTERIE'],
  ['viandes crues', 'MEATS'],
  ['viandes cuites', 'MEATS'],
  ['autres produits a base de viande', 'MEATS'],
  ['mollusques et crustaces', 'SEAFOOD'],
  ['produits a base de poissons', 'FISH'],
  ['poissons crus', 'FISH'],
  ['poissons cuits', 'FISH'],
  ['oeufs', 'EGGS'],
  ['fromages', 'CHEESES'],
  ['laits', 'DAIRY'],
  ['cremes et specialites a base de creme', 'DAIRY'],
  ['produits laitiers frais', 'DAIRY'],
  ['pates, riz et cereales', 'CEREALS'],
  ['farines', 'CEREALS'],
  ['cereales de petit-dejeuner', 'CEREALS'],
  ['barres cerealieres', 'CEREALS'],
  ['pains et assimiles', 'BAKERY'],
  ['viennoiseries', 'BAKERY'],
  ['pates a tarte', 'BAKERY'],
  ['biscuits aperitifs', 'PROCESSED'],
  ['gateaux et patisseries', 'PASTRY'],
  ['biscuits sucres', 'PASTRY'],
  ['desserts glaces', 'PASTRY'],
  ['glaces', 'PASTRY'],
  ['sorbets', 'PASTRY'],
  ['chocolats', 'SUGARS'],
  ['confitures', 'SUGARS'],
  ['confiseries', 'SUGARS'],
  ['sucres, miels', 'SUGARS'],
  ['huiles de poissons', 'FATS'],
  ['huiles et graisses vegetales', 'FATS'],
  ['margarines', 'FATS'],
  ['beurres', 'FATS'],
  ['autres matieres grasses', 'FATS'],
  ['herbes', 'AROMATICS'],
  ['epices', 'SPICES'],
  ['sauces', 'SAUCES'],
  ['condiments', 'CONDIMENTS'],
  ['sels', 'CONDIMENTS'],
  ['ingredients pour vegetariens', 'VEGETARIAN_PRODUCTS'],
  ['tartinables vegetariens', 'VEGETARIAN_PRODUCTS'],
  ['boissons sans alcool', 'BEVERAGES'],
  ['boisson alcoolisees', 'BEVERAGES'],
  ['eaux', 'BEVERAGES'],
  ['plats composes', 'PREPARATIONS'],
  ['sandwichs', 'PREPARATIONS'],
  ['soupes', 'PREPARATIONS'],
  ['pizzas, tartes et crepes salees', 'PREPARATIONS'],
  ['salades composees et crudites', 'PREPARATIONS'],
  ['feuilletees et autres entrees', 'PREPARATIONS'],
  ['aides culinaires', 'OTHER'],
  ['denrees destinees a une alimentation particuliere', 'OTHER'],
  ['laits et boissons infantiles', 'OTHER'],
  ['petits pots sales', 'OTHER'],
  ['desserts infantiles', 'OTHER'],
  ['cereales et biscuits infantiles', 'OTHER'],
];

/** Fallback si le sous-groupe est vide : groupes Ciqual simples, jamais les groupes mixtes. */
const GROUP_KEYS: ReadonlyArray<readonly [string, UxCategory]> = [
  ['fromages', 'CHEESES'],
  ['viandes cuites', 'MEATS'],
  ['viandes crues', 'MEATS'],
  ['charcuteries', 'CHARCUTERIE'],
  ['poissons', 'FISH'],
  ['oeufs', 'EGGS'],
  ['legumineuses', 'LEGUMES'],
  ['legumes', 'VEGETABLES'],
  ['fruits a coque', 'NUTS_SEEDS'],
  ['fruits', 'FRUITS'],
  ['produits laitiers', 'DAIRY'],
  ['matieres grasses', 'FATS'],
  ['produits cerealier', 'CEREALS'],
  ['pains', 'BAKERY'],
  ['glaces et sorbets', 'PASTRY'],
  ['produits sucres', 'SUGARS'],
  ['eaux et autres boissons', 'BEVERAGES'],
  ['entrees et plats composes', 'PREPARATIONS'],
  ['aliments infantiles', 'OTHER'],
];

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae');
}

/** Égalité ou préfixe (« fromages et alternatives »), pas un includes qui croise les rayons. */
function keyed(haystack: string, key: string): boolean {
  const h = fold(haystack);
  return h === key || h.startsWith(`${key} `) || h.startsWith(`${key} et `);
}

function lookup(haystack: string, table: ReadonlyArray<readonly [string, UxCategory]>): UxCategory | null {
  for (const [key, category] of table) {
    if (keyed(haystack, key)) return category;
  }
  return null;
}

export function mapCiqualToUxCategory(input: {
  groupName: string;
  subGroupName?: string | null;
  foodName?: string | null;
}): UxCategory {
  const sub = input.subGroupName?.trim() ?? '';
  if (sub.length > 0) {
    const fromSub = lookup(sub, SUBGROUP_KEYS);
    if (fromSub) return fromSub;
  }
  const fromGroup = lookup(input.groupName, GROUP_KEYS);
  if (fromGroup) return fromGroup;
  return 'OTHER';
}

export function uxSubCategory(input: {
  category: UxCategory;
  subGroupName?: string | null;
}): string {
  const sub = input.subGroupName?.trim();
  if (sub && sub.length > 0) {
    return sub;
  }
  return UX_CATEGORY_LABELS[input.category];
}
