import { kitchenLabel } from '../suggestions/names.js';
import { normalizeSearchText } from '../search/normalize.js';

const FORM_QUERY_WORDS = new Set(['sec', 'sirop', 'grille', 'fume', 'au', 'aux', 'a']);
const OPTIONAL_QUERY_WORDS = new Set(['noir', 'blanc', 'vert', 'moulu', 'grains', 'grain']);

/** Plat, dessert ou conserve : seulement si la requête le demande. */
const PREPARED_FORMS = new Set([
  'arome',
  'barre',
  'bebe',
  'biscuit',
  'boisson',
  'brownie',
  'cake',
  'clafouti',
  'clafoutis',
  'cocktail',
  'compote',
  'confiture',
  'confiturier',
  'cookie',
  'coulis',
  'creme',
  'crumble',
  'dessert',
  'farine',
  'flan',
  'fromage',
  'galette',
  'gateau',
  'gaufre',
  'gelee',
  'glace',
  'granola',
  'infusion',
  'jus',
  'lait',
  'madeleine',
  'marmelade',
  'melange',
  'muesli',
  'muffin',
  'nectar',
  'panache',
  'pancake',
  'preparation',
  'prepare',
  'salade',
  'sauce',
  'smoothie',
  'sorbet',
  'soupe',
  'sirop',
  'tarte',
  'yaourt',
  'yogourt',
  'yogurt',
]);

