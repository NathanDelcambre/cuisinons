import { describe, expect, it, vi } from 'vitest';
import { OpenFoodFactsService } from '../src/provisions/open-food-facts.service.js';

function serviceWith(products: unknown[]) {
  const findMany = vi.fn().mockResolvedValue(products);
  const prisma = { openFoodProduct: { findMany } };
  return { service: new OpenFoodFactsService(prisma as never), findMany };
}

describe('OpenFoodFactsService', () => {
  it('lit uniquement le catalogue local et ecarte les formes non pertinentes', async () => {
    const { service, findMany } = serviceWith([
      {
        barcode: 'raw-rice',
        name: 'Riz basmati',
        brand: 'Marque test',
        imageUrl: null,
        packageQuantity: 1000,
        packageUnit: 'G',
        popularity: 900,
        prices: [
          {
            price: 2.9,
            currency: 'EUR',
            observedAt: new Date('2026-09-01'),
            storeName: 'E.Leclerc Test',
          },
        ],
      },
      {
        barcode: 'prepared-rice',
        name: 'Dessert au riz',
        brand: null,
        imageUrl: null,
        packageQuantity: 220,
        packageUnit: 'G',
        popularity: 1_000,
        prices: [
          {
            price: 1.5,
            currency: 'EUR',
            observedAt: new Date('2026-09-02'),
            storeName: 'E.Leclerc Test',
          },
        ],
      },
    ]);
    await expect(service.findOffers('riz', 'LECLERC')).resolves.toEqual([
      expect.objectContaining({ barcode: 'raw-rice', packageQuantity: 1000, price: 2.9 }),
    ]);
    expect(findMany).toHaveBeenCalledOnce();
    expect(JSON.stringify(findMany.mock.calls)).toContain('LECLERC');
  });

  it('retourne une liste vide pour laisser SIQual prendre le relais si le catalogue manque', async () => {
    const { service } = serviceWith([]);
    await expect(service.findOffers('riz', 'LIDL')).resolves.toEqual([]);
  });
});
