import type { DishKind } from './kinds.js';
import type { CookMethod, RecipeSpec } from './catalog.js';

const OMNI = ['omnivore'] as const;
const MAIN = ['plat-principal'] as const;
const POELE = ['poele', 'couteau'] as const;
const FOUR = ['four', 'plaque-cuisson'] as const;
const CASS = ['casserole', 'couteau'] as const;
const WOK = ['wok', 'couteau'] as const;

const CHEESES = [
  'emmental',
  'comté',
  'parmesan',
  'gruyère',
  'roquefort',
  'gorgonzola',
  'raclette',
  'cantal',
  'bleu',
  'reblochon',
  'mimolette',
  'tomme',
  'munster',
  'beaufort',
  'saint-nectaire',
  'feta',
  'chèvre',
  'mozzarella',
  'cheddar',
] as const;

const PASTA_GARNISHES: Array<{
  title: string;
  protein: RecipeSpec['protein'];
  vegetable: RecipeSpec['vegetable'];
  diets: RecipeSpec['diets'];
}> = [
  { title: 'poulet et courgettes', protein: ['poulet'], vegetable: ['courgette', 'tomate'], diets: OMNI },
  { title: 'bœuf et tomates', protein: ['boeuf'], vegetable: ['tomate', 'carotte'], diets: OMNI },
  { title: 'veau et champignons', protein: ['veau'], vegetable: ['champignon'], diets: OMNI },
  { title: 'jambon et épinards', protein: ['jambon'], vegetable: ['épinard'], diets: OMNI },
  { title: 'lardons et poivrons', protein: ['lardon'], vegetable: ['poivron'], diets: OMNI },
  { title: 'saucisse et tomates', protein: ['saucisse'], vegetable: ['tomate', 'oignon'], diets: OMNI },
  { title: 'crevettes et courgettes', protein: ['crevette'], vegetable: ['courgette'], diets: OMNI },
  { title: 'thon et tomates', protein: ['thon'], vegetable: ['tomate'], diets: OMNI },
];

const RICE_GARNISHES: Array<{
  title: string;
  protein: RecipeSpec['protein'];
  vegetable: RecipeSpec['vegetable'];
  method: CookMethod;
  kind: DishKind;
  equipment: RecipeSpec['equipment'];
}> = [
  { title: 'poulet', protein: ['poulet'], vegetable: ['poivron', 'carotte'], method: 'wok', kind: 'wok', equipment: WOK },
  { title: 'bœuf', protein: ['boeuf'], vegetable: ['poivron', 'oignon'], method: 'wok', kind: 'wok', equipment: WOK },
  { title: 'canard', protein: ['canard'], vegetable: ['courgette'], method: 'rice', kind: 'riz', equipment: CASS },
  { title: 'agneau', protein: ['agneau'], vegetable: ['tomate', 'aubergine'], method: 'rice', kind: 'riz', equipment: CASS },
  { title: 'crevettes', protein: ['crevette'], vegetable: ['poivron'], method: 'wok', kind: 'wok', equipment: WOK },
  { title: 'jambon', protein: ['jambon'], vegetable: ['carotte', 'oignon'], method: 'rice', kind: 'riz', equipment: CASS },
  { title: 'veau', protein: ['veau'], vegetable: ['champignon'], method: 'rice', kind: 'riz', equipment: CASS },
  { title: 'merguez', protein: ['merguez'], vegetable: ['poivron', 'tomate'], method: 'rice', kind: 'riz', equipment: CASS },
  { title: 'lardons', protein: ['lardon'], vegetable: ['champignon'], method: 'wok', kind: 'wok', equipment: WOK },
];

