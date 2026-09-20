import { culinaryName, joinFrench, withDeArticle, withDefiniteArticle } from './names.js';
import { primaryRole, type CulinaryRole, type Diet } from './roles.js';
import type { UxCategory } from '../ciqual/ux-categories.js';
import { DISH_KINDS, type DishKind } from './kinds.js';
import type { Archetype, PickedIngredient, RoleNeed } from './archetypes.js';

export type CatalogRecipeInput = {
  id: string;
  name: string;
  description: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  tagSlugs: readonly string[];
  equipmentSlugs: readonly string[];
  ingredients: ReadonlyArray<{ nameFr: string; uxCategory: UxCategory }>;
};

const OMNI: Diet[] = ['omnivore'];
const VEGE: Diet[] = ['omnivore', 'vegetarian'];
const VEGAN: Diet[] = ['omnivore', 'vegetarian', 'vegan'];

const ROLE_GRAMS: Record<CulinaryRole, number> = {
  protein: 130,
  vegetable: 180,
  starch: 100,
  egg: 120,
  dairy: 80,
  fruit: 120,
  fat: 10,
  aromatic: 20,
  condiment: 12,
};

const REQUIRED_ROLES = new Set<CulinaryRole>(['protein', 'vegetable', 'starch', 'egg', 'dairy', 'fruit']);

function ofRole(picked: readonly PickedIngredient[], role: CulinaryRole): PickedIngredient[] {
  return picked.filter((item) => item.role === role);
}

function named(items: readonly PickedIngredient[]): string {
  return joinFrench(items.map((item) => culinaryName(item.nameFr)));
}

function namedThe(items: readonly PickedIngredient[]): string {
  return joinFrench(items.map((item) => withDefiniteArticle(culinaryName(item.nameFr))));
}

function namedDe(items: readonly PickedIngredient[]): string {
  return joinFrench(items.map((item) => withDeArticle(culinaryName(item.nameFr))));
}

export function dietsFromTags(tags: readonly string[]): Diet[] {
  if (tags.includes('vegan')) return VEGAN;
  if (tags.includes('vegetarien')) return VEGE;
  return OMNI;
}

export function kindFromTags(tags: readonly string[]): DishKind {
  for (const kind of DISH_KINDS) {
    if (tags.includes(kind)) return kind;
  }
  if (tags.includes('gouter')) return 'petit-dejeuner';
  return 'poelee';
}

function needsFromIngredients(
  ingredients: CatalogRecipeInput['ingredients'],
): RoleNeed[] {
  const grouped = new Map<CulinaryRole, string[]>();
  for (const ingredient of ingredients) {
    const role = primaryRole(ingredient.uxCategory);
    if (!role) continue;
    const name = culinaryName(ingredient.nameFr);
    const names = grouped.get(role) ?? [];
    if (name && !names.includes(name)) names.push(name);
    grouped.set(role, names);
  }

  const needs: RoleNeed[] = [];
  for (const [role, names] of grouped) {
    const required = REQUIRED_ROLES.has(role);
    needs.push({
      role,
      required,
      gramsPerServing: ROLE_GRAMS[role],
      maxItems: role === 'vegetable' || role === 'fruit' ? 2 : 1,
      minRatio: required ? undefined : 0.3,
      nameIncludes: required ? names : undefined,
    });
  }
  return needs;
}

function cooked(kind: DishKind): boolean {
  return kind !== 'salade' && kind !== 'petit-dejeuner';
}

