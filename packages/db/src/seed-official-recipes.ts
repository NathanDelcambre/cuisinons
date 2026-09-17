import { normalizeSearchText, type QuantityUnit } from '@cuisinons/shared';
import { prisma } from './client';

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
const TSP_SPICE = 2;
const TSP_HERBS = 1;
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
    description: 'Salade froide tomate, concombre et feta, pour 2 à 3 personnes.',
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 0,
    tagSlugs: ['salade', 'vegetarien', 'healthy'],
    equipmentSlugs: ['saladier', 'couteau'],
    ingredients: [
      { code: CODE.tomatoRibbed, quantity: 1, unit: 'PIECE', grams: PIECE_TOMATO, displayQuantity: '1' },
      { code: CODE.cucumber, quantity: 0.5, unit: 'PIECE', grams: PIECE_CUCUMBER / 2, displayQuantity: '1/2' },
      { code: CODE.feta, quantity: 1 / 3, unit: 'PIECE', grams: Math.round(FETA_BLOCK / 3), displayQuantity: '1/3' },
    ],
    steps: [
      { description: 'Laver la tomate et le concombre.', durationMinutes: 1 },
      { description: 'Couper la tomate côtelée en quartiers ou en dés. Couper le demi-concombre en demi-rondelles ou en dés.', durationMinutes: 6 },
      { description: 'Émietter le tiers de bloc de feta sur les légumes, mélanger délicatement. Servir nature, ou avec la vinaigrette / la sauce yaourt.', durationMinutes: 3 },
    ],
  },
  {
    id: 'official-marinade-soja',
    name: 'Marinade viande au soja',
    description: 'Marinade salée-sucrée pour 2 filets de poulet minimum. Laisser poser au moins 1 h.',
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    tagSlugs: ['viande', 'sauce', 'proteine'],
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
    tagSlugs: ['viande', 'sauce', 'proteine', 'healthy'],
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
    tagSlugs: ['viande', 'sauce', 'proteine', 'healthy'],
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
      { code: CODE.rice, quantity: 150, unit: 'G', grams: 150 },
      { code: CODE.bellPepper, quantity: 1, unit: 'PIECE', grams: PIECE_PEPPER, displayQuantity: '1' },
      { code: CODE.cucumber, quantity: 0.5, unit: 'PIECE', grams: PIECE_CUCUMBER / 2, displayQuantity: '1/2' },
      { code: CODE.tomatoRibbed, quantity: 1, unit: 'PIECE', grams: PIECE_TOMATO, displayQuantity: '1' },
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
      { description: 'Couper le poivron, le demi-concombre et la tomate en dés. Couper la mozzarella en cubes.', durationMinutes: 8 },
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
    tagSlugs: ['accompagnement', 'vegetarien', 'vegan', 'healthy'],
    equipmentSlugs: ['air-fryer', 'econome', 'couteau', 'saladier'],
    ingredients: [
      { code: CODE.sweetPotato, quantity: 1, unit: 'PIECE', grams: PIECE_SWEET_POTATO, displayQuantity: '1' },
      tbsp(CODE.sunflowerOil, 3, TBSP_OIL),
      pinch(CODE.salt),
      pinch(CODE.pepper),
      tsp(CODE.paprika),
    ],
    steps: [
      { description: 'Éplucher la patate douce et la couper en cubes réguliers d’environ 2 cm.', durationMinutes: 6 },
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
    tagSlugs: ['plat-principal', 'healthy', 'proteine'],
    equipmentSlugs: ['air-fryer', 'poele', 'saladier', 'couteau', 'econome'],
    ingredients: [
      { code: CODE.sweetPotato, quantity: 1, unit: 'PIECE', grams: PIECE_SWEET_POTATO, displayQuantity: '1' },
      tbsp(CODE.sunflowerOil, 3, TBSP_OIL),
      { code: CODE.chicken, quantity: 2, unit: 'PIECE', grams: 2 * PIECE_CHICKEN, displayQuantity: '2' },
      tbsp(CODE.fromageBlanc0, 3, TBSP_SOFT_CHEESE),
      tbsp(CODE.oliveOil, 1, TBSP_OIL),
      tbsp(CODE.lemonJuice, 1),
      tsp(CODE.paprika),
      tsp(CODE.garlicPowder, 3),
      pinch(CODE.salt),
      pinch(CODE.pepper),
      { code: CODE.tomatoRibbed, quantity: 1, unit: 'PIECE', grams: PIECE_TOMATO, displayQuantity: '1' },
      { code: CODE.cucumber, quantity: 0.5, unit: 'PIECE', grams: PIECE_CUCUMBER / 2, displayQuantity: '1/2' },
      { code: CODE.feta, quantity: 1 / 3, unit: 'PIECE', grams: Math.round(FETA_BLOCK / 3), displayQuantity: '1/3' },
      { code: CODE.avocado, quantity: 1, unit: 'PIECE', grams: PIECE_AVOCADO, displayQuantity: '1' },
      { code: CODE.corn, quantity: 0.5, unit: 'JAR', grams: CORN_HALF_CAN, displayQuantity: '1/2' },
      { code: CODE.cheddar, quantity: 50, unit: 'G', grams: 50 },
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
    tagSlugs: ['plat-principal', 'vegetarien'],
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
    tagSlugs: ['accompagnement', 'vegetarien', 'plat-principal'],
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
    iconUrl: `/ingredients/${item.iconSlug}.svg`,
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

  const neededCodes = [...new Set(RECIPES.flatMap((recipe) => recipe.ingredients.map((line) => line.code)))];
  const ingredients = await prisma.ingredient.findMany({
    where: { ciqualCode: { in: neededCodes } },
    select: { id: true, ciqualCode: true, nameFr: true },
  });
  const ingredientByCode = new Map(ingredients.map((item) => [item.ciqualCode, item]));

  for (const recipe of RECIPES) {
    const missing = recipe.ingredients
      .map((line) => line.code)
      .filter((code) => !ingredientByCode.has(code));
    if (missing.length > 0) {
      throw new Error(`Ingrédients manquants pour ${recipe.name} (codes ${missing.join(', ')})`);
    }
    const tagIds = recipe.tagSlugs.map((slug) => {
      const id = tagBySlug.get(slug);
      if (!id) throw new Error(`Tag introuvable: ${slug}`);
      return id;
    });
    const equipmentIds = recipe.equipmentSlugs.map((slug) => {
      const id = equipmentBySlug.get(slug);
      if (!id) throw new Error(`Équipement introuvable: ${slug}`);
      return id;
    });

    const data = {
      name: recipe.name,
      description: recipe.description,
      status: 'PUBLISHED' as const,
      authorId,
      servings: recipe.servings,
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
      ingredients: {
        create: recipe.ingredients.map((line, index) => ({
          ingredientId: ingredientByCode.get(line.code)!.id,
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
        create: recipe.steps.map((step, index) => ({
          stepNumber: index + 1,
          description: step.description,
          durationMinutes: step.durationMinutes ?? null,
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

  console.log(`Recettes officielles : ${String(RECIPES.length)} fiches publiées.`);
}
