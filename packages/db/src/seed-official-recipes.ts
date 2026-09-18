import { normalizeSearchText, type QuantityUnit } from '@cuisinons/shared';
import {
  buildHealthyOfficialSpecs,
  HEALTHY_INGREDIENTS,
  OFFICIAL_RECIPE_COUNT,
  pickHealthyIngredient,
} from '@cuisinons/shared';
import { prisma } from './client';
import { refreshRecipeNutritionSnapshot, refreshMissingNutritionSnapshots } from './recipe-nutrition';

const WHEY_CODE = 900010;
const WHEY_VANILLE_CODE = 900011;
const WHEY_CHOCOLAT_CODE = 900012;

type Line = {
  code: number;
  quantity: number;
  unit: QuantityUnit;
  grams: number;
  displayQuantity?: string;
};

type OfficialRecipe = {
  id: string;
  name: string;
  description: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  ingredients: Line[];
  steps: Array<{ description: string; durationMinutes?: number }>;
  tagSlugs: string[];
  equipmentSlugs: string[];
};

const TBSP_OIL = 13.5;
const TBSP_LIQUID = 15;
const TBSP_SOY = 18;
const TBSP_SOFT_CHEESE = 15;
const TBSP_HONEY = 21;
const TBSP_PEANUT = 18;
const TSP_SPICE = 2;
const TSP_HERBS = 1;
const TSP_CINNAMON = 2;
const SCOOP_WHEY = 25;
const SLICE_BREAD = 40;
const PIECE_APPLE = 150;
const PIECE_BANANA = 120;
const PINCH_SALT = 0.5;
const PINCH_PEPPER = 0.3;
const PIECE_TOMATO = 220;
const PIECE_CUCUMBER = 350;
const FETA_BLOCK = 200;
const PIECE_PEPPER = 150;
const PIECE_MOZZA = 125;
const PIECE_CHICKEN = 150;
const PIECE_SWEET_POTATO = 250;
const PIECE_AVOCADO = 140;
const PIECE_ONION = 90;
const PIECE_RED_ONION = 100;
const PIECE_EGGPLANT = 300;
const PIECE_ZUCCHINI = 250;
const PIECE_EGG = 60;
const CORN_HALF_CAN = 70;
const YEAST_PACKET = 11;

const CODE = {
  oliveOil: 17270,
  sunflowerOil: 17440,
  ciderVinegar: 11090,
  salt: 11058,
  pepper: 11015,
  fromageBlanc0: 19644,
  chives: 11003,
  tomatoRibbed: 20192,
  cucumber: 20019,
  feta: 12066,
  soySalty: 11104,
  soySweet: 11216,
  paprika: 11049,
  garlicPowder: 11023,
  lemonJuice: 2007,
  provence: 11060,
  water: 18066,
  rice: 9100,
  bellPepper: 20041,
  mozzarella: 19590,
  chicken: 36017,
  sweetPotato: 4101,
  avocado: 13004,
  corn: 20066,
  cheddar: 12726,
  creamCheese: 12068,
  oats: 32140,
  flourT45: 9440,
  egg: 22000,
  milk: 19041,
  bakingPowder: 11046,
  boursin: 12070,
  onion: 20034,
  redOnion: 20238,
  eggplant: 20053,
  zucchini: 20020,
  parmesan: 12120,
  butter: 16400,
  whey: WHEY_CODE,
  wheyVanille: WHEY_VANILLE_CODE,
  wheyChocolat: WHEY_CHOCOLAT_CODE,
  apple: 13620,
  banana: 13005,
  cinnamon: 11025,
  blueberry: 13028,
  strawberry: 13014,
  raspberry: 13015,
  almond: 15000,
  honey: 31008,
  spinach: 20059,
  wholeBread: 7110,
  cocoaPowder: 18100,
  peanutButter: 15202,
  date: 13011,
  darkChocolate: 31074,
  chia: 15047,
  skyr: 19663,
} as const;

function pinch(code: number): Line {
  return {
    code,
    quantity: 1,
    unit: 'PINCH',
    grams: code === CODE.salt ? PINCH_SALT : PINCH_PEPPER,
    displayQuantity: '1',
  };
}

function tsp(code: number, grams = TSP_SPICE): Line {
  return { code, quantity: 1, unit: 'TSP', grams, displayQuantity: '1' };
}

function tbsp(code: number, quantity: number, gramsPer = TBSP_LIQUID): Line {
  return {
    code,
    quantity,
    unit: 'TBSP',
    grams: quantity * gramsPer,
    displayQuantity: String(quantity),
  };
}

