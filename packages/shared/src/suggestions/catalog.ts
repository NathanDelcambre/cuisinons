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
 * 200 plats healthy recensés sur des sélections publiques (dîners légers,
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
  { id: 'h44', kind: 'bowl', method: 'bowl', label: 'Couscous de la mer', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 20, equipment: CASS, tags: MAIN, protein: ['lieu', 'crevette'], starch: ['couscous', 'semoule'], vegetable: true },
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
  { id: 'h101', kind: 'petit-dejeuner', method: 'breakfast', label: 'Porridge coco-banane', source: 'elle.fr', diets: VEGE, prep: 5, cook: 8, equipment: CASS, tags: BREAKFAST, starch: ['avoine', 'flocon'], fruit: true, dairy: true },
  { id: 'h102', kind: 'petit-dejeuner', method: 'breakfast', label: 'Bowl fromage blanc, orange et avoine', source: 'marmiton.org', diets: VEGE, prep: 8, cook: 0, equipment: ['saladier'], tags: BREAKFAST, starch: ['avoine', 'flocon'], fruit: true, dairy: true },
  { id: 'h103', kind: 'petit-dejeuner', method: 'breakfast', label: 'Galettes avoine-carotte', source: 'cuisineaz.com', diets: VEGE, prep: 10, cook: 10, equipment: POELE, tags: BREAKFAST, starch: ['avoine', 'flocon'], vegetable: ['carotte'], egg: true },
  { id: 'h104', kind: 'petit-dejeuner', method: 'breakfast', label: 'Smoothie bowl orange et avoine', source: '750g.com', diets: VEGE, prep: 8, cook: 0, equipment: ['blender'], tags: BREAKFAST, starch: ['avoine', 'flocon'], fruit: true, dairy: true },
  { id: 'h105', kind: 'omelette', method: 'omelette', label: 'Œufs brouillés aux champignons', source: 'cuisineactuelle.fr', diets: VEGE, prep: 8, cook: 8, equipment: POELE, tags: MAIN, egg: true, vegetable: ['champignon'] },
  { id: 'h106', kind: 'petit-dejeuner', method: 'breakfast', label: 'Overnight oats au citron', source: 'latabledesamis.fr', diets: VEGE, prep: 5, cook: 0, equipment: ['saladier'], tags: BREAKFAST, starch: ['avoine', 'flocon'], dairy: true, fruit: true },
  { id: 'h107', kind: 'petit-dejeuner', method: 'breakfast', label: 'Pancakes avoine et fromage blanc', source: 'femmeactuelle.fr', diets: VEGE, prep: 8, cook: 10, equipment: POELE, tags: BREAKFAST, starch: ['avoine', 'flocon'], egg: true, dairy: true },
  { id: 'h108', kind: 'petit-dejeuner', method: 'breakfast', label: 'Porridge banane et noix', source: 'elle.fr', diets: VEGE, prep: 5, cook: 8, equipment: CASS, tags: BREAKFAST, starch: ['avoine', 'flocon'], fruit: true, protein: ['noix'] },
  { id: 'h109', kind: 'soupe', method: 'soup', label: 'Minestrone de légumes et haricots', source: 'marmiton.org', diets: VEGAN, prep: 15, cook: 30, equipment: CASS, tags: SOUP, protein: ['haricot'], vegetable: ['tomate', 'carotte', 'courgette'] },
  { id: 'h110', kind: 'soupe', method: 'soup', label: 'Velouté de chou-fleur', source: 'marieclaire.fr', diets: VEGAN, prep: 10, cook: 25, equipment: CASS, tags: SOUP, vegetable: ['chou-fleur'], protein: LEGUME },
  { id: 'h111', kind: 'soupe', method: 'soup', label: 'Soupe de pois chiches au cumin', source: 'tangerinezest.com', diets: VEGAN, prep: 10, cook: 25, equipment: CASS, tags: SOUP, protein: ['pois chiche'], vegetable: ['carotte', 'tomate'] },
  { id: 'h112', kind: 'soupe', method: 'soup', label: 'Soupe thaï crevettes et coco', source: 'cuisineaz.com', diets: OMNI, prep: 10, cook: 15, equipment: CASS, tags: SOUP, protein: ['crevette'], vegetable: ['courgette', 'poivron'] },
  { id: 'h113', kind: 'soupe', method: 'soup', label: 'Velouté de betterave', source: '750g.com', diets: VEGAN, prep: 10, cook: 25, equipment: CASS, tags: SOUP, vegetable: ['betterave'], protein: LEGUME },
  { id: 'h114', kind: 'soupe', method: 'soup', label: 'Soupe de potiron et pois chiches', source: 'vegourmet.fr', diets: VEGAN, prep: 10, cook: 25, equipment: CASS, tags: SOUP, protein: ['pois chiche'], vegetable: ['potiron', 'butternut'] },
  { id: 'h115', kind: 'soupe', method: 'soup', label: 'Bouillon de légumes aux lentilles', source: 'edithetsacuisine.fr', diets: VEGAN, prep: 10, cook: 30, equipment: CASS, tags: SOUP, protein: ['lentille'], vegetable: ['carotte', 'courgette'] },
  { id: 'h116', kind: 'soupe', method: 'soup', label: 'Soupe froide concombre-yaourt', source: 'lacerisesurlemaillot.fr', diets: VEGE, prep: 12, cook: 0, equipment: CASS, tags: SOUP, vegetable: ['concombre'], dairy: true, protein: LEGUME },
  { id: 'h117', kind: 'soupe', method: 'soup', label: 'Velouté d’asperges', source: 'marieclaire.fr', diets: VEGAN, prep: 10, cook: 20, equipment: CASS, tags: SOUP, vegetable: ['asperge'], protein: LEGUME },
  { id: 'h118', kind: 'soupe', method: 'soup', label: 'Soupe de tomates rôties aux lentilles', source: 'tangerinezest.com', diets: VEGAN, prep: 10, cook: 30, equipment: CASS, tags: SOUP, protein: ['lentille'], vegetable: ['tomate'] },
  { id: 'h119', kind: 'salade', method: 'salad', label: 'Salade quinoa, avocat et poulet', source: 'yourdietexpert.com', diets: OMNI, prep: 15, cook: 12, equipment: SALADE, tags: SALAD, protein: WHITE, starch: ['quinoa'], vegetable: true },
  { id: 'h120', kind: 'salade', method: 'salad', label: 'Salade chèvre, betterave et noix', source: 'elle.fr', diets: VEGE, prep: 12, cook: 0, equipment: SALADE, tags: SALAD, vegetable: ['betterave'], dairy: true, protein: ['noix', ...LEGUME] },
  { id: 'h121', kind: 'salade', method: 'salad', label: 'Salade de cabillaud et haricots verts', source: 'femmeactuelle.fr', diets: OMNI, prep: 15, cook: 10, equipment: SALADE, tags: SALAD, protein: ['cabillaud'], vegetable: ['haricot'] },
  { id: 'h122', kind: 'salade', method: 'salad', label: 'Salade de tofu croquant', source: 'vegourmet.fr', diets: VEGAN, prep: 12, cook: 8, equipment: SALADE, tags: SALAD, protein: ['tofu'], vegetable: true },
  { id: 'h123', kind: 'salade', method: 'salad', label: 'Salade sardines, tomate et concombre', source: 'marmiton.org', diets: OMNI, prep: 12, cook: 0, equipment: SALADE, tags: SALAD, protein: ['sardine'], vegetable: ['tomate', 'concombre'] },
  { id: 'h124', kind: 'salade', method: 'salad', label: 'Salade de quinoa aux asperges', source: 'cuisineaz.com', diets: VEGAN, prep: 12, cook: 10, equipment: SALADE, tags: SALAD, starch: ['quinoa'], vegetable: ['asperge'], protein: LEGUME },
  { id: 'h125', kind: 'salade', method: 'salad', label: 'Salade d’artichauts et pois chiches', source: 'tangerinezest.com', diets: VEGAN, prep: 12, cook: 0, equipment: SALADE, tags: SALAD, protein: ['pois chiche'], vegetable: ['artichaut', 'tomate'] },
  { id: 'h126', kind: 'salade', method: 'salad', label: 'Salade de maquereau et pomme de terre', source: '750g.com', diets: OMNI, prep: 15, cook: 15, equipment: SALADE, tags: SALAD, protein: ['maquereau'], starch: ['pomme de terre'], vegetable: true },
  { id: 'h127', kind: 'salade', method: 'salad', label: 'Salade de truite et concombre', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 12, cook: 0, equipment: SALADE, tags: SALAD, protein: ['truite'], vegetable: ['concombre'] },
  { id: 'h128', kind: 'salade', method: 'salad', label: 'Salade de lentilles, carotte et cumin', source: 'edithetsacuisine.fr', diets: VEGAN, prep: 12, cook: 0, equipment: SALADE, tags: SALAD, protein: ['lentille'], vegetable: ['carotte'] },
  { id: 'h129', kind: 'bowl', method: 'bowl', label: 'Taboulé de quinoa aux herbes', source: 'marmiton.org', diets: VEGAN, prep: 15, cook: 15, equipment: SALADE, tags: MAIN, starch: ['quinoa'], vegetable: ['tomate', 'concombre'], protein: LEGUME },
  { id: 'h130', kind: 'riz', method: 'bowl', label: 'Bowl de riz, saumon et avocat', source: 'yourdietexpert.com', diets: OMNI, prep: 10, cook: 15, equipment: CASS, tags: MAIN, protein: ['saumon'], starch: ['riz'], vegetable: true },
  { id: 'h131', kind: 'bowl', method: 'bowl', label: 'Bowl tofu, quinoa et légumes', source: 'vegourmet.fr', diets: VEGAN, prep: 12, cook: 15, equipment: CASS, tags: MAIN, protein: ['tofu'], starch: ['quinoa'], vegetable: true },
  { id: 'h132', kind: 'bowl', method: 'bowl', label: 'Poke bowl thon et concombre', source: 'elle.fr', diets: OMNI, prep: 15, cook: 10, equipment: SALADE, tags: MAIN, protein: ['thon'], starch: ['riz'], vegetable: ['concombre', 'carotte'] },
  { id: 'h133', kind: 'bowl', method: 'bowl', label: 'Bowl dinde, patate douce et chou', source: 'yourdietexpert.com', diets: OMNI, prep: 12, cook: 25, equipment: FOUR, tags: MAIN, protein: ['dinde'], starch: ['patate douce'], vegetable: ['chou'] },
  { id: 'h134', kind: 'bowl', method: 'bowl', label: 'Bowl pois chiches, betterave et feta', source: 'tangerinezest.com', diets: VEGE, prep: 12, cook: 10, equipment: SALADE, tags: MAIN, protein: ['pois chiche'], vegetable: ['betterave'], dairy: true, starch: ['quinoa'] },
  { id: 'h135', kind: 'bowl', method: 'bowl', label: 'Bowl merlu, quinoa et courgette', source: 'femmeactuelle.fr', diets: OMNI, prep: 10, cook: 15, equipment: CASS, tags: MAIN, protein: ['merlu'], starch: ['quinoa'], vegetable: ['courgette'] },
  { id: 'h136', kind: 'bowl', method: 'bowl', label: 'Bowl haricots blancs, tomate et basilic', source: 'marmiton.org', diets: VEGAN, prep: 10, cook: 10, equipment: SALADE, tags: MAIN, protein: ['haricot'], vegetable: ['tomate'], starch: ['riz'] },
  { id: 'h137', kind: 'bowl', method: 'bowl', label: 'Bowl crevettes, riz et poivron', source: 'cuisineaz.com', diets: OMNI, prep: 10, cook: 12, equipment: CASS, tags: MAIN, protein: ['crevette'], starch: ['riz'], vegetable: ['poivron'] },
  { id: 'h138', kind: 'bowl', method: 'bowl', label: 'Bowl lentilles, avocat et œuf', source: 'edithetsacuisine.fr', diets: VEGE, prep: 10, cook: 10, equipment: SALADE, tags: MAIN, protein: ['lentille'], vegetable: true, egg: true },
  { id: 'h139', kind: 'bowl', method: 'bowl', label: 'Buddha bowl saumon et légumes rôtis', source: 'yourdietexpert.com', diets: OMNI, prep: 15, cook: 25, equipment: FOUR, tags: MAIN, protein: ['saumon'], starch: ['quinoa'], vegetable: true },
  { id: 'h140', kind: 'four', method: 'oven', label: 'Poulet rôti au citron et thym', source: 'marmiton.org', diets: OMNI, prep: 10, cook: 30, equipment: FOUR, tags: MAIN, protein: WHITE, vegetable: true },
  { id: 'h141', kind: 'four', method: 'oven', label: 'Dinde rôtie aux légumes d’automne', source: 'cuisineactuelle.fr', diets: OMNI, prep: 15, cook: 35, equipment: FOUR, tags: MAIN, protein: ['dinde'], vegetable: ['carotte', 'potiron'] },
  { id: 'h142', kind: 'four', method: 'oven', label: 'Filet mignon et patate douce', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 25, equipment: FOUR, tags: MAIN, protein: ['porc', 'mignon'], starch: ['patate douce'] },
  { id: 'h143', kind: 'four', method: 'oven', label: 'Pavé de saumon aux asperges', source: '750g.com', diets: OMNI, prep: 8, cook: 18, equipment: FOUR, tags: MAIN, protein: ['saumon'], vegetable: ['asperge'] },
  { id: 'h144', kind: 'four', method: 'oven', label: 'Cabillaud en croûte d’herbes', source: 'marieclaire.fr', diets: OMNI, prep: 10, cook: 18, equipment: FOUR, tags: MAIN, protein: ['cabillaud'], vegetable: true },
  { id: 'h145', kind: 'four', method: 'oven', label: 'Légumes rôtis et pois chiches', source: 'vegourmet.fr', diets: VEGAN, prep: 12, cook: 30, equipment: FOUR, tags: MAIN, protein: ['pois chiche'], vegetable: ['courgette', 'poivron', 'tomate'] },
  { id: 'h146', kind: 'gratin', method: 'bake', label: 'Gratin léger d’aubergine au yaourt', source: 'tangerinezest.com', diets: VEGE, prep: 10, cook: 30, equipment: FOUR, tags: MAIN, vegetable: ['aubergine'], dairy: true, protein: LEGUME },
  { id: 'h147', kind: 'four', method: 'parcel', label: 'Papillote de truite et citron', source: 'femmeactuelle.fr', diets: OMNI, prep: 10, cook: 18, equipment: FOUR, tags: MAIN, protein: ['truite'], vegetable: true },
  { id: 'h148', kind: 'four', method: 'oven', label: 'Poivrons farcis aux lentilles', source: 'edithetsacuisine.fr', diets: VEGAN, prep: 15, cook: 30, equipment: FOUR, tags: MAIN, protein: ['lentille'], vegetable: ['poivron', 'tomate'] },
  { id: 'h149', kind: 'gratin', method: 'bake', label: 'Gratin léger de courge et chèvre', source: 'elle.fr', diets: VEGE, prep: 10, cook: 30, equipment: FOUR, tags: MAIN, vegetable: ['potiron', 'butternut'], dairy: true, protein: LEGUME },
  { id: 'h150', kind: 'four', method: 'oven', label: 'Tomates rôties et filet de porc', source: 'marmiton.org', diets: OMNI, prep: 10, cook: 25, equipment: FOUR, tags: MAIN, protein: ['porc', 'mignon'], vegetable: ['tomate'] },
  { id: 'h151', kind: 'four', method: 'oven', label: 'Lieu rôti aux champignons', source: 'cuisineaz.com', diets: OMNI, prep: 10, cook: 20, equipment: FOUR, tags: MAIN, protein: ['lieu', ...FISH], vegetable: ['champignon'] },
  { id: 'h152', kind: 'poelee', method: 'skillet', label: 'Dinde poêlée aux champignons', source: 'cuisineactuelle.fr', diets: OMNI, prep: 10, cook: 15, equipment: POELE, tags: MAIN, protein: ['dinde'], vegetable: ['champignon'] },
  { id: 'h153', kind: 'poelee', method: 'skillet', label: 'Thon poêlé aux légumes verts', source: '750g.com', diets: OMNI, prep: 8, cook: 10, equipment: POELE, tags: MAIN, protein: ['thon'], vegetable: ['haricot', 'courgette'] },
  { id: 'h154', kind: 'poelee', method: 'skillet', label: 'Filet mignon aux champignons', source: 'lacerisesurlemaillot.fr', diets: OMNI, prep: 10, cook: 15, equipment: POELE, tags: MAIN, protein: ['porc', 'mignon'], vegetable: ['champignon'] },
  { id: 'h155', kind: 'poelee', method: 'skillet', label: 'Tofu sauté aux légumes', source: 'vegourmet.fr', diets: VEGAN, prep: 10, cook: 12, equipment: POELE, tags: MAIN, protein: ['tofu'], vegetable: true },
  { id: 'h156', kind: 'omelette', method: 'omelette', label: 'Œufs au plat et épinards', source: 'marmiton.org', diets: VEGE, prep: 5, cook: 8, equipment: POELE, tags: MAIN, egg: true, vegetable: ['épinard'] },
  { id: 'h157', kind: 'poelee', method: 'skillet', label: 'Poulet aux olives et citron', source: 'tangerinezest.com', diets: OMNI, prep: 10, cook: 18, equipment: POELE, tags: MAIN, protein: WHITE, vegetable: true },
  { id: 'h158', kind: 'poelee', method: 'skillet', label: 'Crevettes, courgettes et citron', source: 'femmeactuelle.fr', diets: OMNI, prep: 8, cook: 10, equipment: POELE, tags: MAIN, protein: ['crevette'], vegetable: ['courgette'] },
  { id: 'h159', kind: 'poelee', method: 'skillet', label: 'Maquereau poêlé aux tomates', source: 'cuisineaz.com', diets: OMNI, prep: 8, cook: 12, equipment: POELE, tags: MAIN, protein: ['maquereau'], vegetable: ['tomate'] },
  { id: 'h160', kind: 'poelee', method: 'skillet', label: 'Sardines aux poivrons', source: '750g.com', diets: OMNI, prep: 8, cook: 10, equipment: POELE, tags: MAIN, protein: ['sardine'], vegetable: ['poivron'] },
  { id: 'h161', kind: 'poelee', method: 'skillet', label: 'Porc sauté soja-gingembre', source: 'elle.fr', diets: OMNI, prep: 10, cook: 12, equipment: POELE, tags: MAIN, protein: ['porc', 'mignon'], vegetable: true },
  { id: 'h162', kind: 'poelee', method: 'skillet', label: 'Poêlée de haricots verts et tofu', source: 'vegourmet.fr', diets: VEGAN, prep: 10, cook: 12, equipment: POELE, tags: MAIN, protein: ['tofu'], vegetable: ['haricot'] },
  { id: 'h163', kind: 'poelee', method: 'skillet', label: 'Escalope de dinde à la moutarde', source: 'marmiton.org', diets: OMNI, prep: 8, cook: 12, equipment: POELE, tags: MAIN, protein: ['dinde'], vegetable: true },
  { id: 'h164', kind: 'wok', method: 'wok', label: 'Wok de tofu et légumes croquants', source: 'edithetsacuisine.fr', diets: VEGAN, prep: 12, cook: 10, equipment: WOK, tags: MAIN, protein: ['tofu'], vegetable: ['poivron', 'courgette', 'carotte'] },
  { id: 'h165', kind: 'wok', method: 'wok', label: 'Wok crevettes, gingembre et nouilles', source: 'cuisineaz.com', diets: OMNI, prep: 10, cook: 12, equipment: WOK, tags: MAIN, protein: ['crevette'], starch: ['nouille', 'pate'], vegetable: true },
  { id: 'h166', kind: 'wok', method: 'wok', label: 'Wok poulet, chou et soja', source: 'femmeactuelle.fr', diets: OMNI, prep: 10, cook: 12, equipment: WOK, tags: MAIN, protein: WHITE, vegetable: ['chou', 'carotte'] },
  { id: 'h167', kind: 'wok', method: 'wok', label: 'Wok de légumes et œuf', source: 'tangerinezest.com', diets: VEGE, prep: 10, cook: 10, equipment: WOK, tags: MAIN, egg: true, vegetable: true, protein: LEGUME },
  { id: 'h168', kind: 'wok', method: 'wok', label: 'Wok saumon et légumes sauce soja', source: 'yourdietexpert.com', diets: OMNI, prep: 10, cook: 10, equipment: WOK, tags: MAIN, protein: ['saumon'], vegetable: true },
  { id: 'h169', kind: 'wok', method: 'wok', label: 'Wok dinde et poivrons', source: '750g.com', diets: OMNI, prep: 10, cook: 12, equipment: WOK, tags: MAIN, protein: ['dinde'], vegetable: ['poivron'] },
  { id: 'h170', kind: 'pates', method: 'pasta', label: 'Pâtes tomate et basilic', source: 'marmiton.org', diets: VEGAN, prep: 8, cook: 12, equipment: CASS, tags: MAIN, starch: ['pate', 'spaghetti'], vegetable: ['tomate'], protein: LEGUME },
  { id: 'h171', kind: 'pates', method: 'pasta', label: 'Spaghetti aux sardines', source: 'cuisineactuelle.fr', diets: OMNI, prep: 8, cook: 12, equipment: CASS, tags: MAIN, protein: ['sardine'], starch: ['pate', 'spaghetti'], vegetable: ['tomate'] },
  { id: 'h172', kind: 'pates', method: 'pasta', label: 'Pâtes poulet et courgettes', source: 'elle.fr', diets: OMNI, prep: 10, cook: 15, equipment: CASS, tags: MAIN, protein: WHITE, starch: ['pate'], vegetable: ['courgette'] },
  { id: 'h173', kind: 'pates', method: 'pasta', label: 'Pâtes thon, tomate et olives', source: '750g.com', diets: OMNI, prep: 8, cook: 12, equipment: CASS, tags: MAIN, protein: ['thon'], starch: ['pate'], vegetable: ['tomate'] },
  { id: 'h174', kind: 'pates', method: 'pasta', label: 'Pâtes crevettes et poivrons', source: 'femmeactuelle.fr', diets: OMNI, prep: 8, cook: 12, equipment: CASS, tags: MAIN, protein: ['crevette'], starch: ['pate'], vegetable: ['poivron'] },
  { id: 'h175', kind: 'pates', method: 'pasta', label: 'Pâtes lentilles et épinards', source: 'vegourmet.fr', diets: VEGAN, prep: 10, cook: 15, equipment: CASS, tags: MAIN, protein: ['lentille'], starch: ['pate'], vegetable: ['épinard'] },
  { id: 'h176', kind: 'curry', method: 'curry', label: 'Curry de poulet au lait de coco', source: 'marmiton.org', diets: OMNI, prep: 10, cook: 20, equipment: CASS, tags: MAIN, protein: WHITE, vegetable: true },
  { id: 'h177', kind: 'curry', method: 'curry', label: 'Curry de tofu et légumes', source: 'tangerinezest.com', diets: VEGAN, prep: 10, cook: 20, equipment: CASS, tags: MAIN, protein: ['tofu'], vegetable: true },
  { id: 'h178', kind: 'curry', method: 'curry', label: 'Dahl de pois chiches', source: 'edithetsacuisine.fr', diets: VEGAN, prep: 10, cook: 25, equipment: CASS, tags: MAIN, protein: ['pois chiche'], vegetable: ['tomate'] },
  { id: 'h179', kind: 'curry', method: 'stew', label: 'Ragoût de cabillaud aux tomates', source: 'cuisineaz.com', diets: OMNI, prep: 10, cook: 20, equipment: CASS, tags: MAIN, protein: ['cabillaud'], vegetable: ['tomate', 'poivron'] },
  { id: 'h180', kind: 'curry', method: 'curry', label: 'Curry de dinde et patate douce', source: 'yourdietexpert.com', diets: OMNI, prep: 10, cook: 25, equipment: CASS, tags: MAIN, protein: ['dinde'], starch: ['patate douce'], vegetable: true },
  { id: 'h181', kind: 'curry', method: 'stew', label: 'Tajine de légumes et pois chiches', source: 'lacerisesurlemaillot.fr', diets: VEGAN, prep: 15, cook: 30, equipment: CASS, tags: MAIN, protein: ['pois chiche'], vegetable: ['carotte', 'courgette', 'tomate'] },
  { id: 'h182', kind: 'curry', method: 'stew', label: 'Ragoût de haricots blancs et tomates', source: 'marmiton.org', diets: VEGAN, prep: 10, cook: 25, equipment: CASS, tags: MAIN, protein: ['haricot'], vegetable: ['tomate'] },
  { id: 'h183', kind: 'curry', method: 'curry', label: 'Curry de saumon coco', source: 'elle.fr', diets: OMNI, prep: 10, cook: 15, equipment: CASS, tags: MAIN, protein: ['saumon'], vegetable: true },
  { id: 'h184', kind: 'omelette', method: 'omelette', label: 'Omelette aux champignons', source: 'cuisineactuelle.fr', diets: VEGE, prep: 8, cook: 10, equipment: POELE, tags: MAIN, egg: true, vegetable: ['champignon'] },
  { id: 'h185', kind: 'omelette', method: 'omelette', label: 'Omelette tomate-basilic', source: 'marmiton.org', diets: VEGE, prep: 8, cook: 10, equipment: POELE, tags: MAIN, egg: true, vegetable: ['tomate'] },
  { id: 'h186', kind: 'omelette', method: 'omelette', label: 'Omelette aux asperges', source: 'marieclaire.fr', diets: VEGE, prep: 8, cook: 10, equipment: POELE, tags: MAIN, egg: true, vegetable: ['asperge'] },
  { id: 'h187', kind: 'omelette', method: 'omelette', label: 'Omelette courgette et chèvre', source: '750g.com', diets: VEGE, prep: 8, cook: 12, equipment: POELE, tags: MAIN, egg: true, vegetable: ['courgette'], dairy: true },
  { id: 'h188', kind: 'omelette', method: 'omelette', label: 'Omelette poivron et feta', source: 'tangerinezest.com', diets: VEGE, prep: 8, cook: 12, equipment: POELE, tags: MAIN, egg: true, vegetable: ['poivron'], dairy: true },
  { id: 'h189', kind: 'omelette', method: 'omelette', label: 'Œufs brouillés tomate-avocat', source: 'femmeactuelle.fr', diets: VEGE, prep: 8, cook: 8, equipment: POELE, tags: MAIN, egg: true, vegetable: ['tomate'] },
  { id: 'h190', kind: 'riz', method: 'rice', label: 'Riz sauté aux crevettes', source: 'cuisineaz.com', diets: OMNI, prep: 10, cook: 12, equipment: WOK, tags: MAIN, protein: ['crevette'], starch: ['riz'], vegetable: true },
  { id: 'h191', kind: 'riz', method: 'rice', label: 'Riz, lentilles et carottes', source: 'vegourmet.fr', diets: VEGAN, prep: 10, cook: 20, equipment: CASS, tags: MAIN, protein: ['lentille'], starch: ['riz'], vegetable: ['carotte'] },
  { id: 'h192', kind: 'riz', method: 'bowl', label: 'Pilaf de quinoa aux légumes', source: 'edithetsacuisine.fr', diets: VEGAN, prep: 10, cook: 18, equipment: CASS, tags: MAIN, starch: ['quinoa'], vegetable: ['carotte', 'courgette'], protein: LEGUME },
  { id: 'h193', kind: 'riz', method: 'rice', label: 'Riz au thon et petits légumes', source: 'marmiton.org', diets: OMNI, prep: 10, cook: 15, equipment: CASS, tags: MAIN, protein: ['thon'], starch: ['riz'], vegetable: true },
  { id: 'h194', kind: 'salade', method: 'salad', label: 'Salade de moules et pomme de terre', source: '750g.com', diets: OMNI, prep: 15, cook: 15, equipment: SALADE, tags: SALAD, protein: ['moule'], starch: ['pomme de terre'], vegetable: true },
  { id: 'h195', kind: 'wok', method: 'wok', label: 'Wok de merlu et légumes', source: 'femmeactuelle.fr', diets: OMNI, prep: 10, cook: 12, equipment: WOK, tags: MAIN, protein: ['merlu'], vegetable: true },
  { id: 'h196', kind: 'soupe', method: 'soup', label: 'Soupe gingembre, tofu et légumes', source: 'tangerinezest.com', diets: VEGAN, prep: 10, cook: 20, equipment: CASS, tags: SOUP, protein: ['tofu'], vegetable: ['carotte', 'courgette'] },
  { id: 'h197', kind: 'bowl', method: 'bowl', label: 'Bowl avocat, œuf et quinoa', source: 'yourdietexpert.com', diets: VEGE, prep: 10, cook: 15, equipment: SALADE, tags: MAIN, starch: ['quinoa'], egg: true, vegetable: true, protein: LEGUME },
  { id: 'h198', kind: 'poelee', method: 'skillet', label: 'Filet de porc aux poivrons', source: 'cuisineactuelle.fr', diets: OMNI, prep: 10, cook: 15, equipment: POELE, tags: MAIN, protein: ['porc', 'mignon'], vegetable: ['poivron'] },
  { id: 'h199', kind: 'gratin', method: 'bake', label: 'Gratin de chou-fleur léger', source: 'marieclaire.fr', diets: VEGE, prep: 15, cook: 30, equipment: FOUR, tags: MAIN, vegetable: ['chou-fleur'], dairy: true, protein: LEGUME },
  { id: 'h200', kind: 'four', method: 'oven', label: 'Poulet rôti, citron et olives', source: 'marmiton.org', diets: OMNI, prep: 10, cook: 30, equipment: FOUR, tags: MAIN, protein: WHITE, vegetable: true },
];