const HEAD_STOP = new Set(['le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'd', 'au', 'aux', 'a']);

/** Découpe / conditionnement de l'aliment lui-même. */
const CUTS = new Set([
  'aiguillette',
  'blanc',
  'cote',
  'cotelette',
  'cuisse',
  'echine',
  'escalope',
  'filet',
  'gigot',
  'hache',
  'magret',
  'morceau',
  'morceaux',
  'oreillon',
  'oreillons',
  'roti',
  'steak',
  'tranche',
  'tranches',
]);

/** Qualificatifs de rayon, pas un second aliment. */
const QUALIFIERS = new Set([
  'ab',
  'bio',
  'blanc',
  'basmati',
  'cat',
  'categorie',
  'choix',
  'complet',
  'cru',
  'crue',
  'cuit',
  'cuite',
  'denoyaute',
  'denoyautes',
  'entier',
  'entiere',
  'entiers',
  'equitable',
  'espagne',
  'extra',
  'france',
  'frais',
  'fraiche',
  'golden',
  'grain',
  'grille',
  'grillee',
  'jumbo',
  'long',
  'moelleuse',
  'moelleux',
  'moulin',
  'moulu',
  'nature',
  'noir',
  'origine',
  'premier',
  'prix',
  'rond',
  'rouge',
  'sec',
  'seche',
  'sechee',
  'seches',
  'secs',
  'thai',
  'turquie',
  ...CUTS,
]);

const FRUITS = new Set([
  'abricot',
  'ananas',
  'banane',
  'brugnon',
  'cassis',
  'cerise',
  'citron',
  'clementine',
  'datte',
  'figue',
  'fraise',
  'framboise',
  'fruit',
  'groseille',
  'kiwi',
  'litchi',
  'mangue',
  'melon',
  'mirabelle',
  'mure',
  'myrtille',
  'nectarine',
  'orange',
  'peche',
  'poire',
  'pomme',
  'prune',
  'pruneau',
  'raisin',
]);

const DRIED = new Set(['sec', 'secs', 'seche', 'seches', 'sechee', 'sechees', 'moelleux', 'moelleuse']);
const SYRUP = new Set(['sirop']);

/** Catégories Open Food Facts d'un plat / d'une confiture, pas de l'ingrédient brut. */
const PROCESSED_CATEGORY_NEEDLES = [
  'baby',
  'biscuit',
  'cake',
  'candy',
  'clafoutis',
  'compote',
  'confection',
  'confiture',
  'cookie',
  'dairy-dessert',
  'dessert',
  'drink',
  'gateau',
  'granola',
  'ice-cream',
  'infant',
  'jam',
  'jelly',
  'juice',
  'marmalade',
  'meal',
  'muesli',
  'nectar',
  'pastr',
  'pie',
  'puree',
  'ready-meal',
  'soda',
  'sorbet',
  'soup',
  'spread',
  'tart',
  'yogurt',
  'yoghurt',
];

export type ProductMatchContext = {
  categories?: readonly string[];
  brand?: string | null;
};

function tokens(value: string): string[] {
  return normalizeSearchText(value).split(' ').filter(Boolean);
}

function lemma(word: string): string {
  if (word.length <= 4) return word;
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

function hasLemma(haystack: readonly string[], needle: string): boolean {
  const want = lemma(needle);
  return haystack.some((word) => lemma(word) === want);
}

function culinaryType(ingredientName: string): string | null {
  return ingredientName.match(/\btype\s+([^,;)]+)/i)?.[1]?.trim() ?? null;
}

/** Requête d'offre : « Abricot, dénoyauté, sec » → « Abricot sec », « type feta » → feta. */
export function productSearchQuery(ingredientName: string): string {
  const typed = culinaryType(ingredientName);
  if (typed) return typed;
  return kitchenLabel(ingredientName);
}

/** Mots à chercher en base : l'aliment, pas l'état (sec, sirop). */
export function productCatalogTokens(query: string): string[] {
  const words = tokens(query).filter((word) => !FORM_QUERY_WORDS.has(lemma(word)) && !HEAD_STOP.has(word));
  const required = words.filter((word) => !OPTIONAL_QUERY_WORDS.has(lemma(word)));
  return required.length > 0 ? required : words;
}

function firstContentWord(nameWords: readonly string[]): string | undefined {
  return nameWords.find((word) => !HEAD_STOP.has(word));
}

function isMix(nameWords: readonly string[], queryWords: readonly string[]): boolean {
  const asked = new Set(queryWords.map(lemma).filter((word) => FRUITS.has(word)));
  if (asked.size === 0) return false;
  return nameWords.map(lemma).some((word) => FRUITS.has(word) && !asked.has(word));
}

function hasPreparedForm(nameWords: readonly string[], queryWords: readonly string[]): boolean {
  return nameWords.some((word) => PREPARED_FORMS.has(lemma(word)) && !hasLemma(queryWords, word));
}

/** « Clafoutis aux abricots » : un plat parfumé, pas l'abricot. */
function isFlavoredDish(nameWords: readonly string[], required: readonly string[]): boolean {
  const flavorAt = nameWords.findIndex((word) => word === 'au' || word === 'aux');
  if (flavorAt <= 0) return false;
  const head = nameWords.slice(0, flavorAt).filter((word) => !HEAD_STOP.has(word));
  if (head.some((word) => hasLemma(required, word))) return false;
  return required.some((word) => hasLemma(nameWords.slice(flavorAt + 1), word));
}

function wrongHead(nameWords: readonly string[], required: readonly string[]): boolean {
  const head = firstContentWord(nameWords);
  if (!head) return true;
  const folded = lemma(head);
  if (hasLemma(required, head) || QUALIFIERS.has(folded) || CUTS.has(folded)) return false;
  return true;
}

function hasComboEt(nameWords: readonly string[], queryWords: readonly string[]): boolean {
  const et = nameWords.indexOf('et');
  if (et <= 0 || et >= nameWords.length - 1) return false;
  const left = nameWords[et - 1]!;
  const right = nameWords[et + 1]!;
  if (QUALIFIERS.has(lemma(left)) || QUALIFIERS.has(lemma(right))) return false;
  return !hasLemma(queryWords, left) || !hasLemma(queryWords, right);
}

function processedCategory(categories: readonly string[] | undefined, queryWords: readonly string[]): boolean {
  if (!categories?.length) return false;
  const haystack = normalizeSearchText(categories.join(' '));
  return PROCESSED_CATEGORY_NEEDLES.some((needle) => {
    if (!haystack.includes(needle)) return false;
    return !queryWords.some((word) => word.includes(needle) || needle.includes(lemma(word)));
  });
}

function formPenalty(nameWords: readonly string[], queryWords: readonly string[]): number | null {
  const queryDried = queryWords.some((word) => DRIED.has(lemma(word)));
  const nameDried = nameWords.some((word) => DRIED.has(lemma(word)));
  const nameSyrup = nameWords.some((word) => SYRUP.has(lemma(word)));
  const querySyrup = queryWords.some((word) => SYRUP.has(lemma(word)));
  if (queryDried && nameSyrup) return null;
  if (querySyrup && nameDried) return null;
  if (queryDried && !nameDried) return -25;
  return 0;
}

/**
 * Score d'une offre commerciale pour un ingrédient.
 * `-1` = à écarter (clafoutis, confiture, yaourt, mélange…).
 */
export function productRelevance(
  productName: string,
  query: string,
  context: ProductMatchContext = {},
): number {
  const nameWords = tokens(productName);
  const queryWords = tokens(query);
  const required = productCatalogTokens(query);
  if (nameWords.length === 0 || required.length === 0) return -1;
  if (required.some((word) => !hasLemma(nameWords, word))) return -1;
  if (hasPreparedForm(nameWords, queryWords)) return -1;
  if (wrongHead(nameWords, required)) return -1;
  if (isFlavoredDish(nameWords, required)) return -1;
  if (isMix(nameWords, queryWords)) return -1;
  if (hasComboEt(nameWords, queryWords)) return -1;
  if (processedCategory(context.categories, queryWords)) return -1;
  const brandWords = context.brand ? tokens(context.brand) : [];
  if (hasPreparedForm(brandWords, queryWords)) return -1;
  const form = formPenalty(nameWords, queryWords);
  if (form === null) return -1;
  const content = nameWords.filter((word) => !HEAD_STOP.has(word));
  const extra = content.filter(
    (word) => word !== 'et' && !hasLemma(required, word) && !QUALIFIERS.has(lemma(word)),
  ).length;
  const exact = content.map(lemma).join(' ') === queryWords.map(lemma).join(' ');
  const startsWithQuery = required.every((word, index) => lemma(content[index] ?? '') === lemma(word));
  return (exact ? 1_000 : 0) + (startsWithQuery ? 100 : 0) + form - extra * 8 - nameWords.length;
}
