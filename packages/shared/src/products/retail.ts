import type { QuantityUnit } from '../nutrition/units.js';
import { normalizeSearchText } from '../search/normalize.js';

export const RETAILERS = ['LECLERC', 'U', 'CARREFOUR', 'AUCHAN', 'LIDL', 'INTERMARCHE'] as const;

export type Retailer = (typeof RETAILERS)[number];

export const RETAILER_LABELS: Record<Retailer, string> = {
  LECLERC: 'E.Leclerc',
  U: 'Magasins U',
  CARREFOUR: 'Carrefour',
  AUCHAN: 'Auchan',
  LIDL: 'Lidl',
  INTERMARCHE: 'Intermarché',
};

const RETAILER_NEEDLES: Record<Retailer, readonly string[]> = {
  LECLERC: ['leclerc'],
  U: ['magasins u', 'systeme u'],
  CARREFOUR: ['carrefour'],
  AUCHAN: ['auchan'],
  LIDL: ['lidl'],
  INTERMARCHE: ['intermarche'],
};

/** Marque lisible : « Carrefour », pas « CMI (Carrefour Marchandises Internationales), Groupe Carrefour ». */
export function compactProductBrand(brand: string | null | undefined): string | null {
  if (!brand?.trim()) return null;
  const folded = normalizeSearchText(brand);
  for (const retailer of RETAILERS) {
    if (RETAILER_NEEDLES[retailer].some((needle) => folded.includes(needle))) {
      return RETAILER_LABELS[retailer];
    }
  }
  const tokens = folded.split(' ').filter(Boolean);
  if (tokens.includes('u')) return RETAILER_LABELS.U;
  const first = brand
    .split(',')[0]
    ?.replace(/\s*\([^)]*\)\s*/g, ' ')
    .trim();
  return first || null;
}

export type ProductOffer = {
  barcode: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  packageQuantity: number;
  packageUnit: 'G' | 'ML';
  price: number;
  currency: string;
  observedAt: string;
  storeName: string | null;
  isBulk?: boolean;
};

export type ProductSelection = ProductOffer & {
  packageCount: number;
  purchaseQuantity: number;
  totalPrice: number;
  unitPrice: number;
  economyNote: string | null;
};

function unitPriceLabel(value: number, unit: 'G' | 'ML'): string {
  const amount = value * 1000;
  return `${amount.toFixed(2).replace('.', ',')} €/${unit === 'G' ? 'kg' : 'L'}`;
}

function candidate(need: number, offer: ProductOffer): ProductSelection {
  if (offer.isBulk) {
    return {
      ...offer,
      packageCount: 1,
      purchaseQuantity: need,
      totalPrice: Math.round(need * (offer.price / offer.packageQuantity) * 100) / 100,
      unitPrice: offer.price / offer.packageQuantity,
      economyNote: null,
    };
  }
  const packageCount = Math.max(1, Math.ceil(need / offer.packageQuantity));
  const purchaseQuantity = packageCount * offer.packageQuantity;
  return {
    ...offer,
    packageCount,
    purchaseQuantity,
    totalPrice: Math.round(packageCount * offer.price * 100) / 100,
    unitPrice: offer.price / offer.packageQuantity,
    economyNote: null,
  };
}

/**
 * Choisit un conditionnement réel. En mode économique, on accepte de stocker
 * jusqu'à dix fois le besoin pour privilégier le prix au kilo/litre ; c'est ce
 * qui permet par exemple de recommander 2 kg de riz pour un besoin de 200 g.
 */
export function selectProductOffer(input: {
  neededQuantity: number;
  neededUnit: QuantityUnit;
  offers: readonly ProductOffer[];
  economical: boolean;
  maxStockUpFactor?: number;
}): ProductSelection | null {
  if (input.neededQuantity <= 0 || (input.neededUnit !== 'G' && input.neededUnit !== 'ML')) {
    return null;
  }
  const compatible = input.offers
    .filter(
      (offer) =>
        offer.packageUnit === input.neededUnit &&
        offer.packageQuantity > 0 &&
        offer.price > 0 &&
        offer.currency === 'EUR',
    )
    .map((offer) => candidate(input.neededQuantity, offer));
  if (compatible.length === 0) return null;

  const baseline = compatible
    .slice()
    .sort((a, b) => a.totalPrice - b.totalPrice || a.purchaseQuantity - b.purchaseQuantity)[0]!;
  if (!input.economical) return baseline;

  const maxStockUpFactor = input.maxStockUpFactor ?? 10;
  const maxPurchase = input.neededQuantity * maxStockUpFactor;
  const economical = compatible
    .filter((offer) => offer.purchaseQuantity <= maxPurchase)
    .sort((a, b) => a.unitPrice - b.unitPrice || a.totalPrice - b.totalPrice)[0];
  if (!economical || economical.unitPrice >= baseline.unitPrice) return baseline;

  const savingPercent = Math.round((1 - economical.unitPrice / baseline.unitPrice) * 100);
  return {
    ...economical,
    economyNote: `Format économique : ${unitPriceLabel(economical.unitPrice, economical.packageUnit)}, soit ${String(savingPercent)} % moins cher à quantité égale.`,
  };
}