const RECIPES: OfficialRecipe[] = [
  {
    id: 'official-vinaigrette-crudites',
    name: 'Vinaigrette pour salade de crudités',
    description: 'Vinaigrette simple pour une portion de salade de crudités.',
    servings: 1,
    prepTimeMinutes: 2,
    cookTimeMinutes: 0,
    tagSlugs: ['sauce', 'vegetarien', 'vegan', 'healthy'],
    equipmentSlugs: ['saladier', 'fouet'],
    ingredients: [
      tbsp(CODE.oliveOil, 1, TBSP_OIL),
      tbsp(CODE.ciderVinegar, 2),
      pinch(CODE.salt),
      pinch(CODE.pepper),
    ],
    steps: [
      { description: 'Dans un bol ou un saladier, verser l’huile d’olive et le vinaigre de cidre.', durationMinutes: 1 },
      { description: 'Saler, poivrer, puis émulsionner au fouet (ou à la fourchette) jusqu’à ce que la vinaigrette soit liée.', durationMinutes: 1 },
      { description: 'Goûter et ajuster l’assaisonnement. Servir immédiatement sur les crudités.' },
    ],
  },
  {
    id: 'official-sauce-yaourt-salade',
    name: 'Sauce yaourt pour salade',
    description: 'Sauce fraîche au fromage blanc 0 %, pour une portion de salade.',
    servings: 1,
    prepTimeMinutes: 5,
    cookTimeMinutes: 0,
    tagSlugs: ['sauce', 'vegetarien', 'healthy'],
    equipmentSlugs: ['saladier', 'fouet', 'couteau'],
    ingredients: [
      { code: CODE.fromageBlanc0, quantity: 1, unit: 'JAR', grams: 100, displayQuantity: '1' },
      tbsp(CODE.oliveOil, 1, TBSP_OIL),
      tbsp(CODE.ciderVinegar, 1),
      { code: CODE.chives, quantity: 1, unit: 'TBSP', grams: 3, displayQuantity: '1' },
      pinch(CODE.salt),
      pinch(CODE.pepper),
    ],
    steps: [
      { description: 'Ciseler la ciboulette.', durationMinutes: 2 },
      { description: 'Dans un bol, mélanger le fromage blanc 0 %, l’huile d’olive et le vinaigre de cidre.', durationMinutes: 2 },
      { description: 'Ajouter la ciboulette, saler, poivrer, puis fouetter jusqu’à obtenir une sauce lisse. Réserver au frais jusqu’au service.' },
    ],
  },
  {
    id: 'official-salade-grecque',
    name: 'Salade à la grecque',
    description: 'Salade froide tomate, concombre et feta, pour 2 personnes.',
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 0,
    tagSlugs: ['salade', 'vegetarien', 'healthy'],
    equipmentSlugs: ['saladier', 'couteau'],
    ingredients: [
      { code: CODE.tomatoRibbed, quantity: 2, unit: 'PIECE', grams: 2 * PIECE_TOMATO, displayQuantity: '2' },
      { code: CODE.cucumber, quantity: 1, unit: 'PIECE', grams: PIECE_CUCUMBER, displayQuantity: '1' },
      { code: CODE.feta, quantity: 0.5, unit: 'PIECE', grams: Math.round(FETA_BLOCK / 2), displayQuantity: '1/2' },
    ],
    steps: [
      { description: 'Laver les tomates et le concombre.', durationMinutes: 1 },
      { description: 'Couper les tomates côtelées en quartiers ou en dés. Couper le concombre en demi-rondelles ou en dés.', durationMinutes: 6 },
      { description: 'Émietter le demi-bloc de feta sur les légumes, mélanger délicatement. Servir nature, ou avec la vinaigrette / la sauce yaourt.', durationMinutes: 3 },
    ],
  },
  {
    id: 'official-marinade-soja',
    name: 'Marinade viande au soja',
    description: 'Marinade salée-sucrée pour 2 filets de poulet minimum. Laisser poser au moins 1 h.',
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    tagSlugs: ['viande', 'sauce', 'proteine', 'poelee'],
    equipmentSlugs: ['saladier', 'poele'],
    ingredients: [
      { code: CODE.chicken, quantity: 2, unit: 'PIECE', grams: 2 * PIECE_CHICKEN, displayQuantity: '2' },
      tbsp(CODE.soySalty, 3, TBSP_SOY),
      tbsp(CODE.soySweet, 1, TBSP_SOY),
      tbsp(CODE.oliveOil, 1, TBSP_OIL),
      tbsp(CODE.water, 1),
      tsp(CODE.paprika),
      pinch(CODE.pepper),
      tsp(CODE.garlicPowder, 3),
    ],
    steps: [
      { description: 'Dans un saladier, mélanger les sauces soja, l’huile d’olive, l’eau, le paprika, l’ail en poudre et le poivre.', durationMinutes: 3 },
      { description: 'Ajouter les filets de poulet, bien les enrober, filmer et laisser mariner au frais au moins 1 h (idéalement une nuit).', durationMinutes: 60 },
      { description: 'Faire cuire les filets à la poêle 6 à 8 min de chaque côté, à feu moyen, jusqu’à ce qu’ils soient bien cuits. Trancher avant de servir.', durationMinutes: 15 },
    ],
  },
  {
    id: 'official-marinade-yaourt',
    name: 'Marinade viande yaourt',
    description: 'Marinade onctueuse au fromage blanc 0 % pour 2 filets de poulet minimum. Laisser poser au moins 1 h.',
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    tagSlugs: ['viande', 'sauce', 'proteine', 'healthy', 'poelee'],
    equipmentSlugs: ['saladier', 'poele'],
    ingredients: [
      { code: CODE.chicken, quantity: 2, unit: 'PIECE', grams: 2 * PIECE_CHICKEN, displayQuantity: '2' },
      tbsp(CODE.fromageBlanc0, 3, TBSP_SOFT_CHEESE),
      tbsp(CODE.oliveOil, 1, TBSP_OIL),
      tbsp(CODE.lemonJuice, 1),
      tsp(CODE.paprika),
      tsp(CODE.garlicPowder, 3),
      pinch(CODE.salt),
      pinch(CODE.pepper),
    ],
    steps: [
      { description: 'Dans un saladier, mélanger le fromage blanc, l’huile d’olive, le jus de citron, le paprika, l’ail en poudre, le sel et le poivre.', durationMinutes: 3 },
      { description: 'Enrober les filets de poulet, filmer et laisser mariner au frais au moins 1 h.', durationMinutes: 60 },
      { description: 'Cuire à la poêle 6 à 8 min de chaque côté à feu moyen. Trancher avant de servir.', durationMinutes: 15 },
    ],
  },
  {
    id: 'official-marinade-fraiche',
    name: 'Marinade viande fraîche',
    description: 'Marinade citron-herbes de Provence pour 2 filets de poulet minimum. Laisser poser au moins 1 h.',
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    tagSlugs: ['viande', 'sauce', 'proteine', 'healthy', 'poelee'],
    equipmentSlugs: ['saladier', 'poele'],
    ingredients: [
      { code: CODE.chicken, quantity: 2, unit: 'PIECE', grams: 2 * PIECE_CHICKEN, displayQuantity: '2' },
      tbsp(CODE.oliveOil, 1, TBSP_OIL),
      tbsp(CODE.lemonJuice, 2),
      pinch(CODE.salt),
      pinch(CODE.pepper),
      tsp(CODE.provence, TSP_HERBS),
    ],
    steps: [
      { description: 'Mélanger l’huile d’olive, le jus de citron, les herbes de Provence, le sel et le poivre.', durationMinutes: 2 },
      { description: 'Enrober les filets, filmer et laisser mariner au frais au moins 1 h.', durationMinutes: 60 },
      { description: 'Cuire à la poêle 6 à 8 min de chaque côté à feu moyen. Trancher avant de servir.', durationMinutes: 15 },
    ],
  },
  {
    id: 'official-salade-riz',
    name: 'Salade de riz',
    description:
      'Salade complète riz, crudités, mozzarella et sauce yaourt. Ajouter la protéine de ton choix au moment de servir (poulet, thon, œufs…).',
    servings: 2,
    prepTimeMinutes: 20,
    cookTimeMinutes: 15,
    tagSlugs: ['salade', 'riz', 'plat-principal', 'healthy'],
    equipmentSlugs: ['casserole', 'saladier', 'couteau', 'passoire'],
    ingredients: [
      { code: CODE.rice, quantity: 180, unit: 'G', grams: 180 },
      { code: CODE.bellPepper, quantity: 2, unit: 'PIECE', grams: 2 * PIECE_PEPPER, displayQuantity: '2' },
      { code: CODE.cucumber, quantity: 1, unit: 'PIECE', grams: PIECE_CUCUMBER, displayQuantity: '1' },
      { code: CODE.tomatoRibbed, quantity: 2, unit: 'PIECE', grams: 2 * PIECE_TOMATO, displayQuantity: '2' },
      { code: CODE.mozzarella, quantity: 1, unit: 'PIECE', grams: PIECE_MOZZA, displayQuantity: '1' },
      { code: CODE.fromageBlanc0, quantity: 1, unit: 'JAR', grams: 100, displayQuantity: '1' },
      tbsp(CODE.oliveOil, 1, TBSP_OIL),
      tbsp(CODE.ciderVinegar, 1),
      { code: CODE.chives, quantity: 1, unit: 'TBSP', grams: 3, displayQuantity: '1' },
      pinch(CODE.salt),
      pinch(CODE.pepper),
    ],
    steps: [
      { description: 'Rincer le riz, le cuire dans une casserole d’eau bouillante salée selon le paquet, puis l’égoutter et le laisser refroidir.', durationMinutes: 15 },
      { description: 'Couper les poivrons, le concombre et les tomates en dés. Couper la mozzarella en cubes.', durationMinutes: 8 },
      { description: 'Préparer la sauce yaourt : mélanger le fromage blanc 0 %, l’huile, le vinaigre, la ciboulette ciselée, le sel et le poivre.', durationMinutes: 3 },
      { description: 'Dans un saladier, réunir le riz tiède ou froid, les légumes et la mozzarella. Napper de sauce yaourt, mélanger. Ajouter la protéine de ton choix et servir.', durationMinutes: 4 },
    ],
  },
  {
    id: 'official-patate-douce-air-fryer',
    name: 'Patate douce au air fryer',
    description: 'Patate douce rôtie, croustillante, en accompagnement pour 2.',
    servings: 2,
    prepTimeMinutes: 8,
    cookTimeMinutes: 12,
    tagSlugs: ['accompagnement', 'vegetarien', 'vegan', 'healthy', 'four'],
    equipmentSlugs: ['air-fryer', 'econome', 'couteau', 'saladier'],
    ingredients: [
      { code: CODE.sweetPotato, quantity: 2, unit: 'PIECE', grams: 2 * PIECE_SWEET_POTATO, displayQuantity: '2' },
      tbsp(CODE.sunflowerOil, 3, TBSP_OIL),
      pinch(CODE.salt),
      pinch(CODE.pepper),
      tsp(CODE.paprika),
    ],
    steps: [
      { description: 'Éplucher les patates douces et les couper en cubes réguliers d’environ 2 cm.', durationMinutes: 6 },
      { description: 'Dans un saladier, mélanger les cubes avec l’huile de tournesol, le sel, le poivre et le paprika.', durationMinutes: 2 },
      { description: 'Enfourner dans l’air fryer en mode Air Fry à 200 °C pendant 12 min. Remuer à mi-cuisson, au bout de 6 min.', durationMinutes: 12 },
    ],
  },
  {
    id: 'official-tacos-bowl-mexicains',
    name: 'Tacos bowl mexicains',
    description:
      'Bowl pour 2 : patate douce rôtie, salade grecque, poulet marinade yaourt, avocat, maïs, cheddar et cream cheese.',
    servings: 2,
    prepTimeMinutes: 25,
    cookTimeMinutes: 20,
    tagSlugs: ['plat-principal', 'healthy', 'proteine', 'bowl'],
    equipmentSlugs: ['air-fryer', 'poele', 'saladier', 'couteau', 'econome'],
    ingredients: [
      { code: CODE.sweetPotato, quantity: 2, unit: 'PIECE', grams: 2 * PIECE_SWEET_POTATO, displayQuantity: '2' },
      tbsp(CODE.sunflowerOil, 3, TBSP_OIL),
      { code: CODE.chicken, quantity: 2, unit: 'PIECE', grams: 2 * PIECE_CHICKEN, displayQuantity: '2' },
      tbsp(CODE.fromageBlanc0, 3, TBSP_SOFT_CHEESE),
      tbsp(CODE.oliveOil, 1, TBSP_OIL),
      tbsp(CODE.lemonJuice, 1),
      tsp(CODE.paprika),
      tsp(CODE.garlicPowder, 3),
      pinch(CODE.salt),
      pinch(CODE.pepper),
      { code: CODE.tomatoRibbed, quantity: 2, unit: 'PIECE', grams: 2 * PIECE_TOMATO, displayQuantity: '2' },
      { code: CODE.cucumber, quantity: 1, unit: 'PIECE', grams: PIECE_CUCUMBER, displayQuantity: '1' },
      { code: CODE.feta, quantity: 0.5, unit: 'PIECE', grams: Math.round(FETA_BLOCK / 2), displayQuantity: '1/2' },
      { code: CODE.avocado, quantity: 1, unit: 'PIECE', grams: PIECE_AVOCADO, displayQuantity: '1' },
      { code: CODE.corn, quantity: 0.5, unit: 'JAR', grams: CORN_HALF_CAN, displayQuantity: '1/2' },
      { code: CODE.cheddar, quantity: 80, unit: 'G', grams: 80 },
      tbsp(CODE.creamCheese, 2, TBSP_SOFT_CHEESE),
    ],
    steps: [
      { description: 'Préparer le poulet : mélanger fromage blanc, huile d’olive, jus de citron, paprika, ail en poudre, sel et poivre. Enrober les filets et laisser mariner au moins 1 h.', durationMinutes: 60 },
      { description: 'Préparer la patate douce au air fryer (éplucher, cubes, huile de tournesol, sel, poivre, paprika, 12 min à 200 °C, remuer à 6 min).', durationMinutes: 12 },
      { description: 'Préparer la salade grecque : dés de tomate et de concombre, feta émiettée.', durationMinutes: 8 },
      { description: 'Cuire le poulet mariné à la poêle 6 à 8 min par face, puis le couper en lanières.', durationMinutes: 15 },
      { description: 'Couper l’avocat. Égoutter le demi-boîte de maïs. Râper le cheddar si besoin.', durationMinutes: 5 },
      { description: 'Dresser les bowls : patate douce, salade grecque, poulet, avocat, maïs, cheddar. Ajouter 1 c.à.s de cream cheese dans chaque assiette.', durationMinutes: 5 },
    ],
  },
  {
    id: 'official-pancake-proteine',
    name: 'Pancake protéiné',
    description: '8 pancakes, environ 96 kcal et 10,4 g de protéines par pancake.',
    servings: 8,
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    tagSlugs: ['petit-dejeuner', 'gouter', 'proteine', 'healthy'],
    equipmentSlugs: ['saladier', 'fouet', 'poele', 'balance', 'spatule'],
    ingredients: [
      { code: CODE.oats, quantity: 50, unit: 'G', grams: 50 },
      { code: CODE.flourT45, quantity: 20, unit: 'G', grams: 20 },
      { code: CODE.whey, quantity: 75, unit: 'G', grams: 75, displayQuantity: '3 scoops' },
      { code: CODE.egg, quantity: 2, unit: 'PIECE', grams: 2 * PIECE_EGG, displayQuantity: '2' },
      { code: CODE.milk, quantity: 160, unit: 'G', grams: 160 },
      { code: CODE.bakingPowder, quantity: 0.5, unit: 'SACHET', grams: YEAST_PACKET / 2, displayQuantity: '1/2' },
    ],
    steps: [
      { description: 'Dans un saladier, mélanger les flocons d’avoine, la farine T45, la whey et la levure chimique.', durationMinutes: 2 },
      { description: 'Ajouter les œufs et le lait, fouetter jusqu’à une pâte lisse un peu épaisse. Laisser reposer 5 min.', durationMinutes: 5 },
      { description: 'Chauffer une poêle antiadhésive à feu moyen. Verser de petites louches de pâte (environ 1/8e de la préparation par pancake).', durationMinutes: 2 },
      { description: 'Cuire 1 à 2 min par face, jusqu’à ce que des bulles apparaissent et que le dessous soit doré. Renouveler jusqu’à obtenir 8 pancakes.', durationMinutes: 16 },
    ],
  },
  {
    id: 'official-poivron-cocotte',
    name: 'Poivron cocotte',
    description: 'Poivrons farcis au Boursin, tomate, oignon, œuf et feta. Pour 2 personnes.',
    servings: 2,
    prepTimeMinutes: 20,
    cookTimeMinutes: 20,
    tagSlugs: ['plat-principal', 'vegetarien', 'four'],
    equipmentSlugs: ['four', 'poele', 'couteau'],
    ingredients: [
      { code: CODE.bellPepper, quantity: 2, unit: 'PIECE', grams: 2 * PIECE_PEPPER, displayQuantity: '2' },
      tbsp(CODE.boursin, 4, TBSP_SOFT_CHEESE),
      { code: CODE.feta, quantity: 1 / 3, unit: 'PIECE', grams: Math.round(FETA_BLOCK / 3), displayQuantity: '1/3' },
      { code: CODE.tomatoRibbed, quantity: 1, unit: 'PIECE', grams: PIECE_TOMATO, displayQuantity: '1' },
      { code: CODE.egg, quantity: 4, unit: 'PIECE', grams: 4 * PIECE_EGG, displayQuantity: '4' },
      { code: CODE.onion, quantity: 1, unit: 'PIECE', grams: PIECE_ONION, displayQuantity: '1' },
      tbsp(CODE.oliveOil, 1, TBSP_OIL),
    ],
    steps: [
      { description: 'Préchauffer le four à 180 °C (chaleur tournante). Pour le four de Nathan : 220 °C.', durationMinutes: 5 },
      { description: 'Couper les poivrons en deux dans la longueur et les vider (pépins et membranes).', durationMinutes: 4 },
      { description: 'Napper le fond de chaque demi-poivron avec du Boursin.', durationMinutes: 2 },
      { description: 'Émincer l’oignon et le faire réduire à la poêle avec l’huile, jusqu’à ce qu’il soit tendre et légèrement doré.', durationMinutes: 8 },
      { description: 'Couper la tomate très finement. La répartir dans les poivrons, puis ajouter les oignons.', durationMinutes: 4 },
      { description: 'Casser un œuf dans chaque demi-poivron, puis émietter la feta par-dessus.', durationMinutes: 3 },
      { description: 'Enfourner 20 min à 180 °C. (Four de Nathan : 40 min à 220 °C, oui oui.) Les blancs doivent être pris, les jaunes encore un peu coulants si tu aimes.', durationMinutes: 20 },
    ],
  },
  {
    id: 'official-crumble-legumes-ete',
    name: 'Crumble de légumes d’été',
    description: 'Aubergine, courgette, poivron et oignon rouge sous un crumble parmesan-beurre. Accompagnement pour 4, ou plat pour 2.',
    servings: 4,
    prepTimeMinutes: 25,
    cookTimeMinutes: 40,
    tagSlugs: ['accompagnement', 'vegetarien', 'plat-principal', 'gratin'],
    equipmentSlugs: ['four', 'saladier', 'couteau'],
    ingredients: [
      { code: CODE.eggplant, quantity: 1, unit: 'PIECE', grams: PIECE_EGGPLANT, displayQuantity: '1' },
      { code: CODE.zucchini, quantity: 1, unit: 'PIECE', grams: PIECE_ZUCCHINI, displayQuantity: '1' },
      { code: CODE.bellPepper, quantity: 1, unit: 'PIECE', grams: PIECE_PEPPER, displayQuantity: '1' },
      { code: CODE.redOnion, quantity: 1, unit: 'PIECE', grams: PIECE_RED_ONION, displayQuantity: '1' },
      tbsp(CODE.oliveOil, 1, TBSP_OIL),
      pinch(CODE.salt),
      pinch(CODE.pepper),
      tsp(CODE.paprika),
      tsp(CODE.garlicPowder, 3),
      tsp(CODE.provence, TSP_HERBS),
      { code: CODE.flourT45, quantity: 100, unit: 'G', grams: 100 },
      { code: CODE.parmesan, quantity: 40, unit: 'G', grams: 40 },
      { code: CODE.butter, quantity: 45, unit: 'G', grams: 45 },
    ],
    steps: [
      { description: 'Préchauffer le four à 180 °C. Pour le four de Nathan : 220 °C.', durationMinutes: 5 },
      { description: 'Couper l’aubergine, la courgette, le poivron et l’oignon rouge en cubes.', durationMinutes: 12 },
      { description: 'Dans un saladier, mélanger les légumes avec l’huile d’olive, le sel, le poivre, le paprika, l’ail en poudre et les herbes de Provence. Les répartir dans un plat allant au four.', durationMinutes: 5 },
      { description: 'Crumble : dans un autre saladier, réunir la farine, le parmesan, une pincée de sel et de poivre. Ajouter le beurre froid coupé en cubes.', durationMinutes: 3 },
      { description: 'Sabler du bout des doigts jusqu’à obtenir une texture de crumble (gros morceaux un peu granuleux). Répartir sur les légumes.', durationMinutes: 5 },
      { description: 'Enfourner 40 min à 180 °C, jusqu’à ce que les légumes soient fondants et le crumble doré. (Four de Nathan : 1 h 20 à 220 °C, toujours.)', durationMinutes: 40 },
    ],
  },
  {
    id: 'official-porridge-pomme-cannelle',
    name: 'Porridge pomme-cannelle protéiné',
    description: 'Flocons d’avoine cuits au lait, pomme fondante et whey vanille. Petit-déjeuner chaud pour 2 personnes.',
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    tagSlugs: ['petit-dejeuner', 'healthy', 'proteine'],
    equipmentSlugs: ['casserole', 'couteau', 'balance'],
    ingredients: [
      { code: CODE.oats, quantity: 100, unit: 'G', grams: 100 },
      { code: CODE.milk, quantity: 400, unit: 'G', grams: 400 },
      { code: CODE.apple, quantity: 2, unit: 'PIECE', grams: 2 * PIECE_APPLE, displayQuantity: '2' },
      { code: CODE.wheyVanille, quantity: 50, unit: 'G', grams: 50, displayQuantity: '2 scoops' },
      tsp(CODE.cinnamon, TSP_CINNAMON),
      tbsp(CODE.honey, 1, TBSP_HONEY),
      pinch(CODE.salt),
    ],
    steps: [
      { description: 'Couper les pommes en petits dés, en gardant la peau. Réserver une poignée de dés pour le dressage.', durationMinutes: 4 },
      { description: 'Dans une casserole, verser les flocons d’avoine, le lait, une pincée de sel et les dés de pomme restants.', durationMinutes: 1 },
      { description: 'Porter à frémissement puis cuire à feu doux 8 à 10 min en remuant, jusqu’à ce que le porridge épaississe et que la pomme soit fondante.', durationMinutes: 10 },
      { description: 'Hors du feu, laisser tiédir 1 min puis incorporer la whey vanille en fouettant (elle se dénature moins hors ébullition).', durationMinutes: 2 },
      { description: 'Répartir dans deux bols, ajouter les dés de pomme crus, la cannelle et un filet de miel.', durationMinutes: 2 },
    ],
  },
  {
    id: 'official-bowl-skyr-myrtilles',
    name: 'Bowl skyr, myrtilles et amandes',
    description: 'Fromage frais 0 % très protéiné, myrtilles fraîches, amandes torréfiées et flocons d’avoine. Sans cuisson, pour 2 personnes.',
    servings: 2,
    prepTimeMinutes: 8,
    cookTimeMinutes: 4,
    tagSlugs: ['petit-dejeuner', 'healthy', 'proteine'],
    equipmentSlugs: ['saladier', 'poele', 'balance'],
    ingredients: [
      { code: CODE.skyr, quantity: 300, unit: 'G', grams: 300 },
      { code: CODE.blueberry, quantity: 150, unit: 'G', grams: 150 },
      { code: CODE.oats, quantity: 60, unit: 'G', grams: 60 },
      { code: CODE.almond, quantity: 40, unit: 'G', grams: 40 },
      tbsp(CODE.honey, 1, TBSP_HONEY),
      tsp(CODE.cinnamon, TSP_CINNAMON),
    ],
    steps: [
      { description: 'Concasser grossièrement les amandes au couteau.', durationMinutes: 3 },
      { description: 'Dans une poêle sèche à feu moyen, torréfier les flocons d’avoine et les amandes 3 à 4 min, jusqu’à ce qu’ils sentent la noisette. Débarrasser pour stopper la cuisson.', durationMinutes: 4 },
      { description: 'Détendre le skyr à la cuillère avec la cannelle, puis le répartir dans deux bols.', durationMinutes: 2 },
      { description: 'Garnir de myrtilles, du mélange avoine-amandes encore tiède, et terminer par le miel.', durationMinutes: 3 },
    ],
  },
  {
    id: 'official-omelette-epinards-feta',
    name: 'Omelette épinards et feta',
    description: 'Petit-déjeuner salé : 2 œufs par personne, épinards frais tombés à la poêle et feta émiettée.',
    servings: 2,
    prepTimeMinutes: 6,
    cookTimeMinutes: 8,
    tagSlugs: ['petit-dejeuner', 'omelette', 'vegetarien', 'proteine', 'healthy'],
    equipmentSlugs: ['poele', 'saladier', 'fouet', 'spatule'],
    ingredients: [
      { code: CODE.egg, quantity: 4, unit: 'PIECE', grams: 4 * PIECE_EGG, displayQuantity: '4' },
      { code: CODE.spinach, quantity: 150, unit: 'G', grams: 150 },
      { code: CODE.feta, quantity: 80, unit: 'G', grams: 80 },
      tbsp(CODE.oliveOil, 1, TBSP_OIL),
      pinch(CODE.salt),
      pinch(CODE.pepper),
    ],
    steps: [
      { description: 'Laver et essorer les épinards. Battre les œufs avec le poivre et très peu de sel (la feta sale déjà).', durationMinutes: 5 },
      { description: 'Chauffer l’huile d’olive dans une poêle à feu moyen-vif et faire tomber les épinards 2 min, jusqu’à ce qu’ils rendent leur eau.', durationMinutes: 3 },
      { description: 'Baisser le feu, verser les œufs battus et répartir les épinards uniformément.', durationMinutes: 1 },
      { description: 'Émietter la feta sur le dessus et cuire 4 à 5 min à couvert, jusqu’à ce que l’omelette soit prise mais encore baveuse au centre.', durationMinutes: 5 },
      { description: 'Faire glisser sur une planche, couper en deux et servir aussitôt.', durationMinutes: 1 },
    ],
  },
  {
    id: 'official-pain-perdu-proteine',
    name: 'Pain perdu protéiné au pain complet',
    description: 'Pain complet trempé dans un appareil œuf-lait-whey, doré à la poêle, servi avec de la banane. Pour 2 personnes.',
    servings: 2,
    prepTimeMinutes: 8,
    cookTimeMinutes: 10,
    tagSlugs: ['petit-dejeuner', 'gouter', 'proteine', 'healthy'],
    equipmentSlugs: ['poele', 'saladier', 'fouet', 'spatule'],
    ingredients: [
      { code: CODE.wholeBread, quantity: 4, unit: 'SLICE', grams: 4 * SLICE_BREAD, displayQuantity: '4' },
      { code: CODE.egg, quantity: 2, unit: 'PIECE', grams: 2 * PIECE_EGG, displayQuantity: '2' },
      { code: CODE.milk, quantity: 200, unit: 'G', grams: 200 },
      { code: CODE.wheyVanille, quantity: 25, unit: 'G', grams: 25, displayQuantity: '1 scoop' },
      { code: CODE.banana, quantity: 2, unit: 'PIECE', grams: 2 * PIECE_BANANA, displayQuantity: '2' },
      tsp(CODE.cinnamon, TSP_CINNAMON),
      { code: CODE.butter, quantity: 10, unit: 'G', grams: 10 },
    ],
    steps: [
      { description: 'Dans un saladier large, fouetter les œufs, le lait, la whey vanille et la cannelle jusqu’à ce qu’il n’y ait plus de grumeaux.', durationMinutes: 4 },
      { description: 'Tremper chaque tranche de pain complet 20 à 30 s par face : elle doit être imbibée sans se déliter.', durationMinutes: 4 },
      { description: 'Faire fondre le beurre dans une poêle à feu moyen et dorer les tranches 2 à 3 min par face.', durationMinutes: 10 },
      { description: 'Couper les bananes en rondelles, les poser sur le pain perdu et servir chaud.', durationMinutes: 2 },
    ],
  },
  {
    id: 'official-smoothie-bowl-banane-cacao',
    name: 'Smoothie bowl banane-cacao',
    description: 'Bananes, fromage blanc 0 %, cacao non sucré et beurre de cacahuète, mixés puis garnis d’avoine. Pour 2 personnes.',
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 0,
    tagSlugs: ['petit-dejeuner', 'healthy', 'proteine'],
    equipmentSlugs: ['blender', 'balance', 'couteau'],
    ingredients: [
      { code: CODE.banana, quantity: 3, unit: 'PIECE', grams: 3 * PIECE_BANANA, displayQuantity: '3' },
      { code: CODE.fromageBlanc0, quantity: 250, unit: 'G', grams: 250 },
      { code: CODE.milk, quantity: 150, unit: 'G', grams: 150 },
      { code: CODE.cocoaPowder, quantity: 15, unit: 'G', grams: 15 },
      tbsp(CODE.peanutButter, 2, TBSP_PEANUT),
      { code: CODE.oats, quantity: 50, unit: 'G', grams: 50 },
    ],
    steps: [
      { description: 'Couper deux bananes en morceaux (idéalement congelés la veille, le bowl est alors bien plus épais). Réserver la troisième pour le dressage.', durationMinutes: 4 },
      { description: 'Mixer les bananes avec le fromage blanc, le lait, le cacao et le beurre de cacahuète jusqu’à obtenir une texture crémeuse.', durationMinutes: 3 },
      { description: 'Verser dans deux bols. Si la texture est trop liquide, ajouter 20 g de flocons d’avoine et mixer 10 s de plus.', durationMinutes: 1 },
      { description: 'Garnir des rondelles de la banane restante et du reste de flocons d’avoine. Servir immédiatement.', durationMinutes: 2 },
    ],
  },
  {
    id: 'official-gouter-skyr-fraises-granola',
    name: 'Skyr, fraises et granola maison',
    description: 'Goûter de 16 h : granola avoine-amandes torréfié au miel sur un lit de fromage frais 0 %. Pour 2 personnes.',
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 12,
    tagSlugs: ['gouter', 'healthy', 'proteine'],
    equipmentSlugs: ['four', 'saladier', 'papier-cuisson', 'couteau'],
    ingredients: [
      { code: CODE.skyr, quantity: 300, unit: 'G', grams: 300 },
      { code: CODE.strawberry, quantity: 200, unit: 'G', grams: 200 },
      { code: CODE.oats, quantity: 60, unit: 'G', grams: 60 },
      { code: CODE.almond, quantity: 30, unit: 'G', grams: 30 },
      tbsp(CODE.honey, 1, TBSP_HONEY),
      tbsp(CODE.sunflowerOil, 1, TBSP_OIL),
      tsp(CODE.cinnamon, TSP_CINNAMON),
    ],
    steps: [
      { description: 'Préchauffer le four à 160 °C. Concasser les amandes.', durationMinutes: 4 },
      { description: 'Mélanger flocons, amandes, huile, miel et cannelle jusqu’à ce que tout soit enrobé. Étaler en couche fine sur une plaque garnie de papier cuisson.', durationMinutes: 4 },
      { description: 'Enfourner 12 min en remuant à mi-cuisson. Sortir dès que le granola est doré : il durcit en refroidissant.', durationMinutes: 12 },
      { description: 'Équeuter et couper les fraises en quartiers.', durationMinutes: 4 },
      { description: 'Répartir le skyr dans deux coupes, ajouter les fraises puis le granola refroidi juste avant de servir, pour qu’il reste croquant.', durationMinutes: 2 },
    ],
  },
  {
    id: 'official-gouter-pomme-beurre-cacahuete',
    name: 'Pomme, beurre de cacahuète et chocolat noir',
    description: 'Le goûter de 16 h en 5 minutes : quartiers de pomme, beurre de cacahuète et copeaux de chocolat noir 70 %. Pour 2 personnes.',
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 0,
    tagSlugs: ['gouter', 'healthy', 'vegetarien'],
    equipmentSlugs: ['couteau', 'rape'],
    ingredients: [
      { code: CODE.apple, quantity: 2, unit: 'PIECE', grams: 2 * PIECE_APPLE, displayQuantity: '2' },
      tbsp(CODE.peanutButter, 2, TBSP_PEANUT),
      { code: CODE.darkChocolate, quantity: 20, unit: 'G', grams: 20 },
      tsp(CODE.cinnamon, TSP_CINNAMON),
    ],
    steps: [
      { description: 'Couper chaque pomme en huit quartiers, sans les éplucher, et retirer le cœur.', durationMinutes: 3 },
      { description: 'Détendre le beurre de cacahuète 10 s à la cuillère pour qu’il s’étale facilement, puis en napper les quartiers.', durationMinutes: 1 },
      { description: 'Râper le chocolat noir par-dessus, saupoudrer de cannelle et servir aussitôt (la pomme noircit vite).', durationMinutes: 1 },
    ],
  },
  {
    id: 'official-energy-balls-dattes-amandes',
    name: 'Energy balls dattes, amandes et cacao',
    description: 'Une douzaine de boules à préparer d’avance pour les 16 h. Aucune cuisson, aucun sucre ajouté : compter 2 boules par goûter.',
    servings: 6,
    prepTimeMinutes: 15,
    cookTimeMinutes: 0,
    tagSlugs: ['gouter', 'healthy', 'vegan', 'vegetarien'],
    equipmentSlugs: ['robot-multifonction', 'balance', 'saladier'],
    ingredients: [
      { code: CODE.date, quantity: 200, unit: 'G', grams: 200 },
      { code: CODE.almond, quantity: 100, unit: 'G', grams: 100 },
      { code: CODE.oats, quantity: 80, unit: 'G', grams: 80 },
      { code: CODE.cocoaPowder, quantity: 20, unit: 'G', grams: 20 },
      pinch(CODE.salt),
    ],
    steps: [
      { description: 'Dénoyauter les dattes si besoin. Si elles sont sèches, les tremper 10 min dans de l’eau chaude puis bien les égoutter.', durationMinutes: 5 },
      { description: 'Mixer les amandes seules jusqu’à obtenir une poudre grossière, avec encore quelques morceaux pour le croquant.', durationMinutes: 2 },
      { description: 'Ajouter les dattes, les flocons d’avoine, le cacao et la pincée de sel. Mixer par à-coups jusqu’à ce que la pâte forme une boule qui se tient entre les doigts.', durationMinutes: 3 },
      { description: 'Former une douzaine de boules de la taille d’une noix en roulant la pâte entre les paumes.', durationMinutes: 5 },
      { description: 'Réserver au frais au moins 30 min avant de déguster. Se conservent une semaine en boîte hermétique au réfrigérateur.', durationMinutes: 30 },
    ],
  },
  {
    id: 'official-pudding-chia-framboise',
    name: 'Pudding de chia aux framboises',
    description: 'Graines de chia gonflées au lait toute une nuit, coulis de framboises écrasées. À préparer la veille, pour 2 personnes.',
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 0,
    tagSlugs: ['gouter', 'healthy', 'vegetarien', 'dessert'],
    equipmentSlugs: ['saladier', 'fouet', 'balance'],
    ingredients: [
      { code: CODE.chia, quantity: 50, unit: 'G', grams: 50 },
      { code: CODE.milk, quantity: 350, unit: 'G', grams: 350 },
      { code: CODE.raspberry, quantity: 150, unit: 'G', grams: 150 },
      { code: CODE.wheyVanille, quantity: 25, unit: 'G', grams: 25, displayQuantity: '1 scoop' },
      tbsp(CODE.honey, 1, TBSP_HONEY),
    ],
    steps: [
      { description: 'Fouetter le lait avec la whey vanille jusqu’à dissolution complète, puis verser les graines de chia.', durationMinutes: 3 },
      { description: 'Mélanger, attendre 5 min et re-mélanger : c’est ce deuxième passage qui évite les paquets de graines au fond.', durationMinutes: 6 },
      { description: 'Couvrir et laisser gonfler au réfrigérateur toute la nuit (au minimum 4 h).', durationMinutes: 240 },
      { description: 'Au moment de servir, écraser les framboises à la fourchette avec le miel pour obtenir un coulis rustique.', durationMinutes: 3 },
      { description: 'Répartir le pudding dans deux verrines et couvrir du coulis de framboises.', durationMinutes: 2 },
    ],
  },
  {
    id: 'official-tartine-fromage-blanc-concombre',
    name: 'Tartine fromage blanc, concombre et chia',
    description: 'Goûter salé et léger : pain complet grillé, fromage blanc 0 % aux herbes, concombre en fines lamelles. Pour 2 personnes.',
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 3,
    tagSlugs: ['gouter', 'healthy', 'vegetarien', 'proteine'],
    equipmentSlugs: ['grille-pain', 'couteau', 'saladier'],
    ingredients: [
      { code: CODE.wholeBread, quantity: 4, unit: 'SLICE', grams: 4 * SLICE_BREAD, displayQuantity: '4' },
      { code: CODE.fromageBlanc0, quantity: 200, unit: 'G', grams: 200 },
      { code: CODE.cucumber, quantity: 0.5, unit: 'PIECE', grams: Math.round(PIECE_CUCUMBER / 2), displayQuantity: '1/2' },
      { code: CODE.chia, quantity: 10, unit: 'G', grams: 10 },
      tsp(CODE.chives, TSP_HERBS),
      tbsp(CODE.lemonJuice, 1),
      tbsp(CODE.oliveOil, 1, TBSP_OIL),
      pinch(CODE.salt),
      pinch(CODE.pepper),
    ],
    steps: [
      { description: 'Mélanger le fromage blanc avec la ciboulette, le jus de citron, le sel et le poivre. Réserver au frais.', durationMinutes: 4 },
      { description: 'Tailler le demi-concombre en lamelles très fines, à l’économe ou à la mandoline.', durationMinutes: 4 },
      { description: 'Faire griller les tranches de pain complet jusqu’à ce qu’elles soient bien croustillantes.', durationMinutes: 3 },
      { description: 'Tartiner généreusement de fromage blanc, disposer les lamelles de concombre en rosace, puis parsemer de graines de chia.', durationMinutes: 3 },
      { description: 'Terminer par un filet d’huile d’olive et un tour de moulin à poivre.', durationMinutes: 1 },
    ],
  },
];

