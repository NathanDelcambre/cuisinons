import type { QuantityUnit } from '../nutrition/units.js';
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
  mustard: { key: 'mustard', code: null, names: ['moutarde'] },
  chicken: { key: 'chicken', code: 36017, names: ['poulet, filet'] },
  turkey: { key: 'turkey', code: null, names: ['dinde, escalope', 'dinde, viande'] },
  pork: { key: 'pork', code: null, names: ['porc, filet mignon', 'filet mignon'] },
  salmon: { key: 'salmon', code: null, names: ['saumon, cru'] },
  cod: { key: 'cod', code: null, names: ['cabillaud, cru'] },
  hake: { key: 'hake', code: null, names: ['merlu, cru'] },
  pollock: { key: 'pollock', code: null, names: ['lieu, cru'] },
  trout: { key: 'trout', code: null, names: ['truite, crue', 'truite, cru'] },
  tuna: { key: 'tuna', code: null, names: ['thon, cru', 'thon au naturel'] },
  sardine: { key: 'sardine', code: null, names: ['sardine, crue', 'sardine'] },
  mackerel: { key: 'mackerel', code: null, names: ['maquereau, cru'] },
  shrimp: { key: 'shrimp', code: null, names: ['crevette'] },
  mussels: { key: 'mussels', code: null, names: ['moule'] },
  lentils: { key: 'lentils', code: null, names: ['lentille, cuite', 'lentilles vertes'] },
  chickpeas: { key: 'chickpeas', code: null, names: ['pois chiche, cuit'] },
  whiteBeans: { key: 'whiteBeans', code: null, names: ['haricot blanc, cuit'] },
  tofu: { key: 'tofu', code: null, names: ['tofu'] },
  egg: { key: 'egg', code: 22000, names: ['oeuf de poule'] },
  rice: { key: 'rice', code: 9100, names: ['riz blanc'] },
  quinoa: { key: 'quinoa', code: null, names: ['quinoa, cuit', 'quinoa'] },
  pasta: { key: 'pasta', code: null, names: ['pates cuites', 'spaghetti'] },
  couscous: { key: 'couscous', code: null, names: ['semoule de ble', 'couscous'] },
  oats: { key: 'oats', code: 32140, names: ['flocons d avoine'] },
  potato: { key: 'potato', code: null, names: ['pomme de terre'] },
  sweetPotato: { key: 'sweetPotato', code: 4101, names: ['patate douce'] },
  tomato: { key: 'tomato', code: 20192, names: ['tomate'] },
  zucchini: { key: 'zucchini', code: 20020, names: ['courgette'] },
  eggplant: { key: 'eggplant', code: 20053, names: ['aubergine'] },
  bellPepper: { key: 'bellPepper', code: 20041, names: ['poivron'] },
  cucumber: { key: 'cucumber', code: 20019, names: ['concombre'] },
  onion: { key: 'onion', code: 20034, names: ['oignon'] },
  carrot: { key: 'carrot', code: null, names: ['carotte'] },
  cauliflower: { key: 'cauliflower', code: null, names: ['chou-fleur'] },
  cabbage: { key: 'cabbage', code: null, names: ['chou, cru'] },
  beet: { key: 'beet', code: null, names: ['betterave'] },
  pumpkin: { key: 'pumpkin', code: null, names: ['potiron', 'butternut'] },
  asparagus: { key: 'asparagus', code: null, names: ['asperge'] },
  artichoke: { key: 'artichoke', code: null, names: ['artichaut'] },
  mushroom: { key: 'mushroom', code: null, names: ['champignon'] },
  greenBean: { key: 'greenBean', code: null, names: ['haricot vert'] },
  salad: { key: 'salad', code: null, names: ['salade verte', 'laitue'] },
  avocado: { key: 'avocado', code: 13004, names: ['avocat'] },
  banana: { key: 'banana', code: null, names: ['banane'] },
  orange: { key: 'orange', code: null, names: ['orange'] },
  feta: { key: 'feta', code: 12066, names: ['feta'] },
  goat: { key: 'goat', code: null, names: ['fromage de chevre'] },
  yogurt: { key: 'yogurt', code: 19644, names: ['fromage blanc'] },
  milk: { key: 'milk', code: 19041, names: ['lait demi-ecreme'] },
  coconutMilk: { key: 'coconutMilk', code: null, names: ['lait de coco'] },
  walnut: { key: 'walnut', code: null, names: ['noix'] },
  olive: { key: 'olive', code: null, names: ['olive'] },
  ginger: { key: 'ginger', code: null, names: ['gingembre'] },
  basil: { key: 'basil', code: null, names: ['basilic'] },
  water: { key: 'water', code: 18066, names: ['eau'] },
};

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

