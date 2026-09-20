import { normalizeSearchText } from '../search/normalize.js';
import type { QuantityUnit } from '../nutrition/units.js';
import { joinFrench } from './names.js';
import { HEALTHY_RECIPES, type CookMethod, type NameFilter, type RecipeSpec } from './catalog.js';

export type IngredientRef = {
  key: string;
  code: number | null;
  names: readonly string[];
};

export type OfficialLine = {
  key: string;
  quantity: number;
  unit: QuantityUnit;
  grams: number;
  displayQuantity?: string;
};

export type OfficialHealthySpec = {
  id: string;
  name: string;
  description: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  tagSlugs: string[];
  equipmentSlugs: string[];
  photoSlug: string;
  ingredients: OfficialLine[];
  steps: Array<{ description: string; durationMinutes?: number }>;
};

const TBSP_OIL = 13.5;
const TSP_SPICE = 2;
const PINCH_SALT = 0.5;
const PINCH_PEPPER = 0.3;

/** Fiches healthy : quantités pour N convives, macros affichées = total / N. */
export const OFFICIAL_HEALTHY_SERVINGS = 2;

/** Assiette d’une personne : 100–150 g de viande/poisson, un peu plus du reste. */
const PER_PERSON = {
  meatFishG: 130,
  shrimpG: 120,
  legumesG: 140,
  tofuG: 120,
  walnutG: 20,
  cerealG: 90,
  oatsG: 50,
  couscousG: 60,
  potatoG: 200,
  yogurtG: 80,
  fetaG: 40,
  waterG: 300,
  onionG: 60,
  coconutMilkG: 100,
  avocadoG: 140,
  bananaG: 120,
  orangeG: 150,
  goatG: 40,
  oliveG: 20,
  basilG: 6,
} as const;

function forPeople(gramsPerPerson: number): number {
  return gramsPerPerson * OFFICIAL_HEALTHY_SERVINGS;
}

export const HEALTHY_INGREDIENTS: Record<string, IngredientRef> = {
  oliveOil: { key: 'oliveOil', code: 17270, names: ['huile olive'] },
  sunflowerOil: { key: 'sunflowerOil', code: 17440, names: ['huile tournesol'] },
  salt: { key: 'salt', code: 11058, names: ['sel, blanc'] },
  pepper: { key: 'pepper', code: 11015, names: ['poivre noir'] },
  lemon: { key: 'lemon', code: 2007, names: ['jus de citron'] },
  garlic: { key: 'garlic', code: 11023, names: ['ail'] },
  paprika: { key: 'paprika', code: 11049, names: ['paprika'] },
  provence: { key: 'provence', code: 11060, names: ['herbes de provence'] },
  soy: { key: 'soy', code: 11104, names: ['sauce soja'] },
  mustard: { key: 'mustard', code: 11013, names: ['moutarde'] },
  chicken: { key: 'chicken', code: 36017, names: ['poulet, filet'] },
  turkey: { key: 'turkey', code: 36304, names: ['dinde, escalope', 'dinde, viande'] },
  pork: { key: 'pork', code: 28204, names: ['porc, filet mignon', 'filet mignon'] },
  salmon: { key: 'salmon', code: 26036, names: ['saumon, cru'] },
  cod: { key: 'cod', code: 26043, names: ['cabillaud, cru'] },
  hake: { key: 'hake', code: 26044, names: ['merlu, cru'] },
  pollock: { key: 'pollock', code: 26134, names: ['lieu, cru'] },
  trout: { key: 'trout', code: 27009, names: ['truite, crue', 'truite, cru'] },
  tuna: { key: 'tuna', code: 26053, names: ['thon, cru', 'thon au naturel'] },
  sardine: { key: 'sardine', code: 26065, names: ['sardine, crue', 'sardine'] },
  mackerel: { key: 'mackerel', code: 26051, names: ['maquereau, cru'] },
  shrimp: { key: 'shrimp', code: 10007, names: ['crevette'] },
  mussels: { key: 'mussels', code: 10014, names: ['moule'] },
  lentils: { key: 'lentils', code: 20360, names: ['lentille, cuite', 'lentilles vertes'] },
  chickpeas: { key: 'chickpeas', code: 20507, names: ['pois chiche, cuit'] },
  whiteBeans: { key: 'whiteBeans', code: 20502, names: ['haricot blanc, cuit'] },
  tofu: { key: 'tofu', code: 20904, names: ['tofu'] },
  egg: { key: 'egg', code: 22000, names: ['oeuf de poule'] },
  rice: { key: 'rice', code: 9104, names: ['riz blanc, cuit'] },
  quinoa: { key: 'quinoa', code: 9341, names: ['quinoa, cuit', 'quinoa'] },
  pasta: { key: 'pasta', code: 9811, names: ['pates cuites', 'spaghetti'] },
  couscous: { key: 'couscous', code: 9610, names: ['semoule de ble', 'couscous'] },
  oats: { key: 'oats', code: 32140, names: ['flocons d avoine'] },
  potato: { key: 'potato', code: 4008, names: ['pomme de terre'] },
  sweetPotato: { key: 'sweetPotato', code: 4101, names: ['patate douce'] },
  tomato: { key: 'tomato', code: 20192, names: ['tomate'] },
  zucchini: { key: 'zucchini', code: 20020, names: ['courgette'] },
  eggplant: { key: 'eggplant', code: 20053, names: ['aubergine'] },
  bellPepper: { key: 'bellPepper', code: 20041, names: ['poivron'] },
  cucumber: { key: 'cucumber', code: 20019, names: ['concombre'] },
  onion: { key: 'onion', code: 20034, names: ['oignon'] },
  carrot: { key: 'carrot', code: 20009, names: ['carotte'] },
  cauliflower: { key: 'cauliflower', code: 20016, names: ['chou-fleur'] },
  cabbage: { key: 'cabbage', code: 20069, names: ['chou, cru'] },
  beet: { key: 'beet', code: 20091, names: ['betterave'] },
  pumpkin: { key: 'pumpkin', code: 20044, names: ['potiron', 'butternut'] },
  asparagus: { key: 'asparagus', code: 20279, names: ['asperge'] },
  artichoke: { key: 'artichoke', code: 20052, names: ['artichaut'] },
  mushroom: { key: 'mushroom', code: 20056, names: ['champignon'] },
  greenBean: { key: 'greenBean', code: 20061, names: ['haricot vert'] },
  salad: { key: 'salad', code: 20012, names: ['salade verte', 'laitue'] },
  spinach: { key: 'spinach', code: 20059, names: ['epinard'] },
  avocado: { key: 'avocado', code: 13004, names: ['avocat'] },
  banana: { key: 'banana', code: 13005, names: ['banane'] },
  orange: { key: 'orange', code: 13034, names: ['orange'] },
  feta: { key: 'feta', code: 12066, names: ['feta'] },
  goat: { key: 'goat', code: 12805, names: ['fromage de chevre'] },
  yogurt: { key: 'yogurt', code: 19644, names: ['fromage blanc'] },
  milk: { key: 'milk', code: 19041, names: ['lait demi-ecreme'] },
  coconutMilk: { key: 'coconutMilk', code: 18041, names: ['lait de coco'] },
  walnut: { key: 'walnut', code: 15005, names: ['noix'] },
  olive: { key: 'olive', code: 13033, names: ['olive'] },
  ginger: { key: 'ginger', code: 11074, names: ['gingembre'] },
  basil: { key: 'basil', code: 11033, names: ['basilic'] },
  water: { key: 'water', code: 18066, names: ['eau'] },
};

