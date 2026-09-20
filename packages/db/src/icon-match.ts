import { DEDICATED_KEYWORDS } from './icon-keywords.generated';

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

/**
 * Associe uniquement des mots ou expressions complets. Une recherche par simple
 * sous-chaîne faisait par exemple correspondre « eau » avec « peau » et
 * « roquette » avec « croquette ».
 */
export function matchDedicatedIcon(...values: Array<string | null | undefined>): string | null {
  const haystack = ` ${normalizeIconText(values.filter(Boolean).join(' '))} `;
  let best: { length: number; slug: string } | null = null;
  for (const [keyword, slug] of DEDICATED_KEYWORDS) {
    const needle = normalizeIconText(keyword);
    if (!needle) continue;
    if (!haystack.includes(` ${needle} `)) continue;
    if (!best || needle.length > best.length) {
      best = { length: needle.length, slug };
    }
  }
  return best?.slug ?? null;
}