function proteinKey(spec: RecipeSpec): string | null {
  const vegan = spec.diets.includes('vegan');
  const tokens = tokensOf(spec.protein);
  if (matches(tokens, ['porc', 'mignon'])) return 'pork';
  if (matches(tokens, ['dinde'])) return 'turkey';
  if (matches(tokens, ['poulet'])) return 'chicken';
  if (matches(tokens, ['saumon'])) return 'salmon';
  if (matches(tokens, ['cabillaud'])) return 'cod';
  if (matches(tokens, ['merlu'])) return 'hake';
  if (matches(tokens, ['lieu', 'colin'])) return 'pollock';
  if (matches(tokens, ['truite'])) return 'trout';
  if (matches(tokens, ['thon'])) return 'tuna';
  if (matches(tokens, ['sardine'])) return 'sardine';
  if (matches(tokens, ['maquereau'])) return 'mackerel';
  if (matches(tokens, ['crevette'])) return 'shrimp';
  if (matches(tokens, ['moule'])) return 'mussels';
  if (matches(tokens, ['lentille'])) return 'lentils';
  if (matches(tokens, ['pois chiche', 'pois-chiche'])) return 'chickpeas';
  if (matches(tokens, ['haricot'])) return 'whiteBeans';
  if (matches(tokens, ['tofu'])) return 'tofu';
  if (matches(tokens, ['noix'])) return 'walnut';
  if (spec.protein === true) return vegan ? 'chickpeas' : 'chicken';
  if (vegan) return 'lentils';
  return spec.diets.includes('vegetarian') ? 'lentils' : null;
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
    case 'greenBean':
      return 160;
    default:
      return 100;
  }
}

function proteinLine(key: string, spec: RecipeSpec): OfficialLine {
  switch (key) {
    case 'egg': {
      const eggsEach = spec.method === 'omelette' || spec.egg ? 2 : 1;
      return piece('egg', eggsEach * OFFICIAL_HEALTHY_SERVINGS, 60);
    }
    case 'lentils':
    case 'chickpeas':
    case 'whiteBeans':
      return g(key, forPeople(PER_PERSON.legumesG));
    case 'tofu':
      return g(key, forPeople(PER_PERSON.tofuG));
    case 'shrimp':
      return g(key, forPeople(PER_PERSON.shrimpG));
    case 'walnut':
      return g(key, forPeople(PER_PERSON.walnutG));
    default:
      return g(key, forPeople(PER_PERSON.meatFishG));
  }
}

