/**
 * Les noms Ciqual sont des etiquettes de laboratoire : « Poulet, filet, cru ».
 * Telles quelles, elles donneraient « Poelee de Poulet, filet, cru ». Ce module
 * les ramene a un mot de cuisine et assemble des titres grammaticalement surs.
 */

/**
 * Mentions d'etat de l'aliment, sans interet dans un nom de plat. On ne retire
 * que celles-la : « entier » (lait), « fraiche » (creme) ou « complet » (riz)
 * distinguent de vrais produits et doivent rester.
 */
const STATE_WORDS = new Set([
  'cru',
  'crue',
  'crus',
  'crues',
  'cuit',
  'cuite',
  'cuits',
  'cuites',
  'nature',
  'surgele',
  'surgelee',
  'surgeles',
  'surgelees',
  'appertise',
  'appertisee',
  'preemballe',
  'preemballee',
  'precise',
  'precisee',
  'non',
  'sechee',
  'seche',
  'deshydrate',
  'deshydratee',
]);

/** Compare sans accent ni casse, pour que « surgelé » entre dans la liste. */
export function foldText(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae');
}

/**
 * Nom utilisable dans une phrase : minuscules, sans precision de laboratoire.
 * « Poulet, filet, cru » devient « poulet », « Creme fraiche epaisse 30% MG »
 * devient « creme fraiche epaisse ».
 */
export function culinaryName(nameFr: string): string {
  // Tout ce qui suit la premiere virgule est une precision de decoupe ou d'etat.
  const head = nameFr.split(',')[0] ?? nameFr;
  const cleaned = head
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\d+([.,]\d+)?\s*%/g, ' ')
    .replace(/\bMG\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ');
  while (words.length > 1) {
    const last = words[words.length - 1];
    if (last === undefined || !STATE_WORDS.has(foldText(last))) break;
    words.pop();
  }
  return words.join(' ').toLowerCase();
}

/**
 * Libellé de cuisine : « Abricot, dénoyauté, cru » → « Abricot ».
 * On garde seulement les précisions qui changent vraiment le produit (sec, au sirop).
 */
export function kitchenLabel(nameFr: string): string {
  const stripped = nameFr.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const base = culinaryName(stripped)
    .replace(/\bau sirop(?: léger| leger| classique)?\b/gi, 'au sirop')
    .replace(/\s+/g, ' ')
    .trim();
  const folded = foldText(stripped);
  const baseFolded = foldText(base);
  const extras: string[] = [];
  if (/(^| )(sec|secs|seche|sechee|seches|sechees)( |$)/.test(folded) && !baseFolded.includes('sec')) {
    extras.push('sec');
  }
  if (folded.includes('au sirop') && !baseFolded.includes('sirop')) extras.push('au sirop');
  if (/\bgrille/.test(folded) && !baseFolded.includes('grille')) extras.push('grillé');
  if (/\bfume/.test(folded) && !baseFolded.includes('fume')) extras.push('fumé');
  return capitalize([base, ...extras].filter(Boolean).join(' '));
}