const MEAT_MAINS: Array<{
  label: string;
  protein: RecipeSpec['protein'];
  vegetable: RecipeSpec['vegetable'];
  method: CookMethod;
  kind: DishKind;
  cook: number;
}> = [
  { label: 'Steak de bœuf aux poivrons', protein: ['boeuf'], vegetable: ['poivron', 'oignon'], method: 'skillet', kind: 'poelee', cook: 12 },
  { label: 'Bavette de bœuf et tomates', protein: ['boeuf'], vegetable: ['tomate'], method: 'skillet', kind: 'poelee', cook: 10 },
  { label: 'Rôti de bœuf aux carottes', protein: ['boeuf'], vegetable: ['carotte', 'oignon'], method: 'oven', kind: 'four', cook: 35 },
  { label: 'Bœuf mijoté aux champignons', protein: ['boeuf'], vegetable: ['champignon', 'carotte'], method: 'stew', kind: 'poelee', cook: 40 },
  { label: 'Steak haché sauce tomate', protein: ['hache'], vegetable: ['tomate', 'oignon'], method: 'skillet', kind: 'poelee', cook: 12 },
  { label: 'Boulettes hachées aux herbes', protein: ['hache'], vegetable: ['tomate', 'courgette'], method: 'oven', kind: 'four', cook: 25 },
  { label: 'Escalope de veau aux champignons', protein: ['veau'], vegetable: ['champignon'], method: 'skillet', kind: 'poelee', cook: 12 },
  { label: 'Escalope de veau au citron', protein: ['veau'], vegetable: ['courgette'], method: 'skillet', kind: 'poelee', cook: 12 },
  { label: 'Rôti de veau aux carottes', protein: ['veau'], vegetable: ['carotte', 'oignon'], method: 'oven', kind: 'four', cook: 40 },
  { label: 'Blanquette de veau aux légumes', protein: ['veau'], vegetable: ['carotte', 'champignon'], method: 'stew', kind: 'poelee', cook: 45 },
  { label: 'Côtelette d’agneau aux tomates', protein: ['agneau'], vegetable: ['tomate', 'poivron'], method: 'skillet', kind: 'poelee', cook: 14 },
  { label: 'Gigot d’agneau aux herbes', protein: ['agneau'], vegetable: ['carotte', 'oignon'], method: 'oven', kind: 'four', cook: 45 },
  { label: 'Agneau mijoté à l’aubergine', protein: ['agneau'], vegetable: ['aubergine', 'tomate'], method: 'stew', kind: 'poelee', cook: 40 },
  { label: 'Brochettes d’agneau aux poivrons', protein: ['agneau'], vegetable: ['poivron', 'oignon'], method: 'oven', kind: 'four', cook: 20 },
  { label: 'Magret de canard aux courgettes', protein: ['canard'], vegetable: ['courgette'], method: 'skillet', kind: 'poelee', cook: 14 },
  { label: 'Magret de canard au four', protein: ['canard'], vegetable: ['carotte'], method: 'oven', kind: 'four', cook: 22 },
  { label: 'Émincé de canard aux poivrons', protein: ['canard'], vegetable: ['poivron', 'oignon'], method: 'wok', kind: 'wok', cook: 12 },
  { label: 'Filet mignon de porc à la tomate', protein: ['porc', 'mignon'], vegetable: ['tomate'], method: 'skillet', kind: 'poelee', cook: 16 },
  { label: 'Rôti de porc aux herbes', protein: ['porc'], vegetable: ['carotte', 'oignon'], method: 'oven', kind: 'four', cook: 40 },
  { label: 'Porc sauté aux poivrons', protein: ['porc'], vegetable: ['poivron', 'oignon'], method: 'wok', kind: 'wok', cook: 12 },
  { label: 'Escalope de dinde aux champignons', protein: ['dinde'], vegetable: ['champignon'], method: 'skillet', kind: 'poelee', cook: 12 },
  { label: 'Rôti de dinde aux carottes', protein: ['dinde'], vegetable: ['carotte'], method: 'oven', kind: 'four', cook: 35 },
  { label: 'Poulet rôti aux herbes', protein: ['poulet'], vegetable: ['carotte', 'oignon'], method: 'oven', kind: 'four', cook: 40 },
  { label: 'Poulet sauté aux poivrons', protein: ['poulet'], vegetable: ['poivron', 'tomate'], method: 'wok', kind: 'wok', cook: 15 },
  { label: 'Cuisse de poulet mijotée', protein: ['poulet'], vegetable: ['carotte', 'tomate'], method: 'stew', kind: 'poelee', cook: 35 },
  { label: 'Saucisse de Toulouse à la tomate', protein: ['saucisse'], vegetable: ['tomate', 'oignon'], method: 'stew', kind: 'poelee', cook: 25 },
  { label: 'Saucisse grillée aux poivrons', protein: ['saucisse'], vegetable: ['poivron'], method: 'skillet', kind: 'poelee', cook: 14 },
  { label: 'Merguez aux poivrons et tomates', protein: ['merguez'], vegetable: ['poivron', 'tomate'], method: 'skillet', kind: 'poelee', cook: 14 },
  { label: 'Merguez au four et courgettes', protein: ['merguez'], vegetable: ['courgette', 'oignon'], method: 'oven', kind: 'four', cook: 22 },
  { label: 'Jambon poêlé aux épinards', protein: ['jambon'], vegetable: ['épinard'], method: 'skillet', kind: 'poelee', cook: 8 },
  { label: 'Jambon rôti aux carottes', protein: ['jambon'], vegetable: ['carotte'], method: 'oven', kind: 'four', cook: 25 },
  { label: 'Lardons sautés aux champignons', protein: ['lardon'], vegetable: ['champignon', 'oignon'], method: 'skillet', kind: 'poelee', cook: 10 },
];

