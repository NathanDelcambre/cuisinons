import type { UxCategory } from '../ciqual/ux-categories.js';
import {
  capitalize,
  complementDe,
  culinaryName,
  joinFrench,
  withDeArticle,
  withDefiniteArticle,
} from './names.js';
import type { CulinaryRole, Diet } from './roles.js';
import { DISH_KINDS, DISH_KIND_LABELS, type DishKind } from './kinds.js';

export { DISH_KINDS, DISH_KIND_LABELS, type DishKind };


export type RoleNeed = {
  role: CulinaryRole;
  required: boolean;
  gramsPerServing: number;
  maxItems: number;
  /** En dessous de ce ratio du besoin, le rôle obligatoire est considéré manquant. */
  minRatio?: number;
  nameIncludes?: readonly string[];
  nameExcludes?: readonly string[];
  categories?: readonly UxCategory[];
};

export type PickedIngredient = {
  ingredientId: string;
  nameFr: string;
  uxCategory: UxCategory;
  useGrams: number;
  role: CulinaryRole;
};

export type Archetype = {
  id: string;
  kind: DishKind;
  diets: readonly Diet[];
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  equipmentSlugs: readonly string[];
  baseTagSlugs: readonly string[];
  needs: readonly RoleNeed[];
  /** Au moins un de ces rôles optionnels doit être rempli (bol du matin). */
  requireAny?: readonly CulinaryRole[];
  title: (picked: readonly PickedIngredient[]) => string;
  description: (picked: readonly PickedIngredient[]) => string;
  steps: (picked: readonly PickedIngredient[]) => Array<{
    description: string;
    durationMinutes: number | null;
  }>;
};

function ofRole(picked: readonly PickedIngredient[], role: CulinaryRole): PickedIngredient[] {
  return picked.filter((item) => item.role === role);
}

function names(items: readonly PickedIngredient[]): string[] {
  return items.map((item) => culinaryName(item.nameFr));
}

function named(items: readonly PickedIngredient[]): string {
  return joinFrench(names(items));
}

function namedThe(items: readonly PickedIngredient[]): string {
  return joinFrench(names(items).map(withDefiniteArticle));
}

function namedDe(items: readonly PickedIngredient[]): string {
  return joinFrench(names(items).map(withDeArticle));
}

function firstName(items: readonly PickedIngredient[], fallback: string): string {
  return names(items)[0] ?? fallback;
}