function stepsForKind(
  kind: DishKind,
  cook: number,
  picked: readonly PickedIngredient[],
): Array<{ description: string; durationMinutes: number | null }> {
  const veg = namedThe(ofRole(picked, 'vegetable'));
  const protein = namedThe(ofRole(picked, 'protein'));
  const starch = namedThe(ofRole(picked, 'starch'));
  const fat = namedThe(ofRole(picked, 'fat'));
  const dairy = namedThe(ofRole(picked, 'dairy'));
  const fruit = namedThe(ofRole(picked, 'fruit'));
  const extra = joinFrench([protein, veg, starch].filter(Boolean));
  const dairyDe = namedDe(ofRole(picked, 'dairy'));
  switch (kind) {
    case 'wok':
      return [
        { description: starch ? `Cuire ${starch} si besoin, réserver.` : `Couper ${veg || extra}.`, durationMinutes: 8 },
        { description: `Faire sauter ${extra} à feu vif.`, durationMinutes: 8 },
        { description: 'Servir aussitôt.', durationMinutes: null },
      ];
    case 'four':
      return [
        { description: `Préchauffer le four à 190 °C. Couper ${veg || extra}.`, durationMinutes: 10 },
        { description: `Enfourner ${extra}.`, durationMinutes: cook },
        { description: 'Vérifier la cuisson et servir.', durationMinutes: null },
      ];
    case 'salade':
      return [
        { description: `Couper ${veg || extra}.`, durationMinutes: 10 },
        { description: `Mélanger ${extra}${dairy ? ` et ${dairy}` : ''}.`, durationMinutes: 3 },
        { description: 'Assaisonner et servir frais.', durationMinutes: null },
      ];
    case 'soupe':
      return [
        { description: `Couper ${veg || extra}.`, durationMinutes: 8 },
        { description: 'Couvrir d’eau ou de bouillon, laisser mijoter.', durationMinutes: Math.max(12, cook) },
        { description: 'Mixer ou servir en morceaux.', durationMinutes: 2 },
      ];
    case 'curry':
      return [
        { description: `Faire revenir ${joinFrench([protein, veg].filter(Boolean)) || extra}.`, durationMinutes: 8 },
        { description: starch ? `Ajouter ${starch} et laisser mijoter.` : 'Laisser mijoter à couvert.', durationMinutes: cook },
        { description: 'Rectifier l’assaisonnement et servir.', durationMinutes: null },
      ];
    case 'gratin':
      return [
        { description: `Préchauffer le four à 180 °C. Ranger ${veg || extra} dans un plat.`, durationMinutes: 10 },
        { description: dairyDe ? `Napper ${dairyDe} et enfourner.` : 'Enfourner.', durationMinutes: cook },
      ];
    case 'omelette':
      return [
        { description: dairy ? `Battre les œufs avec ${dairy}.` : 'Battre les œufs.', durationMinutes: 2 },
        { description: veg ? `Faire revenir ${veg}, verser les œufs.` : 'Cuire les œufs à feu moyen.', durationMinutes: cook },
      ];
    case 'bowl':
      return [
        { description: starch ? `Cuire ${starch}.` : 'Préparer la base.', durationMinutes: 12 },
        { description: `Dresser ${extra}.`, durationMinutes: 8 },
      ];
    case 'pates':
      return [
        { description: `Cuire ${starch || 'les pâtes'}.`, durationMinutes: 10 },
        { description: `Préparer ${joinFrench([protein, veg].filter(Boolean)) || extra}.`, durationMinutes: 8 },
        { description: 'Mélanger et servir.', durationMinutes: 2 },
      ];
    case 'riz':
      return [
        { description: `Cuire ${starch || 'le riz'}.`, durationMinutes: 12 },
        { description: `Faire sauter ${extra}.`, durationMinutes: 10 },
      ];
    case 'petit-dejeuner':
      return [
        {
          description: `Assembler ${joinFrench([starch, dairy, fruit].filter(Boolean)) || extra} dans un bol.`,
          durationMinutes: 5,
        },
      ];
    default:
      return [
        { description: veg ? `Couper ${veg}.` : 'Préparer les ingrédients.', durationMinutes: 8 },
        {
          description: fat ? `Saisir ${protein || extra} dans ${fat}.` : `Saisir ${protein || extra} à la poêle.`,
          durationMinutes: 10,
        },
        { description: veg && protein ? `Ajouter ${veg} et poursuivre.` : 'Cuire jusqu’à coloration.', durationMinutes: 8 },
        { description: 'Assaisonner et servir.', durationMinutes: null },
      ];
  }
}

/**
 * Une fiche catalogue (ou n’importe quelle recette publiée) devient un
 * archétype : les noms d’ingrédients servent de filtres, le stock compose.
 */
export function catalogRecipeToArchetype(recipe: CatalogRecipeInput): Archetype {
  const kind = kindFromTags(recipe.tagSlugs);
  const needs = needsFromIngredients(recipe.ingredients);
  if (cooked(kind) && !needs.some((need) => need.role === 'fat')) {
    needs.push({ role: 'fat', required: false, gramsPerServing: 10, maxItems: 1, minRatio: 0.3 });
  }
  if (cooked(kind) && !needs.some((need) => need.role === 'aromatic')) {
    needs.push({ role: 'aromatic', required: false, gramsPerServing: 20, maxItems: 1, minRatio: 0.3 });
  }
  const cook = recipe.cookTimeMinutes ?? 0;
  return {
    id: recipe.id,
    kind,
    diets: dietsFromTags(recipe.tagSlugs),
    prepTimeMinutes: recipe.prepTimeMinutes ?? 10,
    cookTimeMinutes: cook,
    equipmentSlugs: recipe.equipmentSlugs,
    baseTagSlugs: recipe.tagSlugs,
    needs,
    title: () => recipe.name,
    description: (picked) =>
      recipe.description?.trim() ||
      `Composé avec tes réserves : ${named(picked)}.`,
    steps: (picked) => stepsForKind(kind, cook, picked),
  };
}
