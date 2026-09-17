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

/** « a, b et c ». Une enumeration, pas une liste a puces. */
export function joinFrench(parts: readonly string[]): string {
  const items = parts.filter((part) => part.length > 0);
  if (items.length === 0) return '';
  if (items.length === 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1] ?? ''}`;
}

/**
 * « de » ou « d' » selon l'initiale. On garde volontairement ce complement sans
 * article : « de courgette » et « de poulet » sont justes quel que soit le genre,
 * alors que « du / de la » demanderait un dictionnaire de genres.
 */
export function complementDe(name: string): string {
  return /^[aeiouyàâéèêëîïôöûü]/i.test(name) ? `d’${name}` : `de ${name}`;
}

/** Majuscule initiale sans toucher au reste du titre. */
export function capitalize(text: string): string {
  return text.length === 0 ? text : text[0]?.toUpperCase() + text.slice(1);
}