/** Plats Ciqual tout-prêts : jamais utilisés pour composer une recette maison. */
const PREPARED_FOOD_RE =
  /\b(preemball|soupe |soupe a|potage|veloute|gratin |carbonara|pane |deshydrat|galette|aligot|salade de |salade vegetarienne|petit sale|puree |appertis|couscous au |tripes|pave aux|lasagne|quiche|pizza)\b/;

export function isPreparedFoodName(nameNormalized: string): boolean {
  return PREPARED_FOOD_RE.test(` ${nameNormalized} `);
}

export function pickHealthyIngredient<T extends { ciqualCode: number; nameNormalized: string }>(
  catalog: T[],
  ref: IngredientRef,
): T | null {
  if (ref.code != null) {
    const byCode = catalog.find((item) => item.ciqualCode === ref.code);
    if (byCode) return byCode;
  }
  let best: { item: T; score: number } | null = null;
  for (const name of ref.names) {
    const needle = normalizeSearchText(name);
    if (!needle) continue;
    for (const item of catalog) {
      if (item.ciqualCode >= 900000) continue;
      if (isPreparedFoodName(item.nameNormalized)) continue;
      if (!item.nameNormalized.includes(needle)) continue;
      let score = 0;
      if (item.nameNormalized.startsWith(needle)) score += 40;
      if (/\bcru[es]?\b/.test(item.nameNormalized)) score += 15;
      if (item.nameNormalized.includes('cuit a l eau') || item.nameNormalized.includes('bouilli')) score += 20;
      const words = item.nameNormalized.split(/\s+/).filter(Boolean).length;
      score += Math.max(0, 16 - words);
      if (!best || score > best.score) best = { item, score };
    }
  }
  return best?.item ?? null;
}

const PHOTO_BY_METHOD: Record<CookMethod, string> = {
  skillet: 'skillet',
  wok: 'wok',
  oven: 'oven',
  parcel: 'parcel',
  salad: 'salad',
  soup: 'soup',
  curry: 'curry',
  bake: 'oven',
  omelette: 'omelette',
  bowl: 'bowl',
  pasta: 'pasta',
  rice: 'bowl',
  breakfast: 'breakfast',
  stew: 'stew',
};

function pinch(key: string, grams: number): OfficialLine {
  return { key, quantity: 1, unit: 'PINCH', grams, displayQuantity: '1' };
}

function tbsp(key: string, quantity: number, gramsPer = 15): OfficialLine {
  return { key, quantity, unit: 'TBSP', grams: quantity * gramsPer, displayQuantity: String(quantity) };
}

function tsp(key: string, grams = TSP_SPICE): OfficialLine {
  return { key, quantity: 1, unit: 'TSP', grams, displayQuantity: '1' };
}

function g(key: string, grams: number): OfficialLine {
  return { key, quantity: grams, unit: 'G', grams };
}

function piece(key: string, quantity: number, gramsEach: number): OfficialLine {
  return {
    key,
    quantity,
    unit: 'PIECE',
    grams: quantity * gramsEach,
    displayQuantity: String(quantity),
  };
}

function tokensOf(filter: NameFilter | undefined): string[] {
  if (filter === true || filter === undefined) return [];
  return filter.map((item) => item.toLowerCase());
}

function matches(tokens: string[], needles: readonly string[]): boolean {
  return tokens.some((token) => needles.some((needle) => token.includes(needle) || needle.includes(token)));
}

const PROTEIN_FROM_NAME: Array<{ needles: readonly string[]; key: string }> = [
  { needles: ['porc', 'mignon'], key: 'pork' },
  { needles: ['poulet'], key: 'chicken' },
  { needles: ['dinde'], key: 'turkey' },
  { needles: ['saumon'], key: 'salmon' },
  { needles: ['cabillaud'], key: 'cod' },
  { needles: ['merlu'], key: 'hake' },
  { needles: ['lieu', 'colin'], key: 'pollock' },
  { needles: ['truite'], key: 'trout' },
  { needles: ['thon'], key: 'tuna' },
  { needles: ['sardine'], key: 'sardine' },
  { needles: ['maquereau'], key: 'mackerel' },
  { needles: ['crevette'], key: 'shrimp' },
  { needles: ['moule'], key: 'mussels' },
  { needles: ['lentille'], key: 'lentils' },
  { needles: ['pois chiche', 'pois-chiche'], key: 'chickpeas' },
  { needles: ['haricot'], key: 'whiteBeans' },
  { needles: ['tofu'], key: 'tofu' },
  { needles: ['noix'], key: 'walnut' },
  { needles: ['poisson'], key: 'pollock' },
];

const FISH_PROTEIN_KEYS = ['salmon', 'cod', 'hake', 'pollock', 'trout', 'tuna', 'sardine', 'mackerel'] as const;
const SEAFOOD_PROTEIN_KEYS = [...FISH_PROTEIN_KEYS, 'shrimp', 'mussels'] as const;

