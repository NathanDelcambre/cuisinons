import { Inject, Injectable } from '@nestjs/common';
import { RETAILERS, type ProductOffer, type Retailer } from '@cuisinons/shared';
import { PrismaService } from '../prisma/prisma.service.js';

const PRODUCT_FORM_WORDS = new Set([
  'bebe',
  'biscuit',
  'boisson',
  'creme',
  'dessert',
  'farine',
  'galette',
  'gateau',
  'prepare',
  'sauce',
  'soupe',
]);

function words(value: string): string[] {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('fr')
      .match(/[a-z0-9]+/g) ?? []
  );
}

function relevance(name: string, query: string): number {
  const nameWords = words(name);
  const queryWords = words(query);
  if (nameWords.length === 0 || queryWords.some((word) => !nameWords.includes(word))) return -1;
  if (nameWords.some((word) => PRODUCT_FORM_WORDS.has(word) && !queryWords.includes(word)))
    return -1;
  const exact = nameWords.join(' ') === queryWords.join(' ');
  const startsWithQuery = queryWords.every((word, index) => nameWords[index] === word);
  return (exact ? 1_000 : 0) + (startsWithQuery ? 100 : 0) - nameWords.length;
}

function productQuery(ingredientName: string): string {
  // SIQual nomme par exemple la feta « fromage de brebis ... (type feta) ».
  // Dans ce cas, le type culinaire est bien plus discriminant que le libellé
  // de laboratoire complet pour retrouver les variantes commerciales.
  const typed = ingredientName.match(/\btype\s+([^,;)]+)/i)?.[1]?.trim();
  return typed || ingredientName.split(',')[0]?.trim() || ingredientName.trim();
}

/** Catalogue local : aucun appel HTTP n'est effectue pendant une requete. */
@Injectable()
export class OpenFoodFactsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findOffers(ingredientName: string, retailer: Retailer): Promise<ProductOffer[]> {
    const query = productQuery(ingredientName);
    const queryWords = words(query);
    if (queryWords.length === 0) return [];
    const products = await this.prisma.openFoodProduct.findMany({
      where: {
        isActive: true,
        AND: queryWords.map((word) => ({ searchText: { contains: word, mode: 'insensitive' } })),
        packageQuantity: { gt: 0 },
        packageUnit: { in: ['G', 'ML'] },
        prices: { some: { retailer, currency: 'EUR', price: { gt: 0 } } },
      },
      include: { prices: { where: { retailer, currency: 'EUR' }, take: 1 } },
      orderBy: [{ isStaple: 'desc' }, { popularity: 'desc' }],
      take: 150,
    });
    return products
      .map((product) => ({
        product,
        price: product.prices[0],
        score: relevance(product.name, query),
      }))
      .filter(({ price, score }) => price !== undefined && score >= 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.product.popularity - a.product.popularity ||
          Number(a.price!.price) - Number(b.price!.price),
      )
      .map(({ product, price }) => ({
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
    const query = productQuery(ingredientName);
    const queryWords = words(query);
    if (queryWords.length === 0) return result;
    const products = await this.prisma.openFoodProduct.findMany({
      where: {
        isActive: true,
        AND: queryWords.map((word) => ({ searchText: { contains: word, mode: 'insensitive' } })),
        packageQuantity: { gt: 0 },
        packageUnit: { in: ['G', 'ML'] },
        prices: { some: { currency: 'EUR', price: { gt: 0 } } },
      },
      include: { prices: { where: { currency: 'EUR', price: { gt: 0 } } } },
      orderBy: [{ isStaple: 'desc' }, { popularity: 'desc' }],
      take: 150,
    });
    for (const retailer of RETAILERS) {
      result[retailer] = products
        .flatMap((product) => {
          const price = product.prices.find((candidate) => candidate.retailer === retailer);
          const score = relevance(product.name, query);
          return price && score >= 0 ? [{ product, price, score }] : [];
        })
        .sort(
          (a, b) =>
            b.score - a.score ||
            b.product.popularity - a.product.popularity ||
            Number(a.price.price) - Number(b.price.price),
        )
        .map(({ product, price }) => ({
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
        }));
    }
    return result;
  }

  async searchProducts(query: string) {
    const queryWords = words(query).slice(0, 6);
    if (queryWords.length === 0) return [];
    return this.prisma.openFoodProduct.findMany({
      where: {
        isActive: true,
        AND: queryWords.map((word) => ({ searchText: { contains: word, mode: 'insensitive' } })),
        packageQuantity: { gt: 0 },
        packageUnit: { in: ['G', 'ML'] },
      },
      select: {
        barcode: true,
        name: true,
        brand: true,
        imageUrl: true,
        packageQuantity: true,
        packageUnit: true,
        nutriScore: true,
      },
      orderBy: [{ isStaple: 'desc' }, { popularity: 'desc' }],
      take: 30,
    });
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
      take: 150,
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
