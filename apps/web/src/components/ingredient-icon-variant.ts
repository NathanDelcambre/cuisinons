export type IngredientIconVariant = 'canned' | 'cooked' | 'dried' | 'frozen' | 'powder' | 'raw';

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function ingredientIconVariant(name: string | null | undefined): IngredientIconVariant | null {
  if (!name) return null;
  const value = normalize(name);
  if (/surgel|congele/.test(value)) return 'frozen';
  if (/appertis|en conserve|conserve de/.test(value)) return 'canned';
  if (/deshydrat|seche|desseche/.test(value)) return 'dried';
  if (/en poudre|moulu|moulue|farine/.test(value)) return 'powder';
  if (/cuit|cuite|bouilli|vapeur|grille|roti|rotie|poele|frit|braise/.test(value)) return 'cooked';
  if (/cru|crue/.test(value)) return 'raw';
  return null;
}