type HouseIngredient = {
  code: number;
  nameFr: string;
  energyKcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  sugarG: number;
  saltG: number;
  iconSlug: string;
};

const HOUSE_WHEYS: HouseIngredient[] = [
  {
    code: WHEY_CODE,
    nameFr: 'Whey (protéine de lactosérum)',
    energyKcal: 370,
    proteinG: 80,
    carbG: 7,
    fatG: 5,
    sugarG: 4,
    saltG: 0.5,
    iconSlug: 'fromage-blanc',
  },
  {
    code: WHEY_VANILLE_CODE,
    nameFr: 'Whey vanille Nutrimuscle',
    energyKcal: 391,
    proteinG: 73,
    carbG: 11.2,
    fatG: 4.7,
    sugarG: 7.7,
    saltG: 1.64,
    iconSlug: 'vanille',
  },
  {
    code: WHEY_CHOCOLAT_CODE,
    nameFr: 'Whey chocolat Nutrimuscle',
    energyKcal: 390,
    proteinG: 74.1,
    carbG: 8.23,
    fatG: 5.2,
    sugarG: 6.05,
    saltG: 1.64,
    iconSlug: 'chocolat',
  },
];

function houseIngredientData(item: HouseIngredient) {
  return {
    nameFr: item.nameFr,
    nameNormalized: normalizeSearchText(item.nameFr),
    groupName: 'Compléments',
    uxCategory: 'DAIRY' as const,
    uxSubCategory: 'Whey',
    energyKcalKind: 'VALUE' as const,
    energyKcal: item.energyKcal,
    proteinKind: 'VALUE' as const,
    proteinG: item.proteinG,
    carbKind: 'VALUE' as const,
    carbG: item.carbG,
    fatKind: 'VALUE' as const,
    fatG: item.fatG,
    fiberKind: 'NA' as const,
    sugarKind: 'VALUE' as const,
    sugarG: item.sugarG,
    saltKind: 'VALUE' as const,
    saltG: item.saltG,
    source: 'Cuisinons',
    sourceVersion: 'maison',
    sourceDate: new Date('2026-09-17'),
    iconSlug: item.iconSlug,
    iconUrl: `/ingredients/${item.iconSlug}.png`,
    iconSource: 'cuisinons',
    iconAttribution: 'Illustration originale Cuisinons',
    dedicatedIcon: true,
  };
}

