import { Inject, Injectable } from '@nestjs/common';
import {
  RETAILERS,
  productRelevance,
  productSearchGroups,
  productSearchQuery,
  topRelevanceBand,
  type ProductOffer,
  type Retailer,
} from '@cuisinons/shared';
import { PrismaService } from '../prisma/prisma.service.js';

function words(value: string): string[] {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('fr')
      .match(/[a-z0-9]+/g) ?? []
  );
}

/** « brocolis » et « brocoli » désignent le même aliment. Les mots courts restent tels quels. */
function lemma(word: string): string {
  if (word.length <= 4 || !word.endsWith('s') || word.endsWith('ss')) return word;
  return word.slice(0, -1);
}

/** Mots de rayon, pas de l'aliment : « en vrac » ne doit jamais lier un brocoli au lait en vrac. */
const RETAIL_NOISE = new Set(['vrac', 'bio', 'kilo', 'origine', 'france', 'francais']);

/** État ou précision Ciqual qui ne change pas l'identité de l'aliment. */
const NEUTRAL = new Set([
  'aliment',
  'appertise',
  'appertisee',
  'avec',
  'bouilli',
  'bouillie',
  'brut',
  'brute',
  'chair',
  'cru',
  'crue',
  'cuit',
  'cuite',
  'denoyaute',
  'denoyautee',
  'egoutte',
  'egouttee',
  'entier',
  'entiere',
  'fait',
  'frais',
  'fraiche',
  'maison',
  'moyen',
  'moyenne',
  'nature',
  'peau',
  'precision',
  'preemballe',
  'preemballee',
  'preleve',
  'prelevee',
  'puree',
  'roti',
  'rotie',
  'sans',
  'seche',
  'sechee',
  'surgele',
  'surgelee',
  'vapeur',
]);

const COOKED = new Set([
  'appertise',
  'appertisee',
  'bouilli',
  'bouillie',
  'cuit',
  'cuite',
  'puree',
  'roti',
  'rotie',
  'seche',
  'sechee',
  'sirop',
]);

function foodLemmas(value: string): string[] {
  const seen = new Set<string>();
  const lemmas: string[] = [];
  for (const word of words(value)) {
    if (word.length <= 2 || RETAIL_NOISE.has(word)) continue;
    const base = NEUTRAL.has(word) ? word : lemma(word);
    if (seen.has(base)) continue;
    seen.add(base);
    lemmas.push(base);
  }
  return lemmas;
}

type IngredientCandidate = { nameFr: string; nameNormalized: string };

/**
 * Choisit l'aliment SIQUAL d'un produit du rayon.
 * Le pluriel du vrac (« Brocolis ») doit retrouver le singulier (« Brocoli, cru »),
 * et un mot de rayon comme « vrac » ne compte pas comme un aliment.
 */
export function pickIngredientForProduct<T extends IngredientCandidate>(
  productName: string,
  ingredients: readonly T[],
): T | null {
  const queryLemmas = foodLemmas(productName).filter((word) => !NEUTRAL.has(word));
  const head = queryLemmas[0];
  if (!head) return null;
  const querySet = new Set(queryLemmas);
  const wantsRaw = !queryLemmas.some((word) => COOKED.has(word));
  let best: { item: T; score: number; extra: number; length: number } | null = null;
  for (const ingredient of ingredients) {
    const ingredientLemmas = foodLemmas(ingredient.nameNormalized);
    if (!ingredientLemmas.includes(head)) continue;
    const overlap = queryLemmas.filter((word) => ingredientLemmas.includes(word)).length;
    const extra = ingredientLemmas.filter(
      (word) => !querySet.has(word) && !NEUTRAL.has(word),
    ).length;
    const starts = ingredientLemmas[0] === head ? 3 : 0;
    const raw = wantsRaw && ingredientLemmas.some((word) => word === 'cru' || word === 'crue') ? 2 : 0;
    const cooked =
      wantsRaw && ingredientLemmas.some((word) => COOKED.has(word)) ? 4 : 0;
    const score = overlap * 10 + starts + raw - extra * 6 - cooked;
    if (score <= 0) continue;
    const length = ingredient.nameFr.length;
    if (
      !best ||
      score > best.score ||
      (score === best.score && extra < best.extra) ||
      (score === best.score && extra === best.extra && length < best.length)
    ) {
      best = { item: ingredient, score, extra, length };
    }
  }
  return best?.item ?? null;
}

