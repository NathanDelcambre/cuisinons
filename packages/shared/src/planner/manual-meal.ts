import { kitchenLabel } from '../suggestions/names.js';

export type ManualMealNameLine = {
  nameFr: string;
  grams?: number | null;
  quantity?: number | null;
};

/**
 * Donne aux repas saisis à la main un vrai titre, construit à partir des
 * ingrédients qui représentent le plus de matière dans l'assiette.
 */
export function manualMealName(lines: readonly ManualMealNameLine[]): string {
  const ranked = lines
    .map((line, index) => ({
      ...line,
      index,
      weight: line.grams ?? line.quantity ?? 0,
    }))
    .sort((a, b) => b.weight - a.weight || a.index - b.index);

  const names: string[] = [];
  for (const line of ranked) {
    const name = kitchenLabel(line.nameFr).trim();
    if (
      !name ||
      names.some(
        (current) => current.localeCompare(name, 'fr', { sensitivity: 'base' }) === 0,
      )
    ) {
      continue;
    }
    names.push(name);
    if (names.length === 3) break;
  }
  return names.length > 0 ? names.join(' & ') : 'Ajouter manuellement';
}