export async function ensureWhey() {
  for (const item of HOUSE_WHEYS) {
    const data = houseIngredientData(item);
    await prisma.ingredient.upsert({
      where: { ciqualCode: item.code },
      update: data,
      create: { ciqualCode: item.code, ...data },
    });
  }
}

export const HANDCRAFTED_OFFICIAL_COUNT = RECIPES.length;

function rewriteStepKeys(description: string, keyToId: Map<string, string>): string {
  return description.replace(/\[\[ing:([^\]]+)\]\]/g, (_match, key: string) => {
    const id = keyToId.get(key);
    return id ? `[[ing:${id}]]` : '';
  });
}

type CatalogIngredient = { id: string; ciqualCode: number; nameNormalized: string; nameFr: string };

function resolveByRef(
  catalog: CatalogIngredient[],
  ref: { key: string; code: number | null; names: readonly string[] },
): CatalogIngredient | null {
  return pickHealthyIngredient(catalog, ref);
}

async function upsertOfficialRecipe(
  recipe: OfficialRecipe & { resolved: Array<Line & { ingredientId: string }>; stepDescriptions: string[] },
  authorId: string,
  tagBySlug: Map<string, string>,
  equipmentBySlug: Map<string, string>,
) {
  const tagIds = recipe.tagSlugs.map((slug) => {
    const id = tagBySlug.get(slug);
    if (!id) throw new Error(`Tag introuvable: ${slug}`);
    return id;
  });
  const equipmentIds = recipe.equipmentSlugs
    .map((slug) => equipmentBySlug.get(slug))
    .filter((id): id is string => Boolean(id));

  const data = {
    name: recipe.name,
    description: recipe.description,
    status: 'PUBLISHED' as const,
    source: 'CATALOG' as const,
    authorId,
    servings: recipe.servings,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    photoUrl: `/recipes/${recipe.id}.png`,
    ingredients: {
      create: recipe.resolved.map((line, index) => ({
        ingredientId: line.ingredientId,
        quantity: line.quantity,
        unit: line.unit,
        grams: line.grams,
        gramsManual: line.unit !== 'G' && line.unit !== 'KG',
        displayQuantity: line.displayQuantity ?? null,
        sortOrder: index,
        estimated: line.unit !== 'G' && line.unit !== 'KG',
      })),
    },
    steps: {
      create: recipe.stepDescriptions.map((description, index) => ({
        stepNumber: index + 1,
        description,
        durationMinutes: recipe.steps[index]?.durationMinutes ?? null,
      })),
    },
    tags: { create: tagIds.map((tagId) => ({ tagId })) },
    equipment: { create: equipmentIds.map((equipmentId) => ({ equipmentId })) },
  };

  const existing = await prisma.recipe.findUnique({ where: { id: recipe.id } });
  if (existing) {
    await prisma.$transaction(async (tx) => {
      await tx.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });
      await tx.recipeStep.deleteMany({ where: { recipeId: recipe.id } });
      await tx.recipeTag.deleteMany({ where: { recipeId: recipe.id } });
      await tx.recipeEquipment.deleteMany({ where: { recipeId: recipe.id } });
      await tx.recipe.update({ where: { id: recipe.id }, data });
    });
  } else {
    await prisma.recipe.create({ data: { id: recipe.id, ...data } });
  }
}

