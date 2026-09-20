import { kitchenLabel } from '../suggestions/names.js';
import { normalizeSearchText } from '../search/normalize.js';

const FORM_QUERY_WORDS = new Set(['sec', 'sirop', 'grille', 'fume', 'au']);

/** Formes transformées : pas un substitut de l'ingrédient brut. */
const PREPARED_FORMS = new Set([
  'arome',
  'bebe',
  'biscuit',
  'boisson',
  'cocktail',
  'compote',
  'confiture',
  'coulis',
  'creme',
  'dessert',
  'farine',
  'fromage',
  'galette',
  'gateau',
  'gelee',
  'infusion',
  'jus',
  'lait',
  'marmelade',
  'melange',
  'nectar',
  'panache',
  'prepare',
  'salade',
  'sauce',
  'smoothie',
  'soupe',
  'sirop',
  'yaourt',
  'yogourt',
  'yogurt',
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
  'morceau',
  'morceaux',
  'nature',
  'noir',
  'oreillon',
  'oreillons',
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
  'tranche',
  'tranches',
  'turquie',
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
  'reine',
]);

const DRIED = new Set(['sec', 'secs', 'seche', 'seches', 'sechee', 'sechees', 'moelleux', 'moelleuse']);
const SYRUP = new Set(['sirop']);

function tokens(value: string): string[] {
  return normalizeSearchText(value).split(' ').filter(Boolean);
}

function lemma(word: string): string {
  if (word.length <= 3) return word;
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
  return tokens(query).filter((word) => !FORM_QUERY_WORDS.has(lemma(word)));
}

function queryFruits(queryWords: readonly string[]): Set<string> {
  return new Set(queryWords.map(lemma).filter((word) => FRUITS.has(word)));
}

function isMix(nameWords: readonly string[], queryWords: readonly string[]): boolean {
  const asked = queryFruits(queryWords);
  if (asked.size === 0) return false;
  const extras = nameWords.map(lemma).filter((word) => FRUITS.has(word) && !asked.has(word));
  return extras.length > 0;
}

function hasPreparedForm(nameWords: readonly string[], queryWords: readonly string[]): boolean {
  return nameWords.some(
    (word) => PREPARED_FORMS.has(lemma(word)) && !hasLemma(queryWords, word),
  );
}

function hasComboEt(nameWords: readonly string[], queryWords: readonly string[]): boolean {
  const et = nameWords.indexOf('et');
  if (et <= 0 || et >= nameWords.length - 1) return false;
  const left = nameWords[et - 1]!;
  const right = nameWords[et + 1]!;
  if (QUALIFIERS.has(lemma(left)) || QUALIFIERS.has(lemma(right))) return false;
  return !hasLemma(queryWords, left) || !hasLemma(queryWords, right);
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
 * `-1` = à écarter (yaourt à l'abricot, mélange de fruits, dessert…).
 */
export function productRelevance(productName: string, query: string): number {
  const nameWords = tokens(productName);
  const queryWords = tokens(query);
  const required = productCatalogTokens(query);
  if (nameWords.length === 0 || required.length === 0) return -1;
  if (required.some((word) => !hasLemma(nameWords, word))) return -1;
  if (hasPreparedForm(nameWords, queryWords)) return -1;
  if (isMix(nameWords, queryWords)) return -1;
  if (hasComboEt(nameWords, queryWords)) return -1;
  const form = formPenalty(nameWords, queryWords);
  if (form === null) return -1;
  const extra = nameWords.filter(
    (word) =>
      word !== 'et' &&
      word !== 'de' &&
      word !== 'd' &&
      !hasLemma(required, word) &&
      !QUALIFIERS.has(lemma(word)),
  ).length;
  const exact = nameWords.map(lemma).join(' ') === queryWords.map(lemma).join(' ');
  const startsWithQuery = required.every((word, index) => lemma(nameWords[index] ?? '') === lemma(word));
  return (exact ? 1_000 : 0) + (startsWithQuery ? 100 : 0) + form - extra * 8 - nameWords.length;
}
