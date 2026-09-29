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

const HEAD_STOP = new Set(['le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'd', 'au', 'aux', 'a', 'ou', 'et']);

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
  'pur',
  'rond',
  'rouge',
  'graine',
  'gousse',
  'pousse',
  'feuille',
  'fleur',
  'botte',
  'brin',
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

/**
 * Têtes trop larges : le second aliment change le produit
 * (« huile d'olive », « jus de citron », « beurre de cacahuète »).
 */
const GENERIC_HEADS = new Set([
  'beurre',
  'creme',
  'fromage',
  'huile',
  'jus',
  'lait',
  'levure',
  'noix',
  'pate',
  'sauce',
]);

/** Le premier mot est un contenant, l'aliment est le suivant (« graines de chia »). */
const CONTAINERS = new Set(['graine', 'gousse', 'pousse', 'feuille', 'fleur', 'botte', 'brin']);

/** « petit suisse » : le premier mot ne désigne pas l'aliment. */
const LEADING_SIZE = new Set(['petit', 'petite', 'gros', 'grosse', 'grand', 'grande']);

/**
 * Précisions de laboratoire Ciqual, inutiles pour retrouver un produit.
 * « Farine de blé tendre ou froment T45 » se cherche comme « farine ».
 */
const LAB_NOISE = new Set([
  'alimentaire',
  'allege',
  'allegee',
  'ajoute',
  'ajoutee',
  'commune',
  'cotele',
  'cotelee',
  'couche',
  'degustation',
  'environ',
  'fait',
  'fluore',
  'froment',
  'germe',
  'germee',
  'iode',
  'maison',
  'mg',
  'minimum',
  'patisserie',
  'preemballe',
  'preemballee',
  'standard',
  'tablette',
  'tendre',
]);

/** Même aliment, autre mot courant sur les fiches ou le vrac. */
const ALIASES: Record<string, readonly string[]> = {
  arachide: ['cacahuete'],
  cacahuete: ['arachide'],
  ciboule: ['ciboulette'],
  ciboulette: ['ciboule'],
  citron: ['lime'],
  lime: ['citron'],
};

/** Requête d'offre : « Abricot, dénoyauté, sec » → « Abricot sec », « type feta » → feta. */
export function productSearchQuery(ingredientName: string): string {
  const typed = culinaryType(ingredientName);
  if (typed) return typed;
  return kitchenLabel(ingredientName);
}

function isSearchNoise(word: string): boolean {
  const base = lemma(word);
  return (
    HEAD_STOP.has(word) ||
    HEAD_STOP.has(base) ||
    FORM_QUERY_WORDS.has(word) ||
    FORM_QUERY_WORDS.has(base) ||
    OPTIONAL_QUERY_WORDS.has(base) ||
    DRIED.has(word) ||
    DRIED.has(base) ||
    LAB_NOISE.has(word) ||
    LAB_NOISE.has(base) ||
    /^t\d+$/.test(word)
  );
}

function foodWords(value: string): string[] {
  return tokens(value).filter((word) => !isSearchNoise(word));
}

/**
 * Mots à chercher en base : le mot de tête, pas toute la phrase Ciqual.
 * « Tomate côtelée ou coeur de boeuf » → « tomate ».
 * Une tête générique garde le second aliment : « jus » + « citron ».
 */
export function productCatalogTokens(query: string): string[] {
  const firstAlternative = query.split(/\bou\b/i)[0] ?? query;
  const words = foodWords(firstAlternative);
  if (words.length === 0) return [];
  const head = words[0]!;
  const rest = words.slice(1).filter((word) => !QUALIFIERS.has(lemma(word)));
  if (LEADING_SIZE.has(lemma(head)) && words[1]) return [head, words[1]];
  if (CONTAINERS.has(lemma(head))) return rest[0] ? [rest[0]] : [head];
  if (GENERIC_HEADS.has(lemma(head)) && rest[0]) return [head, rest[0]];
  return [head];
}

/** Variantes du mot de tête, pour qu'une ciboulette réponde à « ciboule ». */
export function productSearchGroups(query: string): string[][] {
  const primary = productCatalogTokens(query);
  if (primary.length === 0) return [];
  const groups = [primary];
  const last = primary[primary.length - 1]!;
  for (const alias of ALIASES[lemma(last)] ?? []) groups.push([...primary.slice(0, -1), alias]);
  return groups;
}

function nameHas(nameWords: readonly string[], word: string): boolean {
  if (hasLemma(nameWords, word)) return true;
  return (ALIASES[lemma(word)] ?? []).some((alias) => hasLemma(nameWords, alias));
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
  if (nameHas(required, head) || QUALIFIERS.has(folded) || CUTS.has(folded)) return false;
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
  if (required.some((word) => !nameHas(nameWords, word))) return -1;
  if (hasPreparedForm(nameWords, queryWords)) return -1;
  if (wrongHead(nameWords, required)) return -1;
  if (isFlavoredDish(nameWords, required)) return -1;
  if (isMix(nameWords, queryWords)) return -1;
  if (hasComboEt(nameWords, queryWords)) return -1;
  const foodHead = nameWords.find(
    (word) => !HEAD_STOP.has(word) && !QUALIFIERS.has(lemma(word)) && !CUTS.has(lemma(word)),
  );
  if (
    (foodHead === undefined || !nameHas(required, foodHead)) &&
    processedCategory(context.categories, queryWords)
  )
    return -1;
  const brandWords = context.brand ? tokens(context.brand) : [];
  if (hasPreparedForm(brandWords, queryWords)) return -1;
  const form = formPenalty(nameWords, queryWords);
  if (form === null) return -1;
  const content = nameWords.filter((word) => !HEAD_STOP.has(word));
  const extra = content.filter(
    (word) => word !== 'et' && !nameHas(required, word) && !QUALIFIERS.has(lemma(word)),
  ).length;
  const exact = content.map(lemma).join(' ') === queryWords.map(lemma).join(' ');
  const startsWithQuery = required.every((word, index) => nameHas([content[index] ?? ''], word));
  return (exact ? 1_000 : 0) + (startsWithQuery ? 100 : 0) + form - extra * 8 - nameWords.length;
}