export async function seedOfficialRecipes(authorId: string) {
  await ensureWhey();

  const olive = await prisma.ingredient.findUnique({ where: { ciqualCode: CODE.oliveOil } });
  if (!olive) {
    console.warn('Ciqual absent : recettes officielles ignorées.');
    return;
  }

  const tags = await prisma.tag.findMany();
  const equipment = await prisma.equipment.findMany();
  const tagBySlug = new Map(tags.map((tag) => [tag.slug, tag.id]));
  const equipmentBySlug = new Map(equipment.map((item) => [item.slug, item.id]));

  const catalog = await prisma.ingredient.findMany({
    select: { id: true, ciqualCode: true, nameNormalized: true, nameFr: true },
  });
  const ingredientByCode = new Map(catalog.map((item) => [item.ciqualCode, item]));

  let seeded = 0;
  for (const recipe of RECIPES) {
    const missing = recipe.ingredients
      .map((line) => line.code)
      .filter((code) => !ingredientByCode.has(code));
    if (missing.length > 0) {
      throw new Error(`Ingrédients manquants pour ${recipe.name} (codes ${missing.join(', ')})`);
    }
    const resolved = recipe.ingredients.map((line) => ({
      ...line,
      ingredientId: ingredientByCode.get(line.code)!.id,
    }));
    await upsertOfficialRecipe(
      { ...recipe, resolved, stepDescriptions: recipe.steps.map((step) => step.description) },
      authorId,
      tagBySlug,
      equipmentBySlug,
    );
    seeded += 1;
  }

  const healthy = buildHealthyOfficialSpecs();
  for (const spec of healthy) {
    const keyToId = new Map<string, string>();
    const resolved: Array<Line & { ingredientId: string }> = [];
    for (const line of spec.ingredients) {
      const ref = HEALTHY_INGREDIENTS[line.key];
      if (!ref) continue;
      const found = resolveByRef(catalog, ref);
      if (!found) {
        console.warn(`Healthy ${spec.id}: ${line.key} introuvable (Ciqual ${String(ref.code)}).`);
        continue;
      }
      keyToId.set(line.key, found.id);
      resolved.push({
        code: found.ciqualCode,
        quantity: line.quantity,
        unit: line.unit,
        grams: line.grams,
        displayQuantity: line.displayQuantity,
        ingredientId: found.id,
      });
    }
    if (resolved.length < 2) {
      console.warn(`Healthy ${spec.id} ignorée : moins de 2 ingrédients Ciqual résolus.`);
      continue;
    }
    await upsertOfficialRecipe(
      {
        id: spec.id,
        name: spec.name,
        description: spec.description,
        servings: spec.servings,
        prepTimeMinutes: spec.prepTimeMinutes,
        cookTimeMinutes: spec.cookTimeMinutes,
        ingredients: [],
        steps: spec.steps,
        tagSlugs: spec.tagSlugs,
        equipmentSlugs: [...spec.equipmentSlugs],
        resolved,
        stepDescriptions: spec.steps.map((step) => rewriteStepKeys(step.description, keyToId)),
      },
      authorId,
      tagBySlug,
      equipmentBySlug,
    );
    seeded += 1;
  }

  const expected = OFFICIAL_RECIPE_COUNT;
  if (seeded !== expected) {
    console.warn(`Recettes officielles : ${String(seeded)} fiches (attendu ${String(expected)}).`);
  } else {
    console.log(`Recettes officielles : ${String(seeded)} fiches publiées.`);
  }

  const catalogIds = await prisma.recipe.findMany({
    where: { source: 'CATALOG' },
    select: { id: true },
  });
  for (const row of catalogIds) {
    await refreshRecipeNutritionSnapshot(prisma, row.id);
  }
  const extra = await refreshMissingNutritionSnapshots(prisma);
  console.log(`Macros dénormalisées : ${String(catalogIds.length + extra)} fiches.`);
}
