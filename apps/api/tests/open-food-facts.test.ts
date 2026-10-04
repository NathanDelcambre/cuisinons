import { describe, expect, it, vi } from 'vitest';
import {
  OpenFoodFactsService,
  pickIngredientForProduct,
} from '../src/provisions/open-food-facts.service.js';

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
    expect(findMany).toHaveBeenCalled();
    expect(JSON.stringify(findMany.mock.calls)).toContain('LECLERC');
  });

  it('retourne une liste vide pour laisser SIQual prendre le relais si le catalogue manque', async () => {
    const { service } = serviceWith([]);
    await expect(service.findOffers('riz', 'LIDL')).resolves.toEqual([]);
  });

  it('utilise le type culinaire du libellé SIQual pour retrouver la feta', async () => {
    const { service, findMany } = serviceWith([]);
    await service.findOffers('Fromage de brebis au lait pasteurisé (type Feta)', 'CARREFOUR');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ AND: [{ searchText: { startsWith: 'feta', mode: 'insensitive' } }] }],
        }),
      }),
    );
  });

  it('charge une seule fois les produits pour comparer toutes les enseignes', async () => {
    const { service, findMany } = serviceWith([
      {
        barcode: 'rice',
        name: 'Riz',
        brand: 'Test',
        imageUrl: null,
        packageQuantity: 1000,
        packageUnit: 'G',
        popularity: 100,
        prices: [
          {
            retailer: 'LECLERC',
            price: 2.5,
            currency: 'EUR',
            observedAt: new Date('2026-09-01'),
            storeName: 'E.Leclerc Test',
          },
          {
            retailer: 'LIDL',
            price: 2.2,
            currency: 'EUR',
            observedAt: new Date('2026-09-01'),
            storeName: 'Lidl Test',
          },
        ],
      },
    ]);
    const offers = await service.findOffersForAllRetailers('riz');
    expect(findMany).toHaveBeenCalled();
    expect(offers.LECLERC[0]?.price).toBe(2.5);
    expect(offers.LIDL[0]?.price).toBe(2.2);
    expect(offers.AUCHAN).toEqual([]);
  });
});

describe('pickIngredientForProduct', () => {
  const catalog = [
    { nameFr: 'Lait de grand mélange, en vrac', nameNormalized: 'lait de grand melange en vrac' },
    { nameFr: 'Brocoli, cru', nameNormalized: 'brocoli cru' },
    { nameFr: 'Brocoli, purée', nameNormalized: 'brocoli puree' },
    { nameFr: 'Chou romanesco ou brocoli à pomme, cru', nameNormalized: 'chou romanesco ou brocoli a pomme cru' },
    { nameFr: 'Laitue, crue', nameNormalized: 'laitue crue' },
    { nameFr: 'Laitue iceberg, crue', nameNormalized: 'laitue iceberg crue' },
    { nameFr: 'Concombre, chair et peau, cru', nameNormalized: 'concombre chair et peau cru' },
    { nameFr: 'Tomate sans précision, crue (aliment moyen)', nameNormalized: 'tomate sans precision crue aliment moyen' },
    { nameFr: 'Tomate cerise, crue', nameNormalized: 'tomate cerise crue' },
    { nameFr: 'Caviar de tomates', nameNormalized: 'caviar de tomates' },
    { nameFr: 'Haricot vert, cru', nameNormalized: 'haricot vert cru' },
    { nameFr: 'Haricots verts, purée', nameNormalized: 'haricots verts puree' },
    { nameFr: 'Abricot, dénoyauté, cru', nameNormalized: 'abricot denoyaute cru' },
    { nameFr: 'Abricot, dénoyauté, sec', nameNormalized: 'abricot denoyaute sec' },
    { nameFr: 'Oignon rouge, cru', nameNormalized: 'oignon rouge cru' },
    { nameFr: 'Oignon, cru', nameNormalized: 'oignon cru' },
  ];

  it('relie le vrac au singulier cru, pas au lait en vrac', () => {
    expect(pickIngredientForProduct('Brocolis en vrac', catalog)?.nameFr).toBe('Brocoli, cru');
    expect(pickIngredientForProduct('Laitues en vrac', catalog)?.nameFr).toBe('Laitue, crue');
    expect(pickIngredientForProduct('Concombres en vrac', catalog)?.nameFr).toBe(
      'Concombre, chair et peau, cru',
    );
    expect(pickIngredientForProduct('Tomates en vrac', catalog)?.nameFr).toBe(
      'Tomate sans précision, crue (aliment moyen)',
    );
    expect(pickIngredientForProduct('Haricots verts en vrac', catalog)?.nameFr).toBe('Haricot vert, cru');
    expect(pickIngredientForProduct('Abricots en vrac', catalog)?.nameFr).toBe('Abricot, dénoyauté, cru');
    expect(pickIngredientForProduct('Oignons rouges en vrac', catalog)?.nameFr).toBe('Oignon rouge, cru');
  });
});
