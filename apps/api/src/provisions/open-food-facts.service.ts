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

function productQuery(ingredientName: string): string {
  const typed = ingredientName.match(/\btype\s+([^,;)]+)/i)?.[1]?.trim();
  return typed || ingredientName.split(',')[0]?.trim() || ingredientName.trim();
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
    const query = productQuery(productName);
    const queryWords = words(query)
      .filter((word) => word.length > 2)
      .slice(0, 5);
    if (queryWords.length === 0) return null;
    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        OR: queryWords.map((word) => ({ nameNormalized: { contains: word, mode: 'insensitive' } })),
      },
      select: { id: true, nameFr: true, nameNormalized: true, uxCategory: true },
      take: 250,
    });
    return (
      ingredients
        .map((ingredient) => {
          const ingredientWords = new Set(words(ingredient.nameNormalized));
          const overlap = queryWords.filter((word) => ingredientWords.has(word)).length;
          const starts = ingredient.nameNormalized.startsWith(queryWords[0] ?? '') ? 2 : 0;
          return { ingredient, score: overlap * 10 + starts };
        })
        .sort(
          (a, b) => b.score - a.score || a.ingredient.nameFr.length - b.ingredient.nameFr.length,
        )[0]?.ingredient ?? null
    );
  }
}