function spec(
  partial: Pick<RecipeSpec, 'label' | 'kind' | 'method' | 'prep' | 'cook' | 'equipment' | 'tags'> &
    Partial<RecipeSpec>,
): RecipeSpec {
  return {
    id: '',
    diets: OMNI,
    source: 'cuisinons',
    ...partial,
  };
}

function buildVarietyRecipes(): RecipeSpec[] {
  const recipes: RecipeSpec[] = [];

  for (const cheese of CHEESES) {
    for (const garnish of PASTA_GARNISHES.slice(0, 6)) {
      recipes.push(
        spec({
          label: `Pâtes ${garnish.title}, ${cheese}`,
          kind: 'pates',
          method: 'pasta',
          prep: 10,
          cook: 15,
          equipment: CASS,
          tags: MAIN,
          protein: garnish.protein,
          vegetable: garnish.vegetable,
          starch: ['pate', 'spaghetti'],
          diets: garnish.diets,
        }),
      );
    }
  }

  for (const cheese of CHEESES.slice(0, 10)) {
    recipes.push(
      spec({
        label: `Riz sauté au poulet, ${cheese}`,
        kind: 'riz',
        method: 'wok',
        prep: 10,
        cook: 15,
        equipment: WOK,
        tags: MAIN,
        protein: ['poulet'],
        vegetable: ['poivron', 'carotte'],
        starch: ['riz'],
      }),
    );
    recipes.push(
      spec({
        label: `Riz pilaf au bœuf, ${cheese}`,
        kind: 'riz',
        method: 'rice',
        prep: 10,
        cook: 20,
        equipment: CASS,
        tags: MAIN,
        protein: ['boeuf'],
        vegetable: ['carotte', 'oignon'],
        starch: ['riz'],
      }),
    );
  }

  for (const main of MEAT_MAINS) {
    recipes.push(
      spec({
        label: main.label,
        kind: main.kind,
        method: main.method,
        prep: 12,
        cook: main.cook,
        equipment: main.method === 'oven' ? FOUR : main.method === 'wok' ? WOK : main.method === 'stew' ? CASS : POELE,
        tags: MAIN,
        protein: main.protein,
        vegetable: main.vegetable,
      }),
    );
  }

  for (const cheese of CHEESES) {
    recipes.push(
      spec({
        label: `Gratin de courgettes, ${cheese}`,
        kind: 'gratin',
        method: 'bake',
        prep: 15,
        cook: 30,
        equipment: FOUR,
        tags: MAIN,
        vegetable: ['courgette', 'tomate'],
      }),
    );
  }

  for (const cheese of CHEESES.slice(0, 12)) {
    recipes.push(
      spec({
        label: `Salade de tomates, ${cheese}`,
        kind: 'salade',
        method: 'salad',
        prep: 12,
        cook: 0,
        equipment: ['saladier', 'couteau'],
        tags: ['salade'],
        vegetable: ['tomate', 'concombre'],
      }),
    );
  }

  for (const garnish of RICE_GARNISHES) {
    recipes.push(
      spec({
        label: `Riz au ${garnish.title} et légumes`,
        kind: garnish.kind,
        method: garnish.method,
        prep: 10,
        cook: 18,
        equipment: garnish.equipment,
        tags: MAIN,
        protein: garnish.protein,
        vegetable: garnish.vegetable,
        starch: ['riz'],
      }),
    );
  }

  return recipes.slice(0, 200).map((recipe, index) => ({
    ...recipe,
    id: `v${String(index + 1).padStart(3, '0')}`,
  }));
}

export const VARIETY_RECIPES: readonly RecipeSpec[] = buildVarietyRecipes();
export const VARIETY_RECIPE_COUNT = VARIETY_RECIPES.length;
