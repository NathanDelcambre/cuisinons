import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenFoodFactsService } from '../src/provisions/open-food-facts.service.js';

function json(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('OpenFoodFactsService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('cherche les produits OFF et ignore les lieux qui ne sont pas des supermarchés français', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.endsWith('/locations')) {
        return json({
          items: [
            {
              id: 10,
              osm_name: 'E.Leclerc Test',
              osm_tag_value: 'supermarket',
              osm_address_country_code: 'FR',
            },
            {
              id: 99,
              osm_name: 'Pharmacie Leclerc',
              osm_tag_value: 'chemist',
              osm_address_country_code: 'FR',
            },
          ],
        });
      }
      if (url.pathname.endsWith('/products')) {
        expect(url.searchParams.get('source')).toBe('off');
        return json({
          items: [
            {
              code: 'raw-rice',
              product_name: 'Riz basmati',
              product_quantity: 1000,
              product_quantity_unit: 'g',
              categories_tags: ['en:rices'],
            },
            {
              code: 'prepared-rice',
              product_name: 'Riz à la méditerranéenne',
              product_quantity: 220,
              product_quantity_unit: 'g',
              categories_tags: ['en:meals'],
            },
          ],
        });
      }
      expect(url.searchParams.get('location_id__in')).toBe('10');
      expect(url.searchParams.get('product_code__in')).toBe('raw-rice');
      return json({
        items: [
          {
            product_code: 'raw-rice',
            price: 2.9,
            currency: 'EUR',
            date: '2026-09-01',
            product: {
              code: 'raw-rice',
              product_name: 'Riz basmati',
              product_quantity: 1000,
              product_quantity_unit: 'g',
              brands: 'Marque test',
            },
            location: { id: 10, osm_name: 'E.Leclerc Test' },
          },
        ],
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const offers = await new OpenFoodFactsService().findOffers('riz', 'LECLERC');

    expect(offers).toEqual([
      expect.objectContaining({
        barcode: 'raw-rice',
        packageQuantity: 1000,
        packageUnit: 'G',
        price: 2.9,
        storeName: 'E.Leclerc Test',
      }),
    ]);
  });

  it('retourne une liste vide pour laisser SIQual prendre le relais si Open Prices échoue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('indisponible')));
    await expect(new OpenFoodFactsService().findOffers('riz', 'LIDL')).resolves.toEqual([]);
  });
});
