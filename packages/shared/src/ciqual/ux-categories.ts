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

type MappingRule = {
  category: UxCategory;
  groupIncludes?: readonly string[];
  subGroupIncludes?: readonly string[];
  nameIncludes?: readonly string[];
};

const RULES: readonly MappingRule[] = [
  { category: 'EGGS', groupIncludes: ['oeufs', 'œufs'], subGroupIncludes: ['oeufs', 'œufs'] },
  { category: 'CHEESES', groupIncludes: ['fromages'], subGroupIncludes: ['fromages'] },
  {
    category: 'DAIRY',
    groupIncludes: ['lait', 'produits laitiers', 'ultra-frais'],
    subGroupIncludes: ['yaourts', 'fromages blancs', 'crèmes', 'laits'],
  },
  { category: 'CHARCUTERIE', groupIncludes: ['charcuteries'], subGroupIncludes: ['charcuteries'] },
  { category: 'MEATS', groupIncludes: ['viandes'], subGroupIncludes: ['viandes', 'volailles'] },
  { category: 'FISH', groupIncludes: ['poissons'], subGroupIncludes: ['poissons'] },
  {
    category: 'SEAFOOD',
    groupIncludes: ['mollusques', 'crustaces', 'crustacés'],
    subGroupIncludes: ['mollusques', 'crustaces', 'crustacés', 'fruits de mer'],
  },
  { category: 'VEGETABLES', groupIncludes: ['légumes', 'legumes'], subGroupIncludes: ['légumes', 'legumes'] },
  { category: 'FRUITS', groupIncludes: ['fruits'], subGroupIncludes: ['fruits'] },
  {
    category: 'LEGUMES',
    groupIncludes: ['légumineuses', 'legumineuses'],
    subGroupIncludes: ['légumineuses', 'haricots', 'lentilles', 'pois chiches'],
  },
  {
    category: 'STARCHES',
    groupIncludes: ['pommes de terre', 'tubercules'],
    subGroupIncludes: ['pommes de terre', 'patates', 'manioc'],
  },
  {
    category: 'CEREALS',
    groupIncludes: ['céréales', 'cereales', 'pates', 'pâtes', 'riz'],
    subGroupIncludes: ['céréales', 'riz', 'pâtes', 'pates', 'avoine', 'blé'],
  },
  { category: 'BAKERY', groupIncludes: ['pains', 'viennoiseries'], subGroupIncludes: ['pains', 'viennoiseries'] },
  {
    category: 'PASTRY',
    groupIncludes: ['biscuits', 'gâteaux', 'gateaux', 'pâtisseries', 'patisseries', 'desserts'],
    subGroupIncludes: ['biscuits', 'gâteaux', 'pâtisseries', 'glaces'],
  },
  { category: 'SUGARS', groupIncludes: ['sucres', 'confiseries', 'chocolat'], subGroupIncludes: ['sucres', 'confiseries', 'chocolat'] },
  { category: 'FATS', groupIncludes: ['matières grasses', 'matieres grasses', 'huiles'], subGroupIncludes: ['huiles', 'beurres', 'margarines'] },
  { category: 'NUTS_SEEDS', groupIncludes: ['fruits à coque', 'fruits a coque', 'graines'], subGroupIncludes: ['noix', 'amandes', 'graines'] },
  { category: 'SPICES', groupIncludes: ['épices', 'epices', 'herbes'], nameIncludes: ['curry', 'paprika', 'cannelle'] },
  { category: 'AROMATICS', nameIncludes: ['ail', 'oignon', 'échalote', 'echalote', 'persil', 'basilic', 'thym', 'ciboulette'] },
  { category: 'SAUCES', groupIncludes: ['sauces'], subGroupIncludes: ['sauces'] },
  { category: 'CONDIMENTS', groupIncludes: ['condiments'], subGroupIncludes: ['condiments', 'moutardes', 'vinaigres'] },
  { category: 'BEVERAGES', groupIncludes: ['boissons', 'eaux', 'alcools'], subGroupIncludes: ['boissons', 'jus', 'sodas', 'cafés', 'thés'] },
  {
    category: 'VEGETARIAN_PRODUCTS',
    groupIncludes: ['produits végétariens', 'produits vegetariens'],
    nameIncludes: ['tofu', 'seitan', 'tempeh', 'steak végétal'],
  },
  { category: 'PREPARATIONS', groupIncludes: ['plats composés', 'plats composes', 'entrées'], subGroupIncludes: ['plats', 'soupes', 'salades composées'] },
  { category: 'PROCESSED', groupIncludes: ['produits transformés', 'produits transformes', 'snacks'] },
];

function includesAny(haystack: string, needles: readonly string[] | undefined): boolean {
  if (!needles) return false;
  return needles.some((needle) => haystack.includes(needle));
}

export function mapCiqualToUxCategory(input: {
  groupName: string;
  subGroupName?: string | null;
  foodName?: string | null;
}): UxCategory {
  const group = input.groupName.toLowerCase();
  const sub = (input.subGroupName ?? '').toLowerCase();
  const name = (input.foodName ?? '').toLowerCase();
  for (const rule of RULES) {
    if (
      includesAny(group, rule.groupIncludes) ||
      includesAny(sub, rule.subGroupIncludes) ||
      includesAny(name, rule.nameIncludes)
    ) {
      return rule.category;
    }
  }
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