function proteinFromText(text: string): string | null {
  const folded = normalizeSearchText(text);
  if (!folded) return null;
  for (const row of PROTEIN_FROM_NAME) {
    if (row.needles.some((needle) => folded.includes(normalizeSearchText(needle)))) return row.key;
  }
  return null;
}

function addProteinsFromLabel(label: string, keys: string[]): void {
  const folded = normalizeSearchText(label);
  if (!folded) return;
  for (const row of PROTEIN_FROM_NAME) {
    if (row.needles.includes('poisson')) continue;
    if (row.needles.some((needle) => folded.includes(normalizeSearchText(needle))) && !keys.includes(row.key)) {
      keys.push(row.key);
    }
  }
  const hasFish = keys.some((key) => (SEAFOOD_PROTEIN_KEYS as readonly string[]).includes(key));
  if (!hasFish && folded.includes('poisson')) keys.push('pollock');
}

function isSeafoodPlate(label: string): boolean {
  const folded = normalizeSearchText(label);
  return folded.includes('de la mer') || folded.includes('fruits de mer');
}

function isSeafoodToken(token: string): boolean {
  const key = proteinFromText(token);
  return Boolean(
    (key && (SEAFOOD_PROTEIN_KEYS as readonly string[]).includes(key)) ||
      token.includes('daurade') ||
      token.includes('dorade') ||
      token.includes('poisson'),
  );
}

function isWhiteBag(tokens: string[]): boolean {
  return tokens.length >= 2 && tokens.every((token) => token.includes('poulet') || token.includes('dinde'));
}

function isFishBag(tokens: string[]): boolean {
  return tokens.length >= 2 && tokens.every(isSeafoodToken);
}

function isLegumeBag(tokens: string[]): boolean {
  return (
    tokens.length >= 2 &&
    tokens.every((token) =>
      ['lentille', 'pois chiche', 'pois-chiche', 'haricot', 'tofu'].some(
        (needle) => token.includes(needle) || needle.includes(token),
      ),
    )
  );
}

function proteinKeys(spec: RecipeSpec): string[] {
  const vegan = spec.diets.includes('vegan');
  const keys: string[] = [];
  addProteinsFromLabel(spec.label, keys);
  if (keys.includes('chicken') && keys.includes('turkey')) {
    const label = normalizeSearchText(spec.label);
    if (label.includes('dinde') && !label.includes('poulet')) {
      keys.splice(keys.indexOf('chicken'), 1);
    } else {
      keys.splice(keys.indexOf('turkey'), 1);
    }
  }
  if (keys.length > 0) return keys;
  if (isSeafoodPlate(spec.label)) return ['pollock', 'shrimp', 'mussels'];

  const tokens = tokensOf(spec.protein);
  if (isWhiteBag(tokens)) keys.push('chicken');
  else if (isFishBag(tokens)) keys.push('pollock');
  else if (isLegumeBag(tokens)) keys.push(vegan ? 'chickpeas' : 'lentils');
  else {
    for (const token of tokens) {
      const key = proteinFromText(token);
      if (key && !keys.includes(key)) keys.push(key);
    }
  }
  if (keys.length > 0) return keys;
  if (spec.protein === true) return [vegan ? 'chickpeas' : 'chicken'];
  if (vegan || spec.diets.includes('vegetarian')) return ['lentils'];
  return [];
}

function proteinKey(spec: RecipeSpec): string | null {
  return proteinKeys(spec)[0] ?? null;
}

function vegKeys(spec: RecipeSpec): string[] {
  const tokens = tokensOf(spec.vegetable);
  const keys: string[] = [];
  const push = (key: string) => {
    if (!keys.includes(key)) keys.push(key);
  };
  if (matches(tokens, ['tomate'])) push('tomato');
  if (matches(tokens, ['courgette'])) push('zucchini');
  if (matches(tokens, ['aubergine'])) push('eggplant');
  if (matches(tokens, ['poivron'])) push('bellPepper');
  if (matches(tokens, ['concombre'])) push('cucumber');
  if (matches(tokens, ['carotte'])) push('carrot');
  if (matches(tokens, ['chou-fleur', 'chou'])) push(matches(tokens, ['chou-fleur']) ? 'cauliflower' : 'cabbage');
  if (matches(tokens, ['betterave'])) push('beet');
  if (matches(tokens, ['potiron', 'butternut', 'courge'])) push('pumpkin');
  if (matches(tokens, ['asperge'])) push('asparagus');
  if (matches(tokens, ['artichaut'])) push('artichoke');
  if (matches(tokens, ['champignon'])) push('mushroom');
  if (matches(tokens, ['epinard', 'épinard'])) push('spinach');
  if (matches(tokens, ['haricot'])) push('greenBean');
  if (spec.vegetable === true && keys.length === 0) {
    push('zucchini');
    push('tomato');
  }
  if (keys.length === 0 && spec.vegetable) {
    push('salad');
  }
  return keys.slice(0, 3);
}

function starchKey(spec: RecipeSpec): string | null {
  const tokens = tokensOf(spec.starch);
  if (matches(tokens, ['quinoa'])) return 'quinoa';
  if (matches(tokens, ['riz'])) return 'rice';
  if (matches(tokens, ['pate', 'spaghetti', 'nouille'])) return 'pasta';
  if (matches(tokens, ['couscous', 'semoule'])) return 'couscous';
  if (matches(tokens, ['avoine', 'flocon'])) return 'oats';
  if (matches(tokens, ['lentille'])) return 'lentils';
  if (matches(tokens, ['pois chiche'])) return 'chickpeas';
  if (matches(tokens, ['haricot'])) return 'whiteBeans';
  if (matches(tokens, ['patate douce', 'patate'])) return matches(tokens, ['douce']) ? 'sweetPotato' : 'potato';
  if (matches(tokens, ['pomme de terre'])) return 'potato';
  if (spec.starch === true) return spec.method === 'breakfast' ? 'oats' : 'rice';
  return null;
}

