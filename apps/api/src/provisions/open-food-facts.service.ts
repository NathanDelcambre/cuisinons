import { Injectable, Logger } from '@nestjs/common';
import { RETAILER_LABELS, kitchenLabel, type ProductOffer, type Retailer } from '@cuisinons/shared';
import { z } from 'zod';

const OPEN_PRICES_URL = 'https://prices.openfoodfacts.org/api/v1';
const CACHE_TTL_MS = 30 * 60 * 1000;

const RETAILER_SEARCHES: Record<Retailer, readonly string[]> = {
  LECLERC: ['E.Leclerc', 'Leclerc'],
  U: ['Super U', 'Hyper U', 'U Express'],
  CARREFOUR: ['Carrefour'],
  AUCHAN: ['Auchan'],
  LIDL: ['Lidl'],
  INTERMARCHE: ['Intermarché', 'Intermarche'],
};

const locationSchema = z.object({
  id: z.number(),
  osm_name: z.string().nullable().optional(),
  osm_brand: z.string().nullable().optional(),
  osm_tag_value: z.string().nullable().optional(),
  osm_address_country_code: z.string().nullable().optional(),
});

const productSchema = z.object({
  code: z.string(),
  product_name: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  product_quantity: z.number().nullable().optional(),
  product_quantity_unit: z.string().nullable().optional(),
  brands: z.string().nullable().optional(),
  categories_tags: z.array(z.string()).nullable().optional(),
});

const priceSchema = z.object({
  product_code: z.string(),
  price: z.coerce.number(),
  currency: z.string(),
  date: z.string(),
  product: productSchema,
  location: locationSchema.nullable().optional(),
});

const pageSchema = <T extends z.ZodTypeAny>(item: T) => z.object({ items: z.array(item) });

type CacheEntry<T> = { expiresAt: number; value: T };

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

