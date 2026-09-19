import { describe, expect, it } from 'vitest';
import { selectProductOffer, type ProductOffer } from '../src/products/retail.js';

const offer = (quantity: number, price: number, barcode: string): ProductOffer => ({
  barcode,
  name: `Riz ${String(quantity)} g`,
  brand: 'Test',
  imageUrl: null,
  packageQuantity: quantity,
  packageUnit: 'G',
  price,
  currency: 'EUR',
  observedAt: '2026-09-19',
  storeName: 'Test Market',
});

describe('sélection de produits achetables', () => {
  it('propose le grand format quand son prix au kilo est meilleur', () => {
    const selected = selectProductOffer({
      neededQuantity: 200,
      neededUnit: 'G',
      economical: true,
      offers: [offer(500, 1.4, 'small'), offer(2000, 3.8, 'bulk')],
    });
    expect(selected?.barcode).toBe('bulk');
    expect(selected?.purchaseQuantity).toBe(2000);
    expect(selected?.economyNote).toContain('moins cher');
  });

  it('privilégie le décaissement minimal sans mode économique', () => {
    const selected = selectProductOffer({
      neededQuantity: 200,
      neededUnit: 'G',
      economical: false,
      offers: [offer(500, 1.4, 'small'), offer(2000, 3.8, 'bulk')],
    });
    expect(selected?.barcode).toBe('small');
  });

  it('calcule plusieurs paquets pour couvrir le besoin', () => {
    const selected = selectProductOffer({
      neededQuantity: 1200,
      neededUnit: 'G',
      economical: false,
      offers: [offer(500, 1.4, 'small')],
    });
    expect(selected?.packageCount).toBe(3);
    expect(selected?.purchaseQuantity).toBe(1500);
    expect(selected?.totalPrice).toBe(4.2);
  });

  it('refuse de mélanger masse et volume', () => {
    const selected = selectProductOffer({
      neededQuantity: 500,
      neededUnit: 'ML',
      economical: true,
      offers: [offer(500, 1.4, 'mass')],
    });
    expect(selected).toBeNull();
  });
});