function containsWord(word: string) {
  return { searchText: { contains: word, mode: 'insensitive' as const } };
}

/** Le nom qui commence par l'aliment d'abord, les simples mentions ensuite. */
function matchClauses(query: string) {
  const groups = productSearchGroups(query);
  if (groups.length === 0) return null;
  return {
    headed: {
      OR: groups.map((words) => ({
        AND: [
          { searchText: { startsWith: words[0], mode: 'insensitive' as const } },
          ...words.slice(1).map(containsWord),
        ],
      })),
    },
    mentioned: {
      OR: groups.map((words) => ({
        AND: [
          ...words.map(containsWord),
          { NOT: { searchText: { startsWith: words[0], mode: 'insensitive' as const } } },
        ],
      })),
    },
  };
}

/** Catalogue local : aucun appel HTTP n'est effectue pendant une requete. */
@Injectable()
export class OpenFoodFactsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async loadPool(
    query: string,
    extra: Record<string, unknown>,
    include?: Record<string, unknown>,
  ) {
    const clauses = matchClauses(query);
    if (!clauses) return [];
    const [headed, mentioned] = await Promise.all([
      this.prisma.openFoodProduct.findMany({
        where: { isActive: true, ...extra, ...clauses.headed },
        include,
        orderBy: [{ isBulk: 'desc' }, { isStaple: 'desc' }, { popularity: 'desc' }],
        take: 160,
      }),
      this.prisma.openFoodProduct.findMany({
        where: { isActive: true, ...extra, ...clauses.mentioned },
        include,
        orderBy: [{ popularity: 'desc' }],
        take: 80,
      }),
    ]);
    const seen = new Set<string>();
    return [...headed, ...mentioned].filter((product) => {
      if (seen.has(product.barcode)) return false;
      seen.add(product.barcode);
      return true;
    });
  }

  async findOffers(ingredientName: string, retailer: Retailer): Promise<ProductOffer[]> {
    const query = productSearchQuery(ingredientName);
    if (!matchClauses(query)) return [];
    const products = await this.loadPool(
      query,
      {
        packageQuantity: { gt: 0 },
        packageUnit: { in: ['G', 'ML'] },
        prices: { some: { retailer, currency: 'EUR', price: { gt: 0 } } },
      },
      { prices: { where: { retailer, currency: 'EUR' }, take: 1 } },
    );
    const scored = products
      .map((product) => ({
        product,
        price: product.prices[0],
        score: productRelevance(product.name, query, {
          categories: product.categories,
          brand: product.brand,
        }),
      }))
      .filter(({ price, score }) => price !== undefined && score !== -1)
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.product.popularity - a.product.popularity ||
          Number(a.price!.price) - Number(b.price!.price),
      );
    return topRelevanceBand(scored).map(({ product, price }) => ({
        barcode: product.barcode,
        name: product.name,
        brand: product.brand,
        imageUrl: product.imageUrl,
        packageQuantity: Number(product.packageQuantity),
        packageUnit: product.packageUnit as 'G' | 'ML',
        price: Number(price!.price),
        currency: price!.currency,
        observedAt: price!.observedAt.toISOString().slice(0, 10),
        storeName: price!.storeName,
        isBulk: product.isBulk,
      }));
  }

  /**
   * Charge les produits une seule fois puis répartit leurs prix entre les six
   * enseignes. Utilisé pour comparer les paniers sans multiplier les recherches.
   */
  async findOffersForAllRetailers(
    ingredientName: string,
  ): Promise<Record<Retailer, ProductOffer[]>> {
    const result: Record<Retailer, ProductOffer[]> = {
      LECLERC: [],
      U: [],
      CARREFOUR: [],
      AUCHAN: [],
      LIDL: [],
      INTERMARCHE: [],
    };
    const query = productSearchQuery(ingredientName);
    if (!matchClauses(query)) return result;
    const products = await this.loadPool(
      query,
      {
        packageQuantity: { gt: 0 },
        packageUnit: { in: ['G', 'ML'] },
        prices: { some: { currency: 'EUR', price: { gt: 0 } } },
      },
      { prices: { where: { currency: 'EUR', price: { gt: 0 } } } },
    );
    for (const retailer of RETAILERS) {
      const scored = products
        .flatMap((product) => {
          const price = product.prices.find((candidate) => candidate.retailer === retailer);
          const score = productRelevance(product.name, query, {
            categories: product.categories,
            brand: product.brand,
          });
          return price && score !== -1 ? [{ product, price, score }] : [];
        })
        .sort(
          (a, b) =>
            b.score - a.score ||
            b.product.popularity - a.product.popularity ||
            Number(a.price.price) - Number(b.price.price),
        );
      result[retailer] = topRelevanceBand(scored).map(({ product, price }) => ({
          barcode: product.barcode,
          name: product.name,
          brand: product.brand,
          imageUrl: product.imageUrl,
          packageQuantity: Number(product.packageQuantity),
          packageUnit: product.packageUnit as 'G' | 'ML',
          price: Number(price.price),
          currency: price.currency,
          observedAt: price.observedAt.toISOString().slice(0, 10),
          storeName: price.storeName,
          isBulk: product.isBulk,
        }));
    }
    return result;
  }

  async searchProducts(query: string) {
    if (!matchClauses(query)) return [];
    const products = await this.loadPool(query, {
      packageQuantity: { gt: 0 },
      packageUnit: { in: ['G', 'ML'] },
    });
    return products
      .map((product) => ({
        product,
        score: productRelevance(product.name, query, {
          categories: product.categories,
          brand: product.brand,
        }),
      }))
      .filter((row) => row.score !== -1)
      .sort(
        (a, b) =>
          b.score - a.score ||
          Number(b.product.isBulk) - Number(a.product.isBulk) ||
          b.product.popularity - a.product.popularity,
      )
      .slice(0, 30)
      .map(({ product }) => ({
        barcode: product.barcode,
        name: product.name,
        brand: product.brand,
        imageUrl: product.imageUrl,
        packageQuantity: product.packageQuantity,
        packageUnit: product.packageUnit,
        nutriScore: product.nutriScore,
      }));
  }

  async productByBarcode(barcode: string) {
    return this.prisma.openFoodProduct.findFirst({
      where: {
        barcode,
        isActive: true,
        packageQuantity: { gt: 0 },
        packageUnit: { in: ['G', 'ML'] },
      },
    });
  }

  /** Trouve le lien SIQUAL nécessaire à la consommation, sans en faire l'identité du stock. */
  async resolveIngredientForProduct(productName: string) {
    const lemmas = foodLemmas(productName).filter((word) => !NEUTRAL.has(word));
    const head = lemmas[0];
    if (!head) return null;
    const needles = [...new Set(lemmas.flatMap((word) => [word, `${word}s`]))].slice(0, 8);
    const select = { id: true, nameFr: true, nameNormalized: true, uxCategory: true } as const;
    const [headed, mentioned] = await Promise.all([
      this.prisma.ingredient.findMany({
        where: { nameNormalized: { startsWith: head, mode: 'insensitive' } },
        select,
        take: 80,
      }),
      this.prisma.ingredient.findMany({
        where: {
          OR: needles.map((word) => ({
            nameNormalized: { contains: word, mode: 'insensitive' as const },
          })),
        },
        select,
        take: 120,
      }),
    ]);
    const seen = new Set<string>();
    const ingredients = [...headed, ...mentioned].filter((ingredient) => {
      if (seen.has(ingredient.id)) return false;
      seen.add(ingredient.id);
      return true;
    });
    return pickIngredientForProduct(productName, ingredients);
  }
}