const GENERIC_ARCHETYPES: readonly Archetype[] = [
  {
    id: 'poelee',
    kind: 'poelee',
    diets: ['omnivore', 'vegetarian', 'vegan'],
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    equipmentSlugs: ['poele', 'couteau'],
    baseTagSlugs: ['plat-principal', 'healthy'],
    needs: [
      { role: 'protein', required: true, gramsPerServing: 130, maxItems: 1 },
      { role: 'vegetable', required: true, gramsPerServing: 180, maxItems: 2 },
      { role: 'fat', required: false, gramsPerServing: 10, maxItems: 1, minRatio: 0.4 },
      { role: 'aromatic', required: false, gramsPerServing: 20, maxItems: 2, minRatio: 0.3 },
    ],
    title: (picked) =>
      capitalize(
        `poêlée ${complementDe(firstName(ofRole(picked, 'protein'), 'protéines'))} et ${named(ofRole(picked, 'vegetable'))}`,
      ),
    description: (picked) =>
      `Poêlée rapide avec ${named(picked.filter((item) => item.role === 'protein' || item.role === 'vegetable'))}, uniquement ce que tu as en réserve.`,
    steps: (picked) => {
      const veg = namedThe(ofRole(picked, 'vegetable'));
      const protein = namedThe(ofRole(picked, 'protein'));
      const fat = namedThe(ofRole(picked, 'fat'));
      const aromatic = namedThe(ofRole(picked, 'aromatic'));
      return [
        { description: `Laver et couper ${veg}.`, durationMinutes: 8 },
        {
          description: fat
            ? `Faire chauffer ${fat} dans une poêle.`
            : 'Chauffer une poêle antiadhésive, sans matière grasse.',
          durationMinutes: 2,
        },
        { description: `Faire revenir ${protein} jusqu’à coloration.`, durationMinutes: 8 },
        {
          description: aromatic
            ? `Ajouter ${veg} et ${aromatic}, poursuivre la cuisson.`
            : `Ajouter ${veg} et poursuivre la cuisson.`,
          durationMinutes: 7,
        },
        { description: 'Assaisonner et servir aussitôt.', durationMinutes: null },
      ];
    },
  },
  {
    id: 'salade',
    kind: 'salade',
    diets: ['omnivore', 'vegetarian', 'vegan'],
    prepTimeMinutes: 15,
    cookTimeMinutes: 0,
    equipmentSlugs: ['saladier', 'couteau'],
    baseTagSlugs: ['salade', 'healthy'],
    needs: [
      { role: 'vegetable', required: true, gramsPerServing: 180, maxItems: 3 },
      { role: 'protein', required: false, gramsPerServing: 120, maxItems: 1, minRatio: 0.5 },
      { role: 'fat', required: false, gramsPerServing: 10, maxItems: 1, minRatio: 0.4 },
      { role: 'condiment', required: false, gramsPerServing: 10, maxItems: 1, minRatio: 0.3 },
    ],
    title: (picked) => {
      const protein = ofRole(picked, 'protein');
      const veg = named(ofRole(picked, 'vegetable'));
      return capitalize(
        protein.length > 0 ? `salade ${complementDe(firstName(protein, 'protéines'))} et ${veg}` : `salade ${complementDe(veg)}`,
      );
    },
    description: () => 'Salade composée, sans cuisson, à partir des légumes en stock.',
    steps: (picked) => {
      const veg = namedThe(ofRole(picked, 'vegetable'));
      const protein = namedThe(ofRole(picked, 'protein'));
      const fat = namedThe(ofRole(picked, 'fat'));
      const condiment = namedThe(ofRole(picked, 'condiment'));
      const dressing = joinFrench([fat, condiment].filter(Boolean));
      return [
        { description: `Laver et couper ${veg}.`, durationMinutes: 10 },
        ...(protein
          ? [{ description: `Ajouter ${protein}.`, durationMinutes: null }]
          : []),
        {
          description: dressing
            ? `Assaisonner avec ${dressing} et mélanger.`
            : 'Assaisonner et mélanger.',
          durationMinutes: 2,
        },
      ];
    },
  },
  {
    id: 'soupe',
    kind: 'soupe',
    diets: ['omnivore', 'vegetarian', 'vegan'],
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    equipmentSlugs: ['casserole', 'couteau'],
    baseTagSlugs: ['soupe', 'healthy'],
    needs: [
      { role: 'vegetable', required: true, gramsPerServing: 220, maxItems: 3 },
      { role: 'aromatic', required: false, gramsPerServing: 30, maxItems: 2, minRatio: 0.3 },
      { role: 'starch', required: false, gramsPerServing: 50, maxItems: 1, minRatio: 0.4 },
      { role: 'fat', required: false, gramsPerServing: 5, maxItems: 1, minRatio: 0.3 },
    ],
    title: (picked) => capitalize(`soupe ${complementDe(named(ofRole(picked, 'vegetable')))}`),
    description: (picked) => `Soupe de ${named(ofRole(picked, 'vegetable'))}, mixée ou servie en morceaux.`,
    steps: (picked) => {
      const veg = namedThe(ofRole(picked, 'vegetable'));
      const aromatic = namedThe(ofRole(picked, 'aromatic'));
      const starch = namedThe(ofRole(picked, 'starch'));
      const fat = namedThe(ofRole(picked, 'fat'));
      return [
        { description: `Éplucher et couper ${veg}${aromatic ? ` et ${aromatic}` : ''}.`, durationMinutes: 8 },
        {
          description: fat ? `Faire suer dans ${fat}.` : 'Mettre les légumes dans une casserole.',
          durationMinutes: 3,
        },
        {
          description: starch
            ? `Couvrir d’eau, ajouter ${starch}, laisser mijoter.`
            : 'Couvrir d’eau et laisser mijoter.',
          durationMinutes: 18,
        },
        { description: 'Mixer ou servir en morceaux, rectifier l’assaisonnement.', durationMinutes: 2 },
      ];
    },
  },
  {
    id: 'omelette',
    kind: 'omelette',
    diets: ['omnivore', 'vegetarian'],
    prepTimeMinutes: 5,
    cookTimeMinutes: 8,
    equipmentSlugs: ['poele', 'fouet'],
    baseTagSlugs: ['plat-principal', 'vegetarien'],
    needs: [
      { role: 'egg', required: true, gramsPerServing: 120, maxItems: 1, nameIncludes: ['oeuf'] },
      { role: 'vegetable', required: false, gramsPerServing: 120, maxItems: 2, minRatio: 0.4 },
      { role: 'dairy', required: false, gramsPerServing: 20, maxItems: 1, minRatio: 0.4 },
      { role: 'fat', required: false, gramsPerServing: 5, maxItems: 1, minRatio: 0.3 },
    ],
    title: (picked) => {
      const veg = ofRole(picked, 'vegetable');
      return capitalize(veg.length > 0 ? `omelette ${complementDe(named(veg))}` : 'omelette nature');
    },
    description: () => 'Omelette rapide, éventuellement garnie avec un légume du frigo.',
    steps: (picked) => {
      const veg = namedThe(ofRole(picked, 'vegetable'));
      const dairy = namedThe(ofRole(picked, 'dairy'));
      const fat = namedThe(ofRole(picked, 'fat'));
      return [
        {
          description: dairy ? `Battre les œufs avec ${dairy}.` : 'Battre les œufs.',
          durationMinutes: 2,
        },
        ...(veg ? [{ description: `Faire revenir ${veg}.`, durationMinutes: 4 }] : []),
        {
          description: fat
            ? `Cuire l’omelette dans ${fat} à feu moyen.`
            : 'Cuire l’omelette dans une poêle antiadhésive.',
          durationMinutes: 6,
        },
      ];
    },
  },
  {
    id: 'bowl',
    kind: 'bowl',
    diets: ['omnivore', 'vegetarian', 'vegan'],
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    equipmentSlugs: ['casserole', 'couteau'],
    baseTagSlugs: ['plat-principal', 'healthy'],
    needs: [
      { role: 'starch', required: true, gramsPerServing: 100, maxItems: 1 },
      { role: 'protein', required: true, gramsPerServing: 130, maxItems: 1 },
      { role: 'vegetable', required: true, gramsPerServing: 150, maxItems: 2 },
      { role: 'fat', required: false, gramsPerServing: 6, maxItems: 1, minRatio: 0.3 },
    ],
    title: (picked) =>
      capitalize(
        `bowl ${joinFrench([
          firstName(ofRole(picked, 'protein'), 'protéines'),
          firstName(ofRole(picked, 'starch'), 'féculent'),
          named(ofRole(picked, 'vegetable')),
        ])}`,
      ),
    description: () => 'Assiette complète : féculent, protéine et légumes.',
    steps: (picked) => {
      const starch = namedThe(ofRole(picked, 'starch'));
      const protein = namedThe(ofRole(picked, 'protein'));
      const veg = namedThe(ofRole(picked, 'vegetable'));
      return [
        { description: `Cuire ${starch}.`, durationMinutes: 12 },
        { description: `Cuire ${protein} à part.`, durationMinutes: 10 },
        { description: `Couper ${veg} et dresser le bowl.`, durationMinutes: 5 },
      ];
    },
  },
  {
    id: 'gratin',
    kind: 'gratin',
    diets: ['omnivore', 'vegetarian'],
    prepTimeMinutes: 15,
    cookTimeMinutes: 25,
    equipmentSlugs: ['four', 'moule'],
    baseTagSlugs: ['plat-principal'],
    needs: [
      { role: 'vegetable', required: true, gramsPerServing: 200, maxItems: 2 },
      { role: 'dairy', required: true, gramsPerServing: 50, maxItems: 2 },
      { role: 'protein', required: false, gramsPerServing: 120, maxItems: 1, minRatio: 0.5 },
      { role: 'starch', required: false, gramsPerServing: 80, maxItems: 1, minRatio: 0.4 },
    ],
    title: (picked) => capitalize(`gratin ${complementDe(named(ofRole(picked, 'vegetable')))}`),
    description: () => 'Gratin au four, lié avec un produit laitier du frigo.',
    steps: (picked) => {
      const veg = namedThe(ofRole(picked, 'vegetable'));
      const dairy = namedDe(ofRole(picked, 'dairy'));
      const protein = namedThe(ofRole(picked, 'protein'));
      const starch = namedThe(ofRole(picked, 'starch'));
      return [
        { description: `Préchauffer le four à 180 °C. Couper ${veg}.`, durationMinutes: 10 },
        {
          description: [protein, starch].filter(Boolean).length
            ? `Répartir ${joinFrench([veg, protein, starch].filter(Boolean))} dans un plat.`
            : `Répartir ${veg} dans un plat.`,
          durationMinutes: 3,
        },
        { description: `Napper ${dairy} et enfourner.`, durationMinutes: 25 },
      ];
    },
  },
  {
    id: 'pates',
    kind: 'pates',
    diets: ['omnivore', 'vegetarian', 'vegan'],
    prepTimeMinutes: 5,
    cookTimeMinutes: 12,
    equipmentSlugs: ['casserole', 'poele'],
    baseTagSlugs: ['pates', 'plat-principal'],
    needs: [
      {
        role: 'starch',
        required: true,
        gramsPerServing: 100,
        maxItems: 1,
        nameIncludes: ['pate', 'spaghetti', 'tagliatelle', 'penne', 'nouille', 'lasagne', 'macaroni', 'fusilli'],
      },
      { role: 'vegetable', required: false, gramsPerServing: 120, maxItems: 2, minRatio: 0.4 },
      { role: 'protein', required: false, gramsPerServing: 120, maxItems: 1, minRatio: 0.5 },
      { role: 'fat', required: false, gramsPerServing: 10, maxItems: 1, minRatio: 0.3 },
    ],
    requireAny: ['vegetable', 'protein'],
    title: (picked) => {
      const extra = [...ofRole(picked, 'protein'), ...ofRole(picked, 'vegetable')];
      return capitalize(extra.length > 0 ? `pâtes ${complementDe(named(extra))}` : 'pâtes nature');
    },
    description: () => 'Pâtes assaisonnées avec ce que le frigo permet.',
    steps: (picked) => {
      const pasta = namedThe(ofRole(picked, 'starch'));
      const extra = namedThe([...ofRole(picked, 'protein'), ...ofRole(picked, 'vegetable')]);
      const fat = namedThe(ofRole(picked, 'fat'));
      return [
        { description: `Cuire ${pasta} dans l’eau bouillante salée.`, durationMinutes: 10 },
        ...(extra
          ? [
              {
                description: fat
                  ? `Faire revenir ${extra} avec ${fat}.`
                  : `Faire revenir ${extra}.`,
                durationMinutes: 8,
              },
            ]
          : []),
        { description: 'Mélanger aux pâtes égouttées et servir.', durationMinutes: 2 },
      ];
    },
  },
  {
    id: 'riz',
    kind: 'riz',
    diets: ['omnivore', 'vegetarian', 'vegan'],
    prepTimeMinutes: 8,
    cookTimeMinutes: 15,
    equipmentSlugs: ['casserole', 'poele'],
    baseTagSlugs: ['riz', 'plat-principal'],
    needs: [
      { role: 'starch', required: true, gramsPerServing: 100, maxItems: 1, nameIncludes: ['riz'] },
      { role: 'vegetable', required: true, gramsPerServing: 150, maxItems: 2 },
      { role: 'protein', required: false, gramsPerServing: 130, maxItems: 1, minRatio: 0.5 },
      { role: 'aromatic', required: false, gramsPerServing: 20, maxItems: 1, minRatio: 0.3 },
      { role: 'fat', required: false, gramsPerServing: 10, maxItems: 1, minRatio: 0.3 },
    ],
    title: (picked) => {
      const protein = ofRole(picked, 'protein');
      const veg = named(ofRole(picked, 'vegetable'));
      return capitalize(
        protein.length > 0 ? `riz ${complementDe(firstName(protein, 'protéines'))} et ${veg}` : `riz sauté ${complementDe(veg)}`,
      );
    },
    description: () => 'Riz sauté avec des légumes, éventuellement une protéine.',
    steps: (picked) => {
      const rice = namedThe(ofRole(picked, 'starch'));
      const veg = namedThe(ofRole(picked, 'vegetable'));
      const protein = namedThe(ofRole(picked, 'protein'));
      const aromatic = namedThe(ofRole(picked, 'aromatic'));
      return [
        { description: `Cuire ${rice} si besoin.`, durationMinutes: 12 },
        {
          description: protein
            ? `Faire sauter ${protein}, ${veg}${aromatic ? ` et ${aromatic}` : ''}.`
            : `Faire sauter ${veg}${aromatic ? ` et ${aromatic}` : ''}.`,
          durationMinutes: 10,
        },
        { description: 'Mélanger au riz et servir chaud.', durationMinutes: 2 },
      ];
    },
  },
  {
    id: 'petit-dejeuner',
    kind: 'petit-dejeuner',
    diets: ['omnivore', 'vegetarian', 'vegan'],
    prepTimeMinutes: 5,
    cookTimeMinutes: 0,
    equipmentSlugs: ['saladier'],
    baseTagSlugs: ['petit-dejeuner', 'healthy'],
    needs: [
      { role: 'fruit', required: true, gramsPerServing: 100, maxItems: 2 },
      { role: 'dairy', required: false, gramsPerServing: 120, maxItems: 1, minRatio: 0.5 },
      {
        role: 'starch',
        required: false,
        gramsPerServing: 40,
        maxItems: 1,
        minRatio: 0.5,
        nameIncludes: ['avoine', 'flocon', 'muesli', 'granola', 'pain'],
      },
    ],
    requireAny: ['dairy', 'starch'],
    title: (picked) =>
      capitalize(`bol ${joinFrench(names([...ofRole(picked, 'dairy'), ...ofRole(picked, 'starch'), ...ofRole(picked, 'fruit')]))}`),
    description: () => 'Petit-déjeuner assemblé, sans cuisson.',
    steps: (picked) => {
      const parts = namedThe(picked);
      return [{ description: `Assembler ${parts} dans un bol.`, durationMinutes: 3 }];
    },
  },
];

/** Patrons de composition (poêlée, salade…). Les fiches nommées viennent de la table Recipe. */
export const ARCHETYPES: readonly Archetype[] = GENERIC_ARCHETYPES;
