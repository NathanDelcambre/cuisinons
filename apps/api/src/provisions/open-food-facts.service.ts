import { Inject, Injectable } from '@nestjs/common';
import type { ProductOffer, Retailer } from '@cuisinons/shared';
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
}