function vegGramsPerPerson(key: string): number {
  switch (key) {
    case 'tomato':
      return 150;
    case 'zucchini':
      return 180;
    case 'eggplant':
      return 200;
    case 'bellPepper':
      return 150;
    case 'cucumber':
      return 150;
    case 'carrot':
      return 120;
    case 'cauliflower':
      return 180;
    case 'cabbage':
      return 150;
    case 'beet':
      return 140;
    case 'pumpkin':
      return 200;
    case 'asparagus':
      return 150;
    case 'artichoke':
      return 120;
    case 'mushroom':
      return 120;
    case 'spinach':
      return 120;
    case 'greenBean':
      return 160;
    default:
      return 100;
  }
}

function proteinGramsPerPerson(key: string): number {
  switch (key) {
    case 'lentils':
    case 'chickpeas':
    case 'whiteBeans':
      return PER_PERSON.legumesG;
    case 'tofu':
      return PER_PERSON.tofuG;
    case 'shrimp':
      return PER_PERSON.shrimpG;
    case 'walnut':
      return PER_PERSON.walnutG;
    default:
      return PER_PERSON.meatFishG;
  }
}

function proteinLine(key: string, spec: RecipeSpec, share = 1): OfficialLine {
  switch (key) {
    case 'egg': {
      const eggsEach = spec.method === 'omelette' || spec.egg ? 2 : 1;
      return piece('egg', eggsEach * OFFICIAL_HEALTHY_SERVINGS, 60);
    }
    case 'walnut':
      return g(key, forPeople(PER_PERSON.walnutG));
    default:
      return g(key, forPeople(Math.max(40, Math.round(proteinGramsPerPerson(key) * share))));
  }
}

function starchLine(key: string): OfficialLine {
  if (key === 'oats') return g(key, forPeople(PER_PERSON.oatsG));
  if (key === 'couscous') return g(key, forPeople(PER_PERSON.couscousG));
  if (key === 'potato' || key === 'sweetPotato') {
    return piece(key, OFFICIAL_HEALTHY_SERVINGS, PER_PERSON.potatoG);
  }
  return g(key, forPeople(PER_PERSON.cerealG));
}

function mention(key: string): string {
  return `[[ing:${key}]]`;
}

function uniqueLines(lines: OfficialLine[]): OfficialLine[] {
  const seen = new Set<string>();
  const result: OfficialLine[] = [];
  for (const line of lines) {
    if (seen.has(line.key)) continue;
    seen.add(line.key);
    result.push(line);
  }
  return result;
}

const PROTEIN_STEP_KEYS = [
  'chicken',
  'turkey',
  'pork',
  'salmon',
  'cod',
  'hake',
  'pollock',
  'trout',
  'tuna',
  'sardine',
  'mackerel',
  'shrimp',
  'mussels',
  'lentils',
  'chickpeas',
  'whiteBeans',
  'tofu',
  'walnut',
  'egg',
] as const;

const VEG_STEP_KEYS = [
  'tomato',
  'zucchini',
  'eggplant',
  'bellPepper',
  'cucumber',
  'carrot',
  'cauliflower',
  'cabbage',
  'beet',
  'pumpkin',
  'asparagus',
  'artichoke',
  'mushroom',
  'spinach',
  'greenBean',
  'salad',
  'onion',
  'garlic',
] as const;

const STARCH_STEP_KEYS = ['rice', 'quinoa', 'pasta', 'couscous', 'oats', 'potato', 'sweetPotato'] as const;
const OIL_STEP_KEYS = ['oliveOil', 'sunflowerOil'] as const;
const SALT_STEP_KEYS = ['salt', 'pepper'] as const;
const AROMA_STEP_KEYS = ['lemon', 'paprika', 'provence', 'soy', 'mustard', 'ginger', 'basil'] as const;

function pickKeys(keys: readonly string[], pool: readonly string[]): string[] {
  return pool.filter((key) => keys.includes(key));
}

function mentionList(keys: readonly string[]): string {
  return joinFrench(keys.map(mention));
}

function finishSteps(
  keys: string[],
  steps: Array<{ description: string; durationMinutes?: number } | null | undefined>,
): Array<{ description: string; durationMinutes?: number }> {
  const kept = steps.filter(
    (step): step is { description: string; durationMinutes?: number } => Boolean(step?.description),
  );
  const blob = kept.map((step) => step.description).join(' ');
  const missing = keys.filter((key) => !blob.includes(`[[ing:${key}]]`));
  if (missing.length === 0) return kept;
  return [
    ...kept,
    {
      description: `Incorporer ${mentionList(missing)} en fin de préparation, mélanger, goûter, puis servir.`,
      durationMinutes: 2,
    },
  ];
}

function isFishProtein(keys: readonly string[]): boolean {
  return keys.some((key) => (FISH_PROTEIN_KEYS as readonly string[]).includes(key));
}

function donenessOf(proteins: readonly string[]): string {
  if (proteins.includes('shrimp')) return 'les crevettes sont roses et recroquevillées';
  if (proteins.includes('mussels')) return 'les moules sont ouvertes (jeter celles qui restent fermées)';
  if (isFishProtein(proteins)) return 'la chair est opaque et se détache à la fourchette';
  if (proteins.includes('tofu')) return 'le tofu est doré';
  if (proteins.some((key) => ['lentils', 'chickpeas', 'whiteBeans'].includes(key))) {
    return 'c’est bien chaud tout au centre';
  }
  return 'la viande est cuite à cœur (le jus qui s’écoule est clair)';
}

function skilletTimeOf(proteins: readonly string[]): string {
  if (proteins.includes('shrimp') || proteins.includes('mussels')) return '2 à 3 min';
  if (isFishProtein(proteins)) return '3 à 4 min par face';
  if (proteins.some((key) => ['lentils', 'chickpeas', 'whiteBeans', 'tofu'].includes(key))) {
    return '4 à 5 min en remuant';
  }
  return '6 à 8 min par face';
}

function ovenCelsius(spec: RecipeSpec): number {
  if (spec.method === 'parcel' || spec.method === 'bake') return 180;
  return 200;
}

