import type { Diet } from './roles.js';
import type { DishKind } from './kinds.js';

/**
 * Recette healthy issue du web, réduite à ce que le compositeur sait faire :
 * un mode de cuisson, des rôles, et éventuellement des mots du nom Ciqual.
 * Les fiches originales ne sont pas recopiées — seulement l'idée du plat.
 */
export type CookMethod =
  | 'skillet'
  | 'wok'
  | 'oven'
  | 'parcel'
  | 'salad'
  | 'soup'
  | 'curry'
  | 'bake'
  | 'omelette'
  | 'bowl'
  | 'pasta'
  | 'rice'
  | 'breakfast'
  | 'stew';

export type NameFilter = true | readonly string[];

export type RecipeSpec = {
  id: string;
  kind: DishKind;
  method: CookMethod;
  label: string;
  source: string;
  diets: readonly Diet[];
  prep: number;
  cook: number;
  equipment: readonly string[];
  tags: readonly string[];
  protein?: NameFilter;
  vegetable?: NameFilter;
  starch?: NameFilter;
  egg?: boolean;
  dairy?: boolean;
  fruit?: boolean;
};

const OMNI = ['omnivore'] as const;
const VEGE = ['omnivore', 'vegetarian'] as const;
const VEGAN = ['omnivore', 'vegetarian', 'vegan'] as const;

const POELE = ['poele', 'couteau'] as const;
const FOUR = ['four', 'plaque-cuisson'] as const;
const CASS = ['casserole', 'couteau'] as const;
const SALADE = ['saladier', 'couteau'] as const;
const WOK = ['wok', 'couteau'] as const;

const MAIN = ['plat-principal', 'healthy'] as const;
const SALAD = ['salade', 'healthy'] as const;
const SOUP = ['soupe', 'healthy'] as const;
const BREAKFAST = ['petit-dejeuner', 'healthy'] as const;

const FISH = ['saumon', 'cabillaud', 'merlu', 'lieu', 'colin', 'thon', 'truite', 'daurade', 'dorade', 'sardine', 'maquereau'] as const;
const WHITE = ['poulet', 'dinde'] as const;
const LEGUME = ['lentille', 'pois chiche', 'pois-chiche', 'haricot'] as const;

/**
 * 100 plats healthy recensés sur des sélections publiques (dîners légers,
 * batch cooking, méditerranéen, assiettes végétales). Chaque entrée ne se
 * déclenche que si le stock contient les ingrédients visés.
 */