function starchLine(key: string): OfficialLine {
  if (key === 'oats') return g(key, forPeople(PER_PERSON.oatsG));
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

function stepsFor(spec: RecipeSpec, keys: string[]): Array<{ description: string; durationMinutes?: number }> {
  const first = keys[0] ? mention(keys[0]) : 'les ingrédients';
  const veg = keys.find((key) =>
    ['tomato', 'zucchini', 'eggplant', 'bellPepper', 'cucumber', 'carrot', 'salad', 'onion'].includes(key),
  );
  const vegText = veg ? mention(veg) : 'les légumes';
  const oil = keys.includes('oliveOil') ? mention('oliveOil') : 'un filet d’huile';
  const protein = keys.find((key) =>
    ['chicken', 'turkey', 'pork', 'salmon', 'cod', 'hake', 'pollock', 'trout', 'tuna', 'sardine', 'mackerel', 'shrimp', 'lentils', 'chickpeas', 'tofu'].includes(key),
  );
  const proteinText = protein ? mention(protein) : first;

  switch (spec.method) {
    case 'salad':
      return [
        { description: `Laver et tailler ${vegText}. Essuyer pour qu’ils restent croquants.`, durationMinutes: 8 },
        { description: `Réunir ${proteinText} et les autres ingrédients dans un saladier.`, durationMinutes: 4 },
        { description: `Assaisonner avec ${oil}, ${mention('lemon')}, ${mention('salt')} et ${mention('pepper')}. Mélanger juste avant de servir.`, durationMinutes: 3 },
      ];
    case 'soup':
      return [
        { description: `Émincer ${mention('onion')} et ${vegText}.`, durationMinutes: 6 },
        { description: `Faire suer dans ${oil}, puis mouiller avec ${mention('water')}. Ajouter ${proteinText}.`, durationMinutes: 8 },
        { description: `Laisser mijoter jusqu’à ce que tout soit tendre, mixer si tu veux un velouté, rectifier ${mention('salt')} et ${mention('pepper')}.`, durationMinutes: spec.cook || 20 },
      ];
    case 'curry':
    case 'stew':
      return [
        { description: `Faire revenir ${mention('onion')} dans ${oil} jusqu’à ce qu’il dore.`, durationMinutes: 5 },
        { description: `Ajouter ${proteinText} et ${vegText}, puis les épices.`, durationMinutes: 6 },
        { description: `Mijoter à couvert, goûter, ajuster ${mention('salt')}. Servir bien chaud.`, durationMinutes: spec.cook || 20 },
      ];
    case 'wok':
      return [
        { description: `Tailler ${vegText} et ${proteinText} en morceaux réguliers.`, durationMinutes: 8 },
        { description: `Chauffer le wok avec ${oil}, saisir ${proteinText} à feu vif.`, durationMinutes: 5 },
        { description: `Ajouter ${vegText} et ${mention('soy')}, sauter encore quelques minutes. Servir tout de suite.`, durationMinutes: spec.cook || 8 },
      ];
    case 'pasta':
      return [
        { description: `Cuire ${mention('pasta')} dans une grande eau salée, puis égoutter.`, durationMinutes: 10 },
        { description: `Pendant ce temps, faire revenir ${proteinText} et ${vegText} dans ${oil}.`, durationMinutes: 8 },
        { description: `Mélanger les pâtes à la poêlée, poivrer, servir.`, durationMinutes: 2 },
      ];
    case 'omelette':
      return [
        { description: `Battre ${mention('egg')} avec ${mention('salt')} et ${mention('pepper')}.`, durationMinutes: 3 },
        { description: `Faire revenir ${vegText} dans ${oil}.`, durationMinutes: 6 },
        { description: `Verser les œufs, laisser prendre à feu moyen, puis servir.`, durationMinutes: spec.cook || 10 },
      ];
    case 'breakfast':
      return [
        { description: `Réunir ${mention('oats')} avec le liquide et les fruits.`, durationMinutes: 4 },
        { description: `Laisser épaissir, ou cuire à la poêle si tu veux des pancakes. Servir frais.`, durationMinutes: spec.cook || 5 },
      ];
    case 'parcel':
      return [
        { description: `Préchauffer le four. Déposer ${proteinText} et ${vegText} sur une feuille de papier cuisson.`, durationMinutes: 6 },
        { description: `Arroser de ${oil} et ${mention('lemon')}, refermer les papillotes.`, durationMinutes: 4 },
        { description: `Enfourner jusqu’à ce que le poisson ou la viande soit juste cuit. Ouvrir à table.`, durationMinutes: spec.cook || 18 },
      ];
    case 'oven':
    case 'bake':
      return [
        { description: `Préchauffer le four. Tailler ${vegText} et ${proteinText}.`, durationMinutes: 8 },
        { description: `Mélanger avec ${oil}, ${mention('salt')} et ${mention('pepper')}, répartir sur la plaque.`, durationMinutes: 5 },
        { description: `Enfourner jusqu’à coloration. Servir dès la sortie.`, durationMinutes: spec.cook || 25 },
      ];
    case 'bowl':
    case 'rice':
      return [
        { description: `Cuire l’accompagnement (céréale ou légumineuse) et le laisser tiédir.`, durationMinutes: 15 },
        { description: `Préparer ${proteinText} et ${vegText} à part.`, durationMinutes: 10 },
        { description: `Dresser les bowls, napper de ${oil} et ${mention('lemon')}.`, durationMinutes: 4 },
      ];
    default:
      return [
        { description: `Préparer ${proteinText} et ${vegText}.`, durationMinutes: 6 },
        { description: `Chauffer ${oil} dans la poêle, cuire ${proteinText} à feu moyen.`, durationMinutes: spec.cook || 12 },
        { description: `Ajouter ${vegText}, assaisonner, servir chaud.`, durationMinutes: 5 },
      ];
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
  if (proteinKey(spec) === 'chicken' || proteinKey(spec) === 'turkey' || proteinKey(spec) === 'pork') {
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

  const protein = spec.egg ? 'egg' : proteinKey(spec);
  if (protein) lines.push(proteinLine(protein, spec));
  if (spec.egg && protein !== 'egg') lines.push(proteinLine('egg', spec));

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
