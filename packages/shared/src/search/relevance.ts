import { normalizeSearchText } from './normalize.js';

function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[b.length] ?? Math.max(a.length, b.length);
}

function tokenScore(query: string, words: readonly string[]): number {
  if (words.includes(query)) return 140;
  if (words.some((word) => word.startsWith(query))) return 100;
  if (words.some((word) => word.includes(query))) return 65;
  if (query.length >= 4) {
    const tolerance = query.length >= 7 ? 2 : 1;
    if (words.some((word) => editDistance(query, word) <= tolerance)) return 35;
  }
  return 0;
}

/** Score pur de pertinence : l'ordre des résultats ne dépend plus de l'alphabet. */
export function searchRelevanceScore(query: string, candidate: string): number {
  const needle = normalizeSearchText(query);
  const value = normalizeSearchText(candidate);
  if (!needle || !value) return 0;

  const words = value.split(' ').filter(Boolean);
  const tokens = needle.split(' ').filter(Boolean);
  let score = 0;
  if (value === needle) score += 1_400;
  else if (value.startsWith(`${needle} `)) score += 1_100;
  else if (` ${value} `.includes(` ${needle} `)) score += 900;
  else if (value.includes(needle)) score += 700;

  const tokenScores = tokens.map((token) => tokenScore(token, words));
  score += tokenScores.reduce((sum, valueForToken) => sum + valueForToken, 0);
  if (tokenScores.length > 0 && tokenScores.every((valueForToken) => valueForToken >= 100)) {
    score += 180;
  }

  // À pertinence égale, « Poulet blanc » doit passer avant un long libellé de laboratoire.
  score -= Math.max(0, words.length - tokens.length) * 7;
  score -= Math.max(0, value.length - needle.length) * 0.15;
  return Math.max(0, score);
}
