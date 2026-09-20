import { DEDICATED_KEYWORDS } from './icon-keywords.generated';

const GENERIC_SLUGS = new Set([
  'eau',
  'sel',
  'sucre',
  'lait',
  'creme',
  'huile',
  'fromage',
  'pain',
  'pates',
  'pate',
  'sauce',
  'soupe',
  'chocolat',
  'beurre',
  'oeuf',
  'salade',
  'confiture',
  'yaourt',
  'farine',
  'riz',
  'epice',
  'graines',
  'cereales-petit-dejeuner',
  'boisson-vegetale',
]);

const STATE_TAIL = new Set([
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
  'egoutte',
  'egouttee',
  'bouilli',
  'bouillie',
  'roti',
  'rotie',
  'grille',
  'grillee',
  'frit',
  'frite',
  'vapeur',
  'four',
]);

export function normalizeIconText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('œ', 'oe')
    .replaceAll('æ', 'ae')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function culinaryHead(value: string): string {
  return value.split(',')[0] ?? value;
}

function peelState(normalized: string): string {
  const words = normalized.split(' ').filter(Boolean);
  while (words.length > 1) {
    const last = words[words.length - 1];
    if (!last || !STATE_TAIL.has(last)) break;
    words.pop();
  }
  if (words.length >= 3 && words.at(-1) === 'eau' && words.at(-2) === 'l' && words.at(-3) === 'a') {
    words.splice(-3, 3);
  }
  return words.join(' ');
}

/**
 * Associe uniquement des mots ou expressions complets. Une recherche par simple
 * sous-chaîne faisait par exemple correspondre « eau » avec « peau » et
 * « roquette » avec « croquette ».
 */
export function matchDedicatedIcon(...values: Array<string | null | undefined>): string | null {
  const raw = values.filter((value): value is string => Boolean(value));
  if (raw.length === 0) return null;
  const headHay = ` ${raw.map((value) => peelState(normalizeIconText(culinaryHead(value)))).join(' ')} `;
  const fullHay = ` ${raw.map((value) => peelState(normalizeIconText(value))).join(' ')} `;

  let best: { score: number; slug: string } | null = null;
  for (const [keyword, slug] of DEDICATED_KEYWORDS) {
    const needle = normalizeIconText(keyword);
    if (!needle) continue;
    const token = ` ${needle} `;
    const inHead = headHay.includes(token);
    const inFull = !inHead && fullHay.includes(token);
    if (!inHead && !inFull) continue;
    const haystack = inHead ? headHay : fullHay;
    const index = haystack.indexOf(token);
    const atStart = index <= 1;
    const generic = GENERIC_SLUGS.has(slug);
    const zone = inHead ? (generic ? 8_000 : 20_000) : generic ? 40 : 3_000;
    const score = zone + needle.length * 4 + (atStart ? 80 : 0) - index;
    if (!best || score > best.score) best = { score, slug };
  }
  return best?.slug ?? null;
}
