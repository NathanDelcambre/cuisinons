import { volumeToMilliliters, type QuantityUnit } from '../nutrition/units.js';

/** Une quantite d'un ingredient, exprimee dans une unite donnee. */
export type QuantityLine = {
  ingredientId: string;
  quantity: number;
  unit: QuantityUnit;
};

/** Unites dans lesquelles on achete des objets entiers. */
const COUNTED_UNITS: ReadonlySet<QuantityUnit> = new Set<QuantityUnit>([
  'PIECE',
  'SLICE',
  'SACHET',
  'JAR',
]);

/**
 * Ramene une quantite a l'unite de reference de sa famille : les masses en
 * grammes, les volumes en millilitres. Les unites de comptage et la pincee
 * restent telles quelles, faute de conversion universelle vers le gramme.
 */
export function canonicalQuantity(
  quantity: number,
  unit: QuantityUnit,
): { quantity: number; unit: QuantityUnit } {
  if (unit === 'G') return { quantity, unit: 'G' };
  if (unit === 'KG') return { quantity: quantity * 1000, unit: 'G' };
  const millilitres = volumeToMilliliters(quantity, unit);
  if (millilitres !== null) return { quantity: millilitres, unit: 'ML' };
  return { quantity, unit };
}

/** Coupe le bruit des flottants sans faire croire a une precision absente. */
function tidy(quantity: number, unit: QuantityUnit): number {
  if (unit === 'G' || unit === 'ML') return Math.round(quantity * 10) / 10;
  return Math.round(quantity * 100) / 100;
}

/**
 * Quantite a acheter. On arrondit au-dessus ce qui se vend a l'unite : il n'y a
 * pas d'« 1,5 œuf » dans un panier, et arrondir au plus proche ferait manquer
 * un ingredient.
 */
export function roundForPurchase(quantity: number, unit: QuantityUnit): number {
  if (COUNTED_UNITS.has(unit)) return Math.max(1, Math.ceil(quantity));
  if (unit === 'G' || unit === 'ML') return Math.max(1, Math.ceil(quantity));
  return tidy(quantity, unit);
}

/**
 * Cumule des lignes par ingredient et par unite de reference. Deux unites
 * inconvertibles d'un meme ingredient (100 g et 2 pieces) restent deux lignes :
 * les fondre imposerait une equivalence que nous n'avons pas.
 */
export function aggregateQuantities(lines: readonly QuantityLine[]): QuantityLine[] {
  const totals = new Map<string, QuantityLine>();
  for (const line of lines) {
    if (line.quantity <= 0) continue;
    const canonical = canonicalQuantity(line.quantity, line.unit);
    const key = `${line.ingredientId}|${canonical.unit}`;
    const current = totals.get(key);
    if (current) current.quantity += canonical.quantity;
    else totals.set(key, { ingredientId: line.ingredientId, ...canonical });
  }
  return [...totals.values()].map((line) => ({ ...line, quantity: tidy(line.quantity, line.unit) }));
}

/**
 * Besoins restants apres deduction du stock. Une ligne entierement couverte
 * disparait ; le stock excedentaire ne cree jamais de quantite negative.
 */
export function subtractStock(
  needed: readonly QuantityLine[],
  stock: readonly QuantityLine[],
): QuantityLine[] {
  const available = new Map<string, number>();
  for (const line of aggregateQuantities(stock)) {
    available.set(`${line.ingredientId}|${line.unit}`, line.quantity);
  }
  const remaining: QuantityLine[] = [];
  for (const line of aggregateQuantities(needed)) {
    const key = `${line.ingredientId}|${line.unit}`;
    const have = available.get(key) ?? 0;
    const missing = line.quantity - have;
    if (missing > 0) remaining.push({ ...line, quantity: tidy(missing, line.unit) });
  }
  return remaining;
}

/**
 * Besoin d'un convive pour une ligne de recette. `grams` est la quantite totale
 * de la recette quand elle est connue ; sinon on retombe sur l'unite saisie.
 */
export function portionRequirement(
  line: { ingredientId: string; quantity: number; unit: QuantityUnit; grams: number | null },
  servings: number,
  portions: number,
): QuantityLine | null {
  if (servings <= 0 || portions <= 0) return null;
  const share = portions / servings;
  if (line.grams !== null && line.grams > 0) {
    return { ingredientId: line.ingredientId, quantity: line.grams * share, unit: 'G' };
  }
  if (line.quantity <= 0) return null;
  return { ingredientId: line.ingredientId, quantity: line.quantity * share, unit: line.unit };
}