/** « a, b et c ». Une enumeration, pas une liste a puces. */
export function joinFrench(parts: readonly string[]): string {
  const items = parts.filter((part) => part.length > 0);
  if (items.length === 0) return '';
  if (items.length === 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1] ?? ''}`;
}

/**
 * « de » ou « d' » selon l'initiale, pour un titre de plat (« poêlée d’oignon »).
 * Dans une étape, préférer withDefiniteArticle / withDeArticle.
 */
export function complementDe(name: string): string {
  return /^[aeiouyàâéèêëîïôöûü]/i.test(name) ? `d’${name}` : `de ${name}`;
}

/** Majuscule initiale sans toucher au reste du titre. */
export function capitalize(text: string): string {
  return text.length === 0 ? text : text[0]?.toUpperCase() + text.slice(1);
}

/**
 * Genre des noms de cuisine les plus courants. Tout ce qui n’est pas listé
 * est traité comme masculin : c’est le cas par défaut, et ça évite « la poulet ».
 */
const FEMININE = new Set([
  'aile',
  'amande',
  'asperge',
  'aubergine',
  'baguette',
  'banane',
  'betterave',
  'biere',
  'blette',
  'brioche',
  'burrata',
  'caille',
  'cannelle',
  'capre',
  'carotte',
  'cerise',
  'chapelure',
  'chipolata',
  'ciboule',
  'ciboulette',
  'clementine',
  'compote',
  'confiture',
  'coriandre',
  'cote',
  'cotelette',
  'courge',
  'courgette',
  'creme',
  'crepe',
  'crevette',
  'cuisse',
  'datte',
  'dinde',
  'dorade',
  'daurade',
  'eau',
  'echalote',
  'endive',
  'epaule',
  'escalope',
  'farine',
  'fecule',
  'feta',
  'feve',
  'figue',
  'fraise',
  'framboise',
  'galette',
  'gambas',
  'gaufre',
  'gelee',
  'gousse',
  'graisse',
  'graine',
  'grenade',
  'herbe',
  'huile',
  'huitre',
  'lasagne',
  'laitue',
  'langouste',
  'langoustine',
  'lentille',
  'levure',
  'limonade',
  'lotte',
  'mache',
  'mandarine',
  'mangue',
  'mayonnaise',
  'menthe',
  'morue',
  'moule',
  'mousse',
  'moutarde',
  'mozzarella',
  'mure',
  'muscade',
  'myrtille',
  'nectarine',
  'noisette',
  'noix',
  'nouille',
  'oie',
  'olive',
  'orange',
  'oseille',
  'palourde',
  'papaye',
  'pasteque',
  'patate',
  'pates',
  'peche',
  'pintade',
  'pistache',
  'pizza',
  'poire',
  'poitrine',
  'polenta',
  'pomme',
  'poudre',
  'prune',
  'quiche',
  'raie',
  'rhubarbe',
  'ricotta',
  'roquette',
  'salade',
  'sardine',
  'sauce',
  'sauge',
  'seiche',
  'semoule',
  'sole',
  'soupe',
  'tagliatelle',
  'tapenade',
  'tarte',
  'tomate',
  'tomme',
  'tome',
  'tourte',
  'tranche',
  'truite',
  'vanille',
  'viande',
  'vinaigrette',
]);

/** Formes toujours au pluriel dans une recette, même sans -s visible. */
const ALWAYS_PLURAL = new Set([
  'capres',
  'chipolatas',
  'crevettes',
  'epinards',
  'flocons',
  'fusilli',
  'gambas',
  'graines',
  'haricots',
  'herbes',
  'huitres',
  'lardons',
  'lasagnes',
  'lentilles',
  'macaroni',
  'moules',
  'nouilles',
  'olives',
  'pates',
  'penne',
  'pois',
  'spaghetti',
  'spaghettis',
  'tagliatelles',
]);

/** Faux pluriels : le mot finit par s/x mais se compte au singulier. */
const INVARIABLE_S = new Set([
  'ananas',
  'brebis',
  'cassis',
  'couscous',
  'houmous',
  'hummus',
  'mais',
  'os',
  'radis',
  'riz',
  'souris',
]);

/** h aspiré : pas d’élision (« le haricot », pas « l’haricot »). */
const H_ASPIRE = new Set([
  'hachis',
  'haddock',
  'halloumi',
  'hamburger',
  'haricot',
  'homard',
  'houblon',
  'hot',
]);

const LEADING_ADJECTIVES = new Set([
  'bon',
  'bonne',
  'bonnes',
  'bons',
  'gros',
  'grosse',
  'grosses',
  'jeune',
  'jeunes',
  'nouveau',
  'nouvelle',
  'nouvelles',
  'petit',
  'petite',
  'petites',
  'petits',
  'vieille',
  'vieilles',
  'vieux',
]);

const PLURAL_ADJECTIVES = new Set([
  'bonnes',
  'bons',
  'grosses',
  'jeunes',
  'nouvelles',
  'petites',
  'petits',
  'vieilles',
]);

const EXISTING_ARTICLE = /^(les|le|la|un|une|du|des|au|aux)\s+/i;
const EXISTING_ELISION = /^l['’]/i;

function nameTokens(name: string): string[] {
  return name
    .replace(/[’']/g, "'")
    .split(/[\s,/;]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0 && !/^(d'|de|du|des|au|aux)$/i.test(word));
}

function lemmaOf(folded: string): string {
  if (ALWAYS_PLURAL.has(folded) || INVARIABLE_S.has(folded)) return folded;
  if (folded.endsWith('s') || folded.endsWith('x')) return folded.slice(0, -1);
  return folded;
}

function headInfo(name: string): { folded: string; lemma: string; plural: boolean } {
  const words = nameTokens(name);
  let index = 0;
  let pluralFromAdj = false;
  while (index < words.length && LEADING_ADJECTIVES.has(foldText(words[index] ?? ''))) {
    if (PLURAL_ADJECTIVES.has(foldText(words[index] ?? ''))) pluralFromAdj = true;
    index += 1;
  }
  const head = words[index] ?? words[0] ?? name;
  const folded = foldText(head);
  const lemma = lemmaOf(folded);
  const plural =
    pluralFromAdj ||
    ALWAYS_PLURAL.has(folded) ||
    ALWAYS_PLURAL.has(lemma) ||
    (!(INVARIABLE_S.has(folded) || INVARIABLE_S.has(lemma)) &&
      (folded.endsWith('s') || folded.endsWith('x')));
  return { folded, lemma, plural };
}

function isFeminine(lemma: string, folded: string): boolean {
  if (folded === 'pate' || lemma === 'pate') return false;
  return FEMININE.has(lemma) || FEMININE.has(folded);
}

function startsWithVowelSound(folded: string, lemma: string): boolean {
  if (folded.startsWith('y')) return false;
  if (folded.startsWith('h')) return !H_ASPIRE.has(lemma) && !H_ASPIRE.has(folded);
  return /^[aeiou]/.test(folded);
}

function stripArticle(name: string): string {
  return name.replace(EXISTING_ARTICLE, '').replace(EXISTING_ELISION, '').trim();
}

/** Minuscule initiale, pour coller dans une phrase. */
export function nounForSentence(name: string): string {
  const stripped = stripArticle(name.trim());
  if (stripped.length === 0) return name;
  return stripped.charAt(0).toLowerCase() + stripped.slice(1);
}

/**
 * « le poulet », « la courgette », « l’oignon », « les pâtes ».
 * Accepte un libellé de cuisine (« Oignon ») ou un nom déjà raccourci.
 */
export function withDefiniteArticle(name: string): string {
  const noun = nounForSentence(name);
  if (!noun) return name;
  const { folded, lemma, plural } = headInfo(noun);
  if (plural) return `les ${noun}`;
  if (startsWithVowelSound(folded, lemma)) return `l’${noun}`;
  return isFeminine(lemma, folded) ? `la ${noun}` : `le ${noun}`;
}

/** « du poulet », « de la courgette », « de l’huile », « des pâtes ». */
export function withDeArticle(name: string): string {
  const noun = nounForSentence(name);
  if (!noun) return name;
  const { folded, lemma, plural } = headInfo(noun);
  if (plural) return `des ${noun}`;
  if (startsWithVowelSound(folded, lemma)) return `de l’${noun}`;
  return isFeminine(lemma, folded) ? `de la ${noun}` : `du ${noun}`;
}

const DETERMINER_BEFORE = new RegExp(
  `(?:^|[^\\p{L}])(?:le|la|les|du|des|au|aux|un|une|de\\s+la|de\\s+l['’]|l['’]|d['’])\\s*$`,
  'iu',
);

/** True si le texte avant le jeton a déjà un déterminant (« l’ », « le », « de la »…). */
export function hasArticleBefore(preceding: string): boolean {
  return DETERMINER_BEFORE.test(preceding.replace(/\s+$/u, ''));
}

/**
 * Article devant un ingrédient dans une étape, sans doublon si le rédacteur
 * a déjà écrit « le » / « l’ » juste avant le jeton.
 */
export function ingredientInStep(name: string, preceding = ''): string {
  if (hasArticleBefore(preceding)) return nounForSentence(name);
  return withDefiniteArticle(name);
}