function stepsFor(spec: RecipeSpec, keys: string[]): Array<{ description: string; durationMinutes?: number }> {
  const proteins = pickKeys(keys, PROTEIN_STEP_KEYS);
  const vegs = pickKeys(keys, VEG_STEP_KEYS);
  const starches = pickKeys(keys, STARCH_STEP_KEYS);
  const oils = pickKeys(keys, OIL_STEP_KEYS);
  const salts = pickKeys(keys, SALT_STEP_KEYS);
  const aromas = pickKeys(keys, AROMA_STEP_KEYS);
  const classified = new Set([...proteins, ...vegs, ...starches, ...oils, ...salts, ...aromas]);
  const extras = keys.filter((key) => !classified.has(key));
  const oilText = oils.length ? mentionList(oils) : 'un filet d’huile';
  const vegText = mentionList(vegs);
  const proteinText = mentionList(proteins);
  const starchText = mentionList(starches);
  const extraText = mentionList(extras);
  const aromaText = mentionList(aromas);
  const saltText = mentionList(salts);
  const proteinVeg = mentionList([...proteins, ...vegs]) || 'les ingrédients';
  const cutText = mentionList([...proteins, ...vegs, ...starches]) || proteinVeg;
  const seasonText = mentionList([...oils, ...aromas, ...extras, ...salts]) || oilText;
  const dressText = mentionList([...oils, ...aromas, ...salts]) || oilText;
  const marinadeText = mentionList([...oils, ...aromas, ...salts]) || oilText;
  const cook = spec.cook || 15;
  const otherProteins = proteins.filter((key) => key !== 'egg');
  const garnishText = mentionList([...vegs, ...extras, ...otherProteins]);
  const eggText = proteins.includes('egg') ? mention('egg') : proteinText || mention('egg');
  const label = spec.label.toLowerCase();
  const rawProtein = /ceviche|tartare/.test(label);
  const pancake = /pancake|galette/.test(label);
  const doneness = donenessOf(proteins);
  const skilletTime = skilletTimeOf(proteins);
  const celsius = ovenCelsius(spec);

  switch (spec.method) {
    case 'salad':
      return finishSteps(keys, [
        {
          description: vegText
            ? `Laver ${vegText} à l’eau froide, bien les essuyer (essoreuse à salade ou papier absorbant) pour qu’ils restent croquants, puis les tailler.`
            : `Préparer ${proteinVeg} : laver, essuyer, tailler en morceaux réguliers.`,
          durationMinutes: 8,
        },
        rawProtein || !proteinText
          ? {
              description: proteinText
                ? `Couper ${proteinText} en dés. Les faire mariner 10 min avec ${mentionList([...aromas, ...salts]) || saltText || 'un peu de sel'}, au frais.`
                : `Préparer ${mentionList([...starches, ...extras]) || 'le reste des ingrédients'}.`,
              durationMinutes: 10,
            }
          : {
              description: `Sécher ${proteinText}. Chauffer ${oilText} dans une poêle, cuire ${skilletTime} à feu moyen, jusqu’à ce que ${doneness}. Laisser reposer 3 min, puis émincer.`,
              durationMinutes: Math.max(8, Math.min(cook || 12, 16)),
            },
        starchText
          ? {
              description: `Cuire ${starchText} dans une eau ${salts.includes('salt') ? `avec ${mention('salt')}` : 'légèrement salée'} selon le paquet, égoutter, laisser tiédir.`,
              durationMinutes: 15,
            }
          : null,
        {
          description: `Dans un bol, fouetter ${dressText} jusqu’à ce que la vinaigrette soit liée. Goûter, ajuster.`,
          durationMinutes: 3,
        },
        {
          description: `Dans un saladier, réunir ${mentionList([...proteins, ...vegs, ...starches, ...extras]) || proteinVeg}. Napper de vinaigrette, mélanger délicatement juste avant de servir, pour ne pas ramollir les feuilles.`,
          durationMinutes: 4,
        },
      ]);
    case 'soup':
      return finishSteps(keys, [
        {
          description: `Éplucher et tailler ${vegText || proteinVeg} en morceaux réguliers (plus fins si tu veux mixer ensuite).`,
          durationMinutes: 8,
        },
        {
          description: `Chauffer ${oilText} dans une casserole à feu moyen. Faire suer ${vegs.includes('onion') ? mention('onion') : vegText || 'les légumes'} 5 min sans les laisser colorer.`,
          durationMinutes: 5,
        },
        mentionList([...proteins, ...starches])
          ? {
              description: `Ajouter ${mentionList([...proteins, ...starches])}, mélanger 2 min pour les enrober de matière grasse.`,
              durationMinutes: 2,
            }
          : null,
        {
          description: `Mouiller avec ${extraText || 'de l’eau à hauteur'}. Porter à ébullition, puis laisser mijoter à couvert ${String(spec.cook || 20)} min, jusqu’à ce que tout soit tendre.`,
          durationMinutes: spec.cook || 20,
        },
        {
          description: `Mixer pour un velouté, ou laisser en morceaux. Rectifier avec ${mentionList([...aromas, ...salts]) || saltText}. Servir bien chaud.`,
          durationMinutes: 4,
        },
      ]);
    case 'curry':
    case 'stew':
      return finishSteps(keys, [
        {
          description: `Tailler ${cutText} en morceaux réguliers. Réserver chaque élément à part.`,
          durationMinutes: 8,
        },
        {
          description: `Chauffer ${oilText} dans une casserole. Faire revenir ${vegs.includes('onion') ? mention('onion') : vegText || 'les aromates'} 5 min, jusqu’à ce qu’ils dore légèrement.`,
          durationMinutes: 5,
        },
        proteinText
          ? {
              description: `Ajouter ${proteinText}, saisir ${skilletTime} pour bien colorer. ${aromaText ? `Parsemer ${aromaText}, remuer 1 min pour que les épices cuisent sans brûler.` : ''}`,
              durationMinutes: 6,
            }
          : aromaText
            ? {
                description: `Ajouter ${aromaText}, remuer 1 min à feu moyen pour que les épices s’ouvrent.`,
                durationMinutes: 1,
              }
            : null,
        {
          description: `Ajouter ${mentionList([...vegs, ...starches]) || vegText || 'le reste'}${extraText ? ` et ${extraText}` : ''}. Porter à petit frémissement, couvrir.`,
          durationMinutes: 3,
        },
        {
          description: `Mijoter ${String(spec.cook || 20)} min à feu doux, en remuant de temps en temps. C’est prêt quand ${doneness} et que la sauce a un peu réduit. Goûter, ajuster ${saltText || 'l’assaisonnement'}. Servir bien chaud.`,
          durationMinutes: spec.cook || 20,
        },
      ]);
    case 'wok':
      return finishSteps(keys, [
        {
          description: `Tailler ${cutText} en lamelles ou en dés réguliers, de même taille pour une cuisson homogène. Préparer ${mentionList([...aromas, ...extras]) || 'la sauce'} à portée de main : le wok va vite.`,
          durationMinutes: 10,
        },
        starchText
          ? {
              description: `Cuire ${starchText} selon le paquet (eau bouillante ${salts.includes('salt') ? `avec ${mention('salt')}` : ''}), égoutter, réserver.`,
              durationMinutes: 10,
            }
          : null,
        {
          description: `Chauffer le wok à feu vif jusqu’à ce qu’il fume légèrement, puis ajouter ${oilText}. ${proteinText ? `Saisir ${proteinText} ${skilletTime}, réserver.` : 'Enrober le fond d’huile.'}`,
          durationMinutes: 5,
        },
        {
          description: `Jeter ${vegText || 'les légumes'} dans le wok, sauter 3 à 4 min en remuant sans cesse : ils doivent rester croquants.`,
          durationMinutes: 4,
        },
        {
          description: `Remettre ${mentionList([...proteins, ...starches]) || 'le tout'}${aromaText || extraText ? `, ajouter ${mentionList([...aromas, ...extras])}` : ''}. Sauter encore 2 min. Goûter, ajuster ${saltText || 'l’assaisonnement'}. Servir tout de suite.`,
          durationMinutes: spec.cook || 4,
        },
      ]);
    case 'pasta':
      return finishSteps(keys, [
        {
          description: `Porter une grande casserole d’eau à ébullition${salts.includes('salt') ? `, ajouter ${mention('salt')}` : ''}.`,
          durationMinutes: 5,
        },
        {
          description: `Cuire ${starchText || 'les pâtes'} al dente selon le temps indiqué sur le paquet. Prélever une louche d’eau de cuisson, puis égoutter.`,
          durationMinutes: 10,
        },
        {
          description: `Pendant ce temps, tailler ${mentionList([...proteins, ...vegs]) || proteinVeg}.`,
          durationMinutes: 6,
        },
        {
          description: `Chauffer ${oilText} dans une poêle à feu moyen. ${proteinText ? `Saisir ${proteinText} ${skilletTime}, jusqu’à ce que ${doneness}. ` : ''}Ajouter ${vegText || 'la garniture'}, cuire 4 à 5 min.`,
          durationMinutes: 10,
        },
        {
          description: `Verser ${starchText || 'les pâtes'} dans la poêle${extraText || aromaText ? `, ajouter ${mentionList([...extras, ...aromas])}` : ''}. Détendre avec un peu d’eau de cuisson, poivrer${salts.includes('pepper') ? ` avec ${mention('pepper')}` : ''}. Mélanger hors du feu et servir tout de suite.`,
          durationMinutes: 3,
        },
      ]);
    case 'omelette':
      return finishSteps(keys, [
        {
          description: `Casser ${eggText} dans un bol. Ajouter ${saltText || 'une pincée de sel'}, battre à la fourchette jusqu’à ce que le mélange soit homogène et un peu mousseux.`,
          durationMinutes: 3,
        },
        {
          description: `Laver et tailler ${garnishText || 'la garniture'} en petits morceaux, pour qu’ils cuisent vite et se répartissent dans l’omelette.`,
          durationMinutes: 6,
        },
        {
          description: `Chauffer ${oilText} dans une poêle antiadhésive à feu moyen. Faire revenir la garniture 4 à 6 min, jusqu’à ce qu’elle soit tendre et ait rendu un peu d’eau.`,
          durationMinutes: 6,
        },
        {
          description: `Baisser le feu. Verser les œufs, laisser prendre 1 min sans toucher, puis ramener les bords vers le centre avec une spatule en inclinant la poêle. ${aromaText ? `Parsemer ${aromaText}. ` : ''}Cuire encore ${String(Math.max(3, (spec.cook || 8) - 4))} min : le centre doit rester un peu baveux.`,
          durationMinutes: spec.cook || 8,
        },
        {
          description: `Plier l’omelette en deux, ou la laisser à plat façon frittata. Glisser dans l’assiette et servir immédiatement.`,
          durationMinutes: 1,
        },
      ]);
    case 'breakfast':
      return pancake
        ? finishSteps(keys, [
            {
              description: `Dans un saladier, écraser ${extraText || 'le fruit'} à la fourchette. Ajouter ${mentionList([...starches, ...proteins]) || 'la pâte'}, mélanger jusqu’à obtenir une pâte épaisse, sans grumeaux.`,
              durationMinutes: 5,
            },
            {
              description: `Laisser reposer 5 min : les ${starchText || 'flocons'} s’hydratent et la pâte épaissit. ${mentionList([...aromas, ...salts]) ? `Assaisonner avec ${mentionList([...aromas, ...salts])}.` : ''}`,
              durationMinutes: 5,
            },
            {
              description: `Chauffer une poêle à feu moyen avec ${oilText}. Quand elle est chaude, déposer de petites louches de pâte en les espaçant.`,
              durationMinutes: 2,
            },
            {
              description: `Cuire 2 à 3 min : des bulles apparaissent à la surface, le dessous est doré. Retourner, cuire encore 2 min. Régler le feu pour ne pas brûler.`,
              durationMinutes: spec.cook || 8,
            },
            {
              description: `Empiler les pancakes au fur et à mesure, tenir au chaud. Servir dès la dernière fournée.`,
              durationMinutes: 2,
            },
          ])
        : finishSteps(keys, [
            {
              description: `Dans un bol, réunir ${mentionList([...starches, ...proteins]) || 'la base'}${extraText ? ` et ${extraText}` : ''}. Mélanger énergiquement.`,
              durationMinutes: 4,
            },
            {
              description: `Laisser gonfler 5 à 10 min à température ambiante (ou une nuit au frais, couvert). Les ${starchText || 'flocons'} doivent être tendres, plus de croquant cru.`,
              durationMinutes: spec.cook || 8,
            },
            {
              description: `${oils.length ? `Pour une version tiède : chauffer ${oilText} dans une casserole, verser le mélange, cuire 3 min en remuant jusqu’à épaissir. ` : ''}Goûter${mentionList([...aromas, ...salts]) ? `, ajuster avec ${mentionList([...aromas, ...salts])}` : ''}.`,
              durationMinutes: 4,
            },
            {
              description: `Si c’est trop épais, détendre avec une cuillère d’eau. Dresser dans un bol et servir tout de suite, frais ou tiède.`,
              durationMinutes: 1,
            },
          ]);
    case 'parcel':
      return finishSteps(keys, [
        {
          description: `Préchauffer le four à ${String(celsius)} °C. Découper 2 grandes feuilles de papier cuisson (ou de papier d’aluminium).`,
          durationMinutes: 3,
        },
        {
          description: `Laver et tailler ${vegText || 'les légumes'} en lamelles fines, pour qu’ils cuisent en même temps que ${proteinText || 'le poisson'}. Essuyer ${proteinText || proteinVeg}.`,
          durationMinutes: 8,
        },
        {
          description: `Déposer ${proteinVeg} au centre de chaque feuille. Arroser de ${seasonText}.`,
          durationMinutes: 4,
        },
        {
          description: `Refermer en papillote hermétique : rabattre, puis plisser les bords pour que la vapeur ne s’échappe pas.`,
          durationMinutes: 3,
        },
        {
          description: `Enfourner ${String(spec.cook || 18)} min. C’est prêt quand ${doneness}. Ouvrir à table (attention à la vapeur) et servir dans la papillote.`,
          durationMinutes: spec.cook || 18,
        },
      ]);
    case 'oven':
    case 'bake':
      return finishSteps(keys, [
        {
          description: `Préchauffer le four à ${String(celsius)} °C, chaleur tournante. Chemiser une plaque de papier cuisson.`,
          durationMinutes: 5,
        },
        {
          description: `Laver ${vegText || 'les légumes'}. Tailler ${cutText} en morceaux réguliers. Essuyer ${proteinText || 'les pièces'} avec du papier absorbant : trop d’eau empêche de dorer.`,
          durationMinutes: 10,
        },
        {
          description: `Dans un saladier, mélanger ${marinadeText}. Enrober ${cutText} pour que chaque morceau soit filmé de marinade.`,
          durationMinutes: 4,
        },
        {
          description: `Répartir en une seule couche sur la plaque, sans tasser${extraText ? `. Glisser ${extraText} tout autour` : ''}.`,
          durationMinutes: 3,
        },
        {
          description: `Enfourner ${String(spec.cook || 25)} min. Remuer à mi-cuisson. C’est prêt quand ${doneness} et que les légumes sont tendres et colorés. Laisser reposer 5 min hors du four, servir avec le jus de cuisson.`,
          durationMinutes: spec.cook || 25,
        },
      ]);
    case 'bowl':
    case 'rice':
      return finishSteps(keys, [
        {
          description: starchText
            ? `Rincer ${starchText}. Le cuire dans une eau ${salts.includes('salt') ? `avec ${mention('salt')}` : 'légèrement salée'} selon le paquet, égoutter, tenir au chaud.`
            : `Préparer la base du bowl.`,
          durationMinutes: 15,
        },
        {
          description: `Laver et tailler ${vegText || 'les légumes'}. Essuyer ${proteinText || proteinVeg}.`,
          durationMinutes: 8,
        },
        proteinText
          ? {
              description: `Chauffer ${oilText} dans une poêle à feu moyen. Cuire ${proteinText} ${skilletTime}, jusqu’à ce que ${doneness}. Réserver, couvrir pour ne pas sécher.`,
              durationMinutes: 10,
            }
          : {
              description: `Chauffer ${oilText} dans une poêle.`,
              durationMinutes: 1,
            },
        vegText
          ? {
              description: `Dans la même poêle, faire sauter ${vegText} 4 à 6 min : ils doivent rester un peu fermes. ${aromaText ? `Déglacer avec ${aromaText}.` : ''}`,
              durationMinutes: 6,
            }
          : null,
        {
          description: `Dresser les bowls : ${starchText || 'la base'}, puis ${proteinVeg}${extraText ? `, ${extraText}` : ''}. Napper de ${dressText}. Servir tout de suite, encore tiède.`,
          durationMinutes: 4,
        },
      ]);
    default:
      return finishSteps(keys, [
        {
          description: `Laver et tailler ${vegText || 'les légumes'} en morceaux réguliers. Sécher ${proteinText || cutText}, le détailler si les pièces sont épaisses pour une cuisson homogène.`,
          durationMinutes: 8,
        },
        {
          description: `Assaisonner ${proteinText || cutText} avec ${mentionList([...aromas, ...salts]) || saltText || 'sel et poivre'}. Laisser poser 5 min le temps que la poêle chauffe.`,
          durationMinutes: 5,
        },
        {
          description: `Chauffer ${oilText} dans une poêle à feu moyen-vif. Quand l’huile chante, déposer ${proteinText || 'les pièces'} sans les serrer. Cuire ${skilletTime} sans trop les bouger, jusqu’à ce que ${doneness}. Réserver.`,
          durationMinutes: cook || 12,
        },
        vegText
          ? {
              description: `Dans la même poêle, faire revenir ${vegText}${starchText ? ` et ${starchText}` : ''} 5 à 7 min, jusqu’à ce qu’ils soient tendres et légèrement colorés.`,
              durationMinutes: 7,
            }
          : starchText
            ? {
                description: `Faire réchauffer ${starchText} dans la poêle 3 min.`,
                durationMinutes: 3,
              }
            : null,
        {
          description: `Remettre ${proteinText || 'le tout'}${extraText ? `, ajouter ${extraText}` : ''}. Mélanger 2 min à feu doux pour lier les jus. Goûter, ajuster ${saltText || 'l’assaisonnement'}. Servir bien chaud.`,
          durationMinutes: 3,
        },
      ]);
  }
}