const EXCLUDED_CATEGORY_TAGS = new Set([
  'en:baby-foods',
  'en:biscuits-and-cakes',
  'en:desserts',
  'en:meals',
  'en:plant-based-drinks',
  'en:soups',
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

/** Évite qu'une recherche générique « riz » sélectionne une farine ou un dessert au riz. */
function productRelevance(product: z.infer<typeof productSchema>, query: string): number {
  const nameWords = words(product.product_name ?? '');
  const queryWords = words(query);
  if (nameWords.length === 0 || queryWords.some((word) => !nameWords.includes(word))) return -1;
  if (product.categories_tags?.some((tag) => EXCLUDED_CATEGORY_TAGS.has(tag))) return -1;
  const unwantedForm = nameWords.some(
    (word) => PRODUCT_FORM_WORDS.has(word) && !queryWords.includes(word),
  );
  if (unwantedForm) return -1;
  const exact = nameWords.join(' ') === queryWords.join(' ');
  const startsWithQuery = queryWords.every((word, index) => nameWords[index] === word);
  return (exact ? 1_000 : 0) + (startsWithQuery ? 100 : 0) - nameWords.length;
}

function packageSize(
  quantity: number | null | undefined,
  rawUnit: string | null | undefined,
): { quantity: number; unit: 'G' | 'ML' } | null {
  if (!quantity || quantity <= 0 || !rawUnit) return null;
  const unit = rawUnit.trim().toLowerCase();
  if (unit === 'g') return { quantity, unit: 'G' };
  if (unit === 'kg') return { quantity: quantity * 1000, unit: 'G' };
  if (unit === 'ml') return { quantity, unit: 'ML' };
  if (unit === 'cl') return { quantity: quantity * 10, unit: 'ML' };
  if (unit === 'l') return { quantity: quantity * 1000, unit: 'ML' };
  return null;
}

function uniqueLatestOffers(items: z.infer<typeof priceSchema>[]): ProductOffer[] {
  const byBarcode = new Map<string, ProductOffer>();
  for (const item of items.slice().sort((a, b) => b.date.localeCompare(a.date))) {
    if (byBarcode.has(item.product_code)) continue;
    const size = packageSize(item.product.product_quantity, item.product.product_quantity_unit);
    if (!size || !item.product.product_name || item.currency !== 'EUR') continue;
    byBarcode.set(item.product_code, {
      barcode: item.product_code,
      name: item.product.product_name,
      brand: item.product.brands ?? null,
      imageUrl: item.product.image_url ?? null,
      packageQuantity: size.quantity,
      packageUnit: size.unit,
      price: item.price,
      currency: item.currency,
      observedAt: item.date,
      storeName: item.location?.osm_name ?? item.location?.osm_brand ?? null,
    });
  }
  return [...byBarcode.values()];
}

@Injectable()
export class OpenFoodFactsService {
  private readonly logger = new Logger(OpenFoodFactsService.name);
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  async findOffers(ingredientName: string, retailer: Retailer): Promise<ProductOffer[]> {
    const query = kitchenLabel(ingredientName).split(',')[0]?.trim() ?? ingredientName.trim();
    if (query.length < 2) return [];
    const cacheKey = `${retailer}|${query.toLocaleLowerCase('fr')}`;
    const cached = this.getCached<ProductOffer[]>(cacheKey);
    if (cached) return cached;

    try {
      const [locationIds, productCodes] = await Promise.all([
        this.locationIds(retailer),
        this.productCodes(query),
      ]);
      if (locationIds.length === 0 || productCodes.length === 0) return [];
      const prices = await this.getPage('/prices', priceSchema, {
        product_code__in: productCodes.join(','),
        location_id__in: locationIds.join(','),
        currency: 'EUR',
        ordering: '-date',
        size: '100',
      });
      const offers = uniqueLatestOffers(prices);
      this.setCached(cacheKey, offers);
      return offers;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Open Food Facts indisponible pour ${RETAILER_LABELS[retailer]} / ${query}: ${reason}`,
      );
      return [];
    }
  }

  private async locationIds(retailer: Retailer): Promise<number[]> {
    const cacheKey = `locations|${retailer}`;
    const cached = this.getCached<number[]>(cacheKey);
    if (cached) return cached;
    const pages = await Promise.all(
      RETAILER_SEARCHES[retailer].map((name) =>
        this.getPage('/locations', locationSchema, {
          osm_name__like: name,
          price_count__gte: '1',
          ordering: '-price_count',
          size: '100',
        }),
      ),
    );
    const ids = [
      ...new Set(
        pages
          .flat()
          .filter(
            (location) =>
              location.osm_address_country_code?.toUpperCase() === 'FR' &&
              ['supermarket', 'convenience'].includes(location.osm_tag_value ?? ''),
          )
          .map((location) => location.id),
      ),
    ].slice(0, 100);
    this.setCached(cacheKey, ids);
    return ids;
  }

  private async productCodes(query: string): Promise<string[]> {
    const products = await this.getPage('/products', productSchema, {
      product_name__like: query,
      source: 'off',
      price_count__gte: '1',
      ordering: '-price_count',
      size: '100',
    });
    return products
      .map((product) => ({ product, score: productRelevance(product, query) }))
      .filter(({ score }) => score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
      .map(({ product }) => product.code);
  }

  private async getPage<T>(
    path: string,
    itemSchema: z.ZodType<T>,
    query: Record<string, string>,
  ): Promise<T[]> {
    const url = new URL(`${OPEN_PRICES_URL}${path}`);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent':
          process.env.OPEN_FOOD_FACTS_USER_AGENT ??
          'Cuisinons/0.1 (https://github.com/NathanDelcambre/cuisinons)',
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Open Prices HTTP ${String(response.status)}`);
    return pageSchema(itemSchema).parse(await response.json()).items;
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  private setCached<T>(key: string, value: T): void {
    this.cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  }
}
