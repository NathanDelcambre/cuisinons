import { normalizeSearchText } from './normalize.js';
import { searchRelevanceScore } from './relevance.js';

const VEGETARIAN_NEEDLES = [
  'vege',
  'veget',
  'vegeta',
  'vegetar',
  'vegetari',
  'vegetarie',
  'vegetarien',
  'vegetarienne',
  'vegetarian',
] as const;

function isVeganToken(token: string): boolean {
  return token.startsWith('vegan') || token.startsWith('vegane') || token.startsWith('vegetal');
}

function isVegetarianToken(token: string): boolean {
  return VEGETARIAN_NEEDLES.some((needle) => needle.startsWith(token) || token.startsWith(needle));
}

function slugsForToken(token: string): string[] {
  if (token.length < 3) return [];
  if (isVeganToken(token)) return ['vegan'];
  if (isVegetarianToken(token)) return ['vegetarien', 'vegan'];
  return [];
}

/** Tags régime à inclure quand la recherche ressemble à « végé », « végétarien », « vegan ». */
export function recipeDietSlugsForQuery(q: string): string[] {
  const folded = normalizeSearchText(q);
  if (!folded) return [];
  const tokens = folded.includes(' ') ? folded.split(/\s+/) : [folded];
  const slugs = new Set<string>();
  for (const token of tokens) {
    for (const slug of slugsForToken(token)) slugs.add(slug);
  }
  return [...slugs];
}

export function recipeSearchScore(input: {
  query: string;
  name: string;
  description?: string | null;
  tags?: readonly string[];
}): number {
  const nameScore = searchRelevanceScore(input.query, input.name);
  const tagScore = Math.max(
    0,
    ...(input.tags ?? []).map((tag) => searchRelevanceScore(input.query, tag)),
  );
  const descriptionScore = input.description
    ? searchRelevanceScore(input.query, input.description)
    : 0;
  return nameScore * 10 + tagScore * 2 + descriptionScore * 0.35;
}