function extraTags(spec: RecipeSpec): string[] {
  const tags = new Set(spec.tags);
  tags.add('healthy');
  tags.add(spec.kind);
  if (spec.method === 'breakfast' || spec.kind === 'petit-dejeuner') {
    tags.add('petit-dejeuner');
    tags.add('gouter');
  }
  if (spec.kind === 'salade' || spec.method === 'salad') tags.add('salade');
  if (spec.kind === 'soupe' || spec.method === 'soup') tags.add('soupe');
  if (spec.diets.includes('vegan')) tags.add('vegan');
  else if (spec.diets.includes('vegetarian')) tags.add('vegetarien');
  const protein = proteinKey(spec);
  if (protein === 'chicken' || protein === 'turkey' || protein === 'pork') {
    tags.add('viande');
    tags.add('proteine');
  }
  if (['salmon', 'cod', 'tuna', 'whiteFish'].includes(protein ?? '')) {
    tags.add('poisson');
    tags.add('proteine');
  }
  if (protein === 'shrimp' || protein === 'mussels') {
    tags.add('fruits-de-mer');
    tags.add('proteine');
  }
  return [...tags];
}

export function buildHealthyOfficialSpec(spec: RecipeSpec): OfficialHealthySpec {
  const vegan = spec.diets.includes('vegan');
  const servings = OFFICIAL_HEALTHY_SERVINGS;
  const lines: OfficialLine[] = [
    tbsp('oliveOil', servings, TBSP_OIL),
    pinch('salt', PINCH_SALT),
    pinch('pepper', PINCH_PEPPER),
  ];

  const proteins = proteinKeys(spec);
  const seafood = proteins.filter((key) => (SEAFOOD_PROTEIN_KEYS as readonly string[]).includes(key));
  const seafoodShare = seafood.length > 1 ? 1 / seafood.length : 1;
  for (const key of proteins) {
    const share = seafood.includes(key) ? seafoodShare : 1;
    lines.push(proteinLine(key, spec, share));
  }
  if (spec.egg) lines.push(proteinLine('egg', spec));

  const vegs = vegKeys(spec);
  for (const veg of vegs) {
    const share = vegs.length > 1 ? 0.75 : 1;
    lines.push(g(veg, Math.round(vegGramsPerPerson(veg) * servings * share)));
  }

  const starch = starchKey(spec);
  if (starch) lines.push(starchLine(starch));

  if (spec.dairy && !vegan) {
    lines.push(
      spec.tags.includes('salade')
        ? g('feta', forPeople(PER_PERSON.fetaG))
        : g('yogurt', forPeople(PER_PERSON.yogurtG)),
    );
  }
  if (spec.fruit) {
    const fruit = spec.label.toLowerCase().includes('orange') ? 'orange' : 'banana';
    lines.push(
      piece(fruit, servings, fruit === 'banana' ? PER_PERSON.bananaG : PER_PERSON.orangeG),
    );
  }
  if (spec.method === 'soup' || spec.method === 'stew' || spec.method === 'curry') {
    lines.push(g('onion', forPeople(PER_PERSON.onionG)));
    lines.push(g('water', forPeople(PER_PERSON.waterG)));
  }
  if (spec.method === 'curry') {
    lines.push(tsp('paprika'));
    if (spec.label.toLowerCase().includes('coco')) {
      lines.push(g('coconutMilk', forPeople(PER_PERSON.coconutMilkG)));
    }
  }
  if (spec.method === 'wok' || spec.label.toLowerCase().includes('soja')) {
    lines.push(tbsp('soy', servings, 18));
  }
  if (spec.label.toLowerCase().includes('citron') || spec.method === 'salad' || spec.method === 'parcel') {
    lines.push(tbsp('lemon', servings));
  }
  if (spec.label.toLowerCase().includes('gingembre')) {
    lines.push(tsp('ginger', 4));
  }
  if (spec.label.toLowerCase().includes('moutarde')) {
    lines.push(tsp('mustard', 8));
  }
  if (spec.label.toLowerCase().includes('olive')) {
    lines.push(g('olive', forPeople(PER_PERSON.oliveG)));
  }
  if (spec.label.toLowerCase().includes('feta')) {
    lines.push(g('feta', forPeople(PER_PERSON.fetaG)));
  }
  if (/thym|herbes|proven[cç]/.test(spec.label.toLowerCase())) {
    lines.push(tsp('provence'));
  }
  if (spec.label.toLowerCase().includes('basilic')) {
    lines.push(g('basil', forPeople(PER_PERSON.basilG)));
  }
  if (spec.label.toLowerCase().includes('chèvre') || spec.label.toLowerCase().includes('chevre')) {
    lines.push(g('goat', forPeople(PER_PERSON.goatG)));
  }
  if (spec.label.toLowerCase().includes('avocat')) {
    lines.push(piece('avocado', servings, PER_PERSON.avocadoG));
  }

  const ingredients = uniqueLines(lines);
  if (ingredients.length < 2) {
    ingredients.push(g('tomato', forPeople(vegGramsPerPerson('tomato'))));
  }

  return {
    id: `official-${spec.id}`,
    name: spec.label,
    description: `Plat healthy maison, pour ${String(servings)} personnes. Recette originale Cuisinons, inspirée d’une idée de ${spec.source} sans en reprendre le texte.`,
    servings,
    prepTimeMinutes: spec.prep,
    cookTimeMinutes: spec.cook,
    tagSlugs: extraTags(spec),
    equipmentSlugs: [...spec.equipment],
    photoSlug: PHOTO_BY_METHOD[spec.method],
    ingredients,
    steps: stepsFor(spec, ingredients.map((line) => line.key)),
  };
}

export function buildHealthyOfficialSpecs(): OfficialHealthySpec[] {
  return HEALTHY_RECIPES.map(buildHealthyOfficialSpec);
}

export const HEALTHY_OFFICIAL_COUNT = HEALTHY_RECIPES.length;
export const HANDCRAFTED_OFFICIAL_COUNT = 22;
export const OFFICIAL_RECIPE_COUNT = HANDCRAFTED_OFFICIAL_COUNT + HEALTHY_OFFICIAL_COUNT;

/** Banque « Idées » : toutes les fiches healthy déjà photographiées. */
export const IDEAS_RECIPE_IDS = HEALTHY_RECIPES.map((spec) => `official-${spec.id}`);
export const IDEAS_RECIPE_COUNT = IDEAS_RECIPE_IDS.length;

export const RECIPE_LIST_VIEWS = ['mine', 'ideas'] as const;
export type RecipeListView = (typeof RECIPE_LIST_VIEWS)[number];

export function isIdeasRecipeId(id: string): boolean {
  return id.startsWith('official-h');
}