export const HEALTHY_RECIPES: readonly RecipeSpec[] = [
  { id: 'h01', kind: 'four', method: 'oven', label: 'Filet mignon aux tomates provençales', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 25, equipment: FOUR, tags: MAIN, protein: ['porc', 'mignon'], vegetable: ['tomate'] },
  { id: 'h02', kind: 'poelee', method: 'skillet', label: 'Poulet mariné soja-moutarde', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 15, equipment: POELE, tags: MAIN, protein: WHITE, vegetable: true },
  { id: 'h03', kind: 'curry', method: 'curry', label: 'One pot lentilles-poulet au curry', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 25, equipment: CASS, tags: MAIN, protein: WHITE, starch: ['lentille'], vegetable: true },
  { id: 'h04', kind: 'salade', method: 'salad', label: 'Salade de lentilles à l’aubergine et yaourt', source: 'lacerisesurlemaillot.fr', diets: VEGE, prep: 15, cook: 0, equipment: SALADE, tags: SALAD, protein: ['lentille'], vegetable: ['aubergine', 'tomate'], dairy: true },
  { id: 'h05', kind: 'soupe', method: 'soup', label: 'Gaspacho de courgettes', source: 'lacerisesurlemaillot.fr', diets: VEGAN, prep: 15, cook: 0, equipment: CASS, tags: SOUP, vegetable: ['courgette'] },
  { id: 'h06', kind: 'poelee', method: 'skillet', label: 'Saumon express à l’italienne', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 8, cook: 12, equipment: POELE, tags: MAIN, protein: ['saumon'], vegetable: true },
  { id: 'h07', kind: 'four', method: 'parcel', label: 'Papillote de saumon et légumes', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 20, equipment: FOUR, tags: MAIN, protein: ['saumon'], vegetable: true },
  { id: 'h08', kind: 'salade', method: 'salad', label: 'Ceviche de saumon', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 20, cook: 0, equipment: SALADE, tags: SALAD, protein: ['saumon'], vegetable: true },
  { id: 'h09', kind: 'four', method: 'oven', label: 'Poulet au four façon basquaise', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 30, equipment: FOUR, tags: MAIN, protein: WHITE, vegetable: ['poivron', 'tomate'] },
  { id: 'h10', kind: 'four', method: 'oven', label: 'Roulés d’aubergine au poulet', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 15, cook: 25, equipment: FOUR, tags: MAIN, protein: WHITE, vegetable: ['aubergine'] },
  { id: 'h11', kind: 'salade', method: 'salad', label: 'Salade de légumes croquants sauce thaï', source: 'lacerisesurlemaillot.fr', diets: VEGAN, prep: 15, cook: 0, equipment: SALADE, tags: SALAD, vegetable: true, protein: LEGUME },
  { id: 'h12', kind: 'soupe', method: 'soup', label: 'Gaspacho aux poivrons', source: 'lacerisesurlemaillot.fr', diets: VEGAN, prep: 15, cook: 0, equipment: CASS, tags: SOUP, vegetable: ['poivron', 'tomate'] },
  { id: 'h13', kind: 'salade', method: 'salad', label: 'Salade de courgettes au chèvre', source: 'lacerisesurlemaillot.fr', diets: VEGE, prep: 12, cook: 0, equipment: SALADE, tags: SALAD, vegetable: ['courgette'], dairy: true },
  { id: 'h14', kind: 'four', method: 'oven', label: 'Ratatouille confite au four', source: 'lacerisesurlemaillot.fr', diets: VEGAN, prep: 15, cook: 35, equipment: FOUR, tags: MAIN, vegetable: ['courgette', 'aubergine', 'poivron', 'tomate'] },
  { id: 'h15', kind: 'omelette', method: 'omelette', label: 'Chakchouka aux œufs', source: 'lacerisesurlemaillot.fr', diets: VEGE, prep: 10, cook: 20, equipment: POELE, tags: MAIN, egg: true, vegetable: ['tomate', 'poivron'] },
  { id: 'h16', kind: 'four', method: 'oven', label: 'Dos de merlu aux légumes', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 20, equipment: FOUR, tags: MAIN, protein: ['merlu', ...FISH], vegetable: true },
  { id: 'h17', kind: 'omelette', method: 'omelette', label: 'Œuf cocotte à la truite', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 8, cook: 15, equipment: FOUR, tags: MAIN, egg: true, protein: ['truite'] },
  { id: 'h18', kind: 'salade', method: 'salad', label: 'Salade de lentilles, truite et œuf', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 15, cook: 0, equipment: SALADE, tags: SALAD, protein: ['lentille'], vegetable: true, egg: true },
  { id: 'h19', kind: 'curry', method: 'curry', label: 'Curry express de crevettes aux légumes', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 15, equipment: CASS, tags: MAIN, protein: ['crevette'], vegetable: true },
  { id: 'h20', kind: 'bowl', method: 'bowl', label: 'Salade de quinoa et patate douce rôtie', source: 'lacerisesurlemaillot.fr', diets: VEGAN, prep: 10, cook: 25, equipment: FOUR, tags: MAIN, starch: ['quinoa', 'patate'], vegetable: true, protein: LEGUME },
  { id: 'h21', kind: 'poelee', method: 'skillet', label: 'Zaalouk d’aubergines', source: 'lacerisesurlemaillot.fr', diets: VEGAN, prep: 10, cook: 20, equipment: POELE, tags: MAIN, vegetable: ['aubergine', 'tomate'], protein: LEGUME },
  { id: 'h22', kind: 'poelee', method: 'skillet', label: 'Poulet mariné citron vert et gingembre', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 15, equipment: POELE, tags: MAIN, protein: WHITE, vegetable: true },
  { id: 'h23', kind: 'four', method: 'oven', label: 'Boulettes de dinde aux olives', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 15, cook: 25, equipment: FOUR, tags: MAIN, protein: ['dinde'], vegetable: ['tomate'] },
  { id: 'h24', kind: 'four', method: 'oven', label: 'Tomates farcies aux sardines et lentilles', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 15, cook: 25, equipment: FOUR, tags: MAIN, protein: ['sardine', 'lentille'], vegetable: ['tomate'] },
  { id: 'h25', kind: 'salade', method: 'salad', label: 'Taboulé de chou-fleur', source: 'lacerisesurlemaillot.fr', diets: VEGAN, prep: 15, cook: 0, equipment: SALADE, tags: SALAD, vegetable: ['chou'], protein: LEGUME },
  { id: 'h26', kind: 'curry', method: 'curry', label: 'Curry de crevettes et poivrons', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 15, equipment: CASS, tags: MAIN, protein: ['crevette'], vegetable: ['poivron'] },
  { id: 'h27', kind: 'omelette', method: 'omelette', label: 'Frittata aux poivrons', source: 'lacerisesurlemaillot.fr', diets: VEGE, prep: 8, cook: 15, equipment: POELE, tags: MAIN, egg: true, vegetable: ['poivron'] },
  { id: 'h28', kind: 'salade', method: 'salad', label: 'Tartare de saumon aux câpres', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 15, cook: 0, equipment: SALADE, tags: SALAD, protein: ['saumon'], vegetable: true },
  { id: 'h29', kind: 'poelee', method: 'skillet', label: 'Thon basquaise', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 15, equipment: POELE, tags: MAIN, protein: ['thon'], vegetable: ['poivron', 'tomate'] },
  { id: 'h30', kind: 'poelee', method: 'skillet', label: 'Poisson grillé sauce moutarde', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 8, cook: 12, equipment: POELE, tags: MAIN, protein: FISH, vegetable: true },
  { id: 'h31', kind: 'salade', method: 'salad', label: 'Salade de chou-fleur, haricots et œuf', source: 'lacerisesurlemaillot.fr', diets: VEGE, prep: 15, cook: 0, equipment: SALADE, tags: SALAD, vegetable: ['chou'], protein: ['haricot'], egg: true },
  { id: 'h32', kind: 'omelette', method: 'omelette', label: 'Œufs cocotte piperade', source: 'lacerisesurlemaillot.fr', diets: VEGE, prep: 10, cook: 15, equipment: POELE, tags: MAIN, egg: true, vegetable: ['poivron', 'tomate'] },
  { id: 'h33', kind: 'four', method: 'oven', label: 'Maquereaux au four', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 8, cook: 20, equipment: FOUR, tags: MAIN, protein: ['maquereau'], vegetable: true },
  { id: 'h34', kind: 'four', method: 'oven', label: 'Brochettes de poulet chermoula', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 15, cook: 20, equipment: FOUR, tags: MAIN, protein: WHITE, vegetable: true },
  { id: 'h35', kind: 'four', method: 'oven', label: 'Cabillaud aux poivrons et olives', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 20, equipment: FOUR, tags: MAIN, protein: ['cabillaud'], vegetable: ['poivron'] },
  { id: 'h36', kind: 'four', method: 'oven', label: 'Saumon à la chermoula', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 18, equipment: FOUR, tags: MAIN, protein: ['saumon'], vegetable: true },
  { id: 'h37', kind: 'omelette', method: 'omelette', label: 'Tomate-œuf cocotte', source: 'lacerisesurlemaillot.fr', diets: VEGE, prep: 8, cook: 15, equipment: FOUR, tags: MAIN, egg: true, vegetable: ['tomate'] },
  { id: 'h38', kind: 'poelee', method: 'skillet', label: 'Sardines à la plancha', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 5, cook: 8, equipment: POELE, tags: MAIN, protein: ['sardine'], vegetable: true },
  { id: 'h39', kind: 'soupe', method: 'soup', label: 'Gaspacho andalou', source: 'lacerisesurlemaillot.fr', diets: VEGAN, prep: 15, cook: 0, equipment: CASS, tags: SOUP, vegetable: ['tomate', 'concombre'] },
  { id: 'h40', kind: 'salade', method: 'salad', label: 'Salade niçoise au thon', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 15, cook: 0, equipment: SALADE, tags: SALAD, protein: ['thon'], vegetable: true, egg: true },
  { id: 'h41', kind: 'poelee', method: 'skillet', label: 'Caponata d’aubergines', source: 'lacerisesurlemaillot.fr', diets: VEGAN, prep: 15, cook: 25, equipment: POELE, tags: MAIN, vegetable: ['aubergine', 'tomate'], protein: LEGUME },
  { id: 'h42', kind: 'poelee', method: 'skillet', label: 'Poulet piccata au citron', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 12, equipment: POELE, tags: MAIN, protein: WHITE, vegetable: true },
  { id: 'h43', kind: 'salade', method: 'salad', label: 'Salade de lentilles, artichaut et truite', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 15, cook: 0, equipment: SALADE, tags: SALAD, protein: ['lentille', 'truite'], vegetable: true },
  { id: 'h44', kind: 'bowl', method: 'bowl', label: 'Couscous de la mer', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 20, equipment: CASS, tags: MAIN, protein: [...FISH, 'moule', 'crevette'], starch: ['couscous', 'semoule'], vegetable: true },
  { id: 'h45', kind: 'poelee', method: 'skillet', label: 'Poulet basquaise léger', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 25, equipment: POELE, tags: MAIN, protein: WHITE, vegetable: ['poivron', 'tomate'] },
  { id: 'h46', kind: 'salade', method: 'salad', label: 'Salade César légère au poulet', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 15, cook: 0, equipment: SALADE, tags: SALAD, protein: WHITE, vegetable: true },
  { id: 'h47', kind: 'soupe', method: 'soup', label: 'Gaspacho de courgettes au basilic', source: 'lacerisesurlemaillot.fr', diets: VEGAN, prep: 15, cook: 0, equipment: CASS, tags: SOUP, vegetable: ['courgette'] },
  { id: 'h48', kind: 'gratin', method: 'bake', label: 'Tian de légumes', source: 'lacerisesurlemaillot.fr', diets: VEGAN, prep: 15, cook: 35, equipment: FOUR, tags: MAIN, vegetable: true },
  { id: 'h49', kind: 'poelee', method: 'skillet', label: 'Poulet aux épices, courgettes et câpres', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 18, equipment: POELE, tags: MAIN, protein: WHITE, vegetable: ['courgette'] },
  { id: 'h50', kind: 'four', method: 'oven', label: 'Courgettes farcies à la dinde', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 15, cook: 30, equipment: FOUR, tags: MAIN, protein: ['dinde'], vegetable: ['courgette'] },
  { id: 'h51', kind: 'four', method: 'oven', label: 'Brochettes de poulet à l’orientale', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 15, cook: 20, equipment: FOUR, tags: MAIN, protein: WHITE, vegetable: ['carotte'] },
  { id: 'h52', kind: 'salade', method: 'salad', label: 'Salade de poulet aux saveurs vietnamiennes', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 15, cook: 0, equipment: SALADE, tags: SALAD, protein: WHITE, vegetable: true },
  { id: 'h53', kind: 'salade', method: 'salad', label: 'Cacik de concombre au yaourt', source: 'lacerisesurlemaillot.fr', diets: VEGE, prep: 10, cook: 0, equipment: SALADE, tags: SALAD, vegetable: ['concombre'], dairy: true, protein: LEGUME },
  { id: 'h54', kind: 'four', method: 'oven', label: 'Brochettes de poulet moutarde-estragon', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 12, cook: 18, equipment: FOUR, tags: MAIN, protein: WHITE, vegetable: true },
  { id: 'h55', kind: 'poelee', method: 'skillet', label: 'Axoa de dinde', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 25, equipment: POELE, tags: MAIN, protein: ['dinde'], vegetable: ['poivron'] },
  { id: 'h56', kind: 'four', method: 'oven', label: 'Brochettes de poulet soja-gingembre', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 12, cook: 18, equipment: FOUR, tags: MAIN, protein: WHITE, vegetable: true },
  { id: 'h57', kind: 'salade', method: 'salad', label: 'Coleslaw léger', source: 'lacerisesurlemaillot.fr', diets: VEGAN, prep: 12, cook: 0, equipment: SALADE, tags: SALAD, vegetable: ['chou'], protein: LEGUME },
  { id: 'h58', kind: 'four', method: 'parcel', label: 'Papillote de lieu aux petits légumes', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 20, equipment: FOUR, tags: MAIN, protein: ['lieu', ...FISH], vegetable: true },
  { id: 'h59', kind: 'poelee', method: 'skillet', label: 'Filet de poulet mariné citron et épices', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 15, equipment: POELE, tags: MAIN, protein: WHITE, vegetable: true },
  { id: 'h60', kind: 'gratin', method: 'bake', label: 'Gratin de courgettes et carottes', source: 'lacerisesurlemaillot.fr', diets: VEGE, prep: 15, cook: 30, equipment: FOUR, tags: MAIN, vegetable: ['courgette', 'carotte'], dairy: true },
  { id: 'h61', kind: 'salade', method: 'salad', label: 'Salade lentilles et sardines', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 12, cook: 0, equipment: SALADE, tags: SALAD, protein: ['lentille', 'sardine'], vegetable: true },
  { id: 'h62', kind: 'salade', method: 'salad', label: 'Salade haricots verts et pomme de terre', source: 'lacerisesurlemaillot.fr', diets: VEGAN, prep: 15, cook: 15, equipment: SALADE, tags: SALAD, vegetable: ['haricot'], starch: ['pomme de terre', 'patate'], protein: LEGUME },
  { id: 'h63', kind: 'salade', method: 'salad', label: 'Ceviche de crevettes aux poivrons', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 15, cook: 0, equipment: SALADE, tags: SALAD, protein: ['crevette'], vegetable: ['poivron'] },
  { id: 'h64', kind: 'salade', method: 'salad', label: 'Salade pois chiches, tomate, concombre et feta', source: 'tangerinezest.com', diets: VEGE, prep: 12, cook: 0, equipment: SALADE, tags: SALAD, protein: ['pois chiche', 'pois-chiche'], vegetable: ['tomate', 'concombre'], dairy: true },
  { id: 'h65', kind: 'curry', method: 'curry', label: 'Curry de légumes et pois chiches', source: 'tangerinezest.com', diets: VEGAN, prep: 10, cook: 25, equipment: CASS, tags: MAIN, protein: ['pois chiche', 'pois-chiche'], vegetable: true },
  { id: 'h66', kind: 'soupe', method: 'soup', label: 'Soupe de haricots blancs et légumes', source: 'tangerinezest.com', diets: VEGAN, prep: 10, cook: 25, equipment: CASS, tags: SOUP, protein: ['haricot'], vegetable: true },
  { id: 'h67', kind: 'curry', method: 'curry', label: 'Curry de lentilles vertes et légumes', source: 'tangerinezest.com', diets: VEGAN, prep: 10, cook: 30, equipment: CASS, tags: MAIN, protein: ['lentille'], vegetable: true },
  { id: 'h68', kind: 'curry', method: 'curry', label: 'Dahl de lentilles corail', source: 'tangerinezest.com', diets: VEGAN, prep: 10, cook: 25, equipment: CASS, tags: MAIN, protein: ['lentille'], vegetable: true },
  { id: 'h69', kind: 'pates', method: 'pasta', label: 'Bolognaise de lentilles et champignons', source: 'tangerinezest.com', diets: VEGAN, prep: 10, cook: 25, equipment: CASS, tags: MAIN, protein: ['lentille'], vegetable: ['champignon', 'tomate'], starch: ['pate', 'spaghetti'] },
  { id: 'h70', kind: 'four', method: 'parcel', label: 'Poisson au citron en papillote', source: 'tangerinezest.com', diets: OMNI, prep: 10, cook: 20, equipment: FOUR, tags: MAIN, protein: FISH, vegetable: true },
  { id: 'h71', kind: 'four', method: 'oven', label: 'Blanc de poulet au four', source: 'tangerinezest.com', diets: OMNI, prep: 8, cook: 25, equipment: FOUR, tags: MAIN, protein: WHITE, vegetable: true },
  { id: 'h72', kind: 'wok', method: 'wok', label: 'Nouilles sautées aux légumes sauce soja', source: 'tangerinezest.com', diets: VEGAN, prep: 10, cook: 12, equipment: WOK, tags: MAIN, starch: ['nouille', 'pate'], vegetable: true, protein: LEGUME },
  { id: 'h73', kind: 'curry', method: 'curry', label: 'Curry thaï de légumes au lait de coco', source: 'tangerinezest.com', diets: VEGAN, prep: 10, cook: 20, equipment: CASS, tags: MAIN, vegetable: true, protein: ['tofu', ...LEGUME] },
  { id: 'h74', kind: 'soupe', method: 'soup', label: 'Velouté de courgette au fromage frais', source: 'tangerinezest.com', diets: VEGE, prep: 10, cook: 20, equipment: CASS, tags: SOUP, vegetable: ['courgette'], dairy: true },
  { id: 'h75', kind: 'soupe', method: 'soup', label: 'Soupe de butternut et lentilles corail', source: 'tangerinezest.com', diets: VEGAN, prep: 10, cook: 25, equipment: CASS, tags: SOUP, protein: ['lentille'], vegetable: ['butternut', 'potiron', 'courge'] },
  { id: 'h76', kind: 'soupe', method: 'stew', label: 'Harira aux pois chiches', source: 'tangerinezest.com', diets: VEGAN, prep: 10, cook: 30, equipment: CASS, tags: SOUP, protein: ['pois chiche', 'lentille'], vegetable: ['tomate'] },
  { id: 'h77', kind: 'poelee', method: 'skillet', label: 'Crevettes sautées à l’ail', source: 'tangerinezest.com', diets: OMNI, prep: 5, cook: 8, equipment: POELE, tags: MAIN, protein: ['crevette'], vegetable: true },
  { id: 'h78', kind: 'salade', method: 'salad', label: 'Salade de betterave, yaourt et noix', source: 'tangerinezest.com', diets: VEGE, prep: 12, cook: 0, equipment: SALADE, tags: SALAD, vegetable: ['betterave'], dairy: true, protein: ['noix', ...LEGUME] },
  { id: 'h79', kind: 'salade', method: 'salad', label: 'Salade de concombre, pois chiches et feta', source: 'tangerinezest.com', diets: VEGE, prep: 12, cook: 0, equipment: SALADE, tags: SALAD, protein: ['pois chiche'], vegetable: ['concombre'], dairy: true },
  { id: 'h80', kind: 'bowl', method: 'bowl', label: 'Salade de betterave, céréales et orange', source: 'tangerinezest.com', diets: VEGAN, prep: 12, cook: 15, equipment: SALADE, tags: MAIN, starch: true, vegetable: ['betterave'], fruit: true, protein: LEGUME },
  { id: 'h81', kind: 'petit-dejeuner', method: 'breakfast', label: 'Pancakes banane et avoine', source: 'tangerinezest.com', diets: VEGE, prep: 8, cook: 10, equipment: POELE, tags: BREAKFAST, fruit: true, starch: ['avoine', 'flocon'], egg: true },
  { id: 'h82', kind: 'poelee', method: 'skillet', label: 'Boulettes de poulet aux herbes', source: 'tangerinezest.com', diets: OMNI, prep: 15, cook: 15, equipment: POELE, tags: MAIN, protein: WHITE, vegetable: true },
  { id: 'h83', kind: 'bowl', method: 'bowl', label: 'Bowl poulet citron et quinoa', source: 'yourdietexpert.com', diets: OMNI, prep: 10, cook: 20, equipment: CASS, tags: MAIN, protein: WHITE, starch: ['quinoa'], vegetable: true },
  { id: 'h84', kind: 'four', method: 'oven', label: 'Saumon méditerranéen au four', source: 'yourdietexpert.com', diets: OMNI, prep: 8, cook: 18, equipment: FOUR, tags: MAIN, protein: ['saumon'], vegetable: true },
  { id: 'h85', kind: 'pates', method: 'pasta', label: 'Pâtes aux crevettes à l’ail', source: 'yourdietexpert.com', diets: OMNI, prep: 8, cook: 12, equipment: CASS, tags: MAIN, protein: ['crevette'], starch: ['pate', 'spaghetti'], vegetable: true },
  { id: 'h86', kind: 'four', method: 'oven', label: 'Poulet et légumes à la plaque', source: 'yourdietexpert.com', diets: OMNI, prep: 10, cook: 30, equipment: FOUR, tags: MAIN, protein: WHITE, vegetable: true },
  { id: 'h87', kind: 'four', method: 'oven', label: 'Poivrons farcis méditerranéens', source: 'yourdietexpert.com', diets: OMNI, prep: 15, cook: 30, equipment: FOUR, tags: MAIN, vegetable: ['poivron'], protein: true },
  { id: 'h88', kind: 'poelee', method: 'skillet', label: 'Poulet et pois chiches à la poêle', source: 'yourdietexpert.com', diets: OMNI, prep: 10, cook: 20, equipment: POELE, tags: MAIN, protein: WHITE, starch: ['pois chiche'], vegetable: true },
  { id: 'h89', kind: 'four', method: 'oven', label: 'Cabillaud et asperges rôtis', source: 'yourdietexpert.com', diets: OMNI, prep: 8, cook: 18, equipment: FOUR, tags: MAIN, protein: ['cabillaud', ...FISH], vegetable: true },
  { id: 'h90', kind: 'bowl', method: 'bowl', label: 'Bowl crevettes et quinoa', source: 'yourdietexpert.com', diets: OMNI, prep: 10, cook: 15, equipment: CASS, tags: MAIN, protein: ['crevette'], starch: ['quinoa'], vegetable: true },
  { id: 'h91', kind: 'poelee', method: 'skillet', label: 'Poulet et haricots blancs', source: 'yourdietexpert.com', diets: OMNI, prep: 10, cook: 20, equipment: POELE, tags: MAIN, protein: WHITE, starch: ['haricot'], vegetable: true },
  { id: 'h92', kind: 'bowl', method: 'bowl', label: 'Bowl de thon méditerranéen', source: 'yourdietexpert.com', diets: OMNI, prep: 10, cook: 10, equipment: SALADE, tags: MAIN, protein: ['thon'], starch: true, vegetable: true },
  { id: 'h93', kind: 'curry', method: 'stew', label: 'Ragoût de dinde aux lentilles', source: 'yourdietexpert.com', diets: OMNI, prep: 10, cook: 30, equipment: CASS, tags: MAIN, protein: ['dinde'], starch: ['lentille'], vegetable: true },
  { id: 'h94', kind: 'poelee', method: 'skillet', label: 'Crevettes méditerranéennes à l’ail', source: 'yourdietexpert.com', diets: OMNI, prep: 8, cook: 10, equipment: POELE, tags: MAIN, protein: ['crevette'], vegetable: true },
  { id: 'h95', kind: 'salade', method: 'salad', label: 'Salade de poulet grillé méditerranéenne', source: 'yourdietexpert.com', diets: OMNI, prep: 15, cook: 12, equipment: SALADE, tags: SALAD, protein: WHITE, vegetable: true },
  { id: 'h96', kind: 'bowl', method: 'bowl', label: 'Buddha bowl aux pois chiches', source: 'edithetsacuisine.fr', diets: VEGAN, prep: 15, cook: 20, equipment: CASS, tags: MAIN, protein: ['pois chiche'], starch: ['quinoa', 'riz'], vegetable: true },
  { id: 'h97', kind: 'petit-dejeuner', method: 'breakfast', label: 'Overnight porridge', source: 'latabledesamis.fr', diets: VEGAN, prep: 5, cook: 0, equipment: ['saladier'], tags: BREAKFAST, starch: ['avoine', 'flocon'], fruit: true, dairy: true },
  { id: 'h98', kind: 'soupe', method: 'soup', label: 'Soupe de lentilles corail', source: 'vegourmet.fr', diets: VEGAN, prep: 10, cook: 25, equipment: CASS, tags: SOUP, protein: ['lentille'], vegetable: ['carotte'] },
  { id: 'h99', kind: 'soupe', method: 'soup', label: 'Velouté lentilles corail et potiron', source: 'marieclaire.fr', diets: VEGAN, prep: 10, cook: 20, equipment: CASS, tags: SOUP, protein: ['lentille'], vegetable: ['potiron', 'butternut', 'courge'] },
  { id: 'h100', kind: 'wok', method: 'wok', label: 'Nouilles sautées au poulet et légumes', source: 'femmeactuelle.fr', diets: OMNI, prep: 10, cook: 12, equipment: WOK, tags: MAIN, protein: WHITE, starch: ['nouille', 'pate'], vegetable: true },
];
