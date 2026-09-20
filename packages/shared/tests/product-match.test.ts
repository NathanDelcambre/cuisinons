import { describe, expect, it } from 'vitest';
import {
  productCatalogTokens,
  productRelevance,
  productSearchQuery,
} from '../src/products/match.js';

describe('productSearchQuery', () => {
  it('garde sec et le type culinaire', () => {
    expect(productSearchQuery('Abricot, dénoyauté, sec')).toBe('Abricot sec');
    expect(productSearchQuery('Fromage de brebis au lait pasteurisé (type Feta)')).toBe('Feta');
  });
});

describe('productRelevance', () => {
  const query = productSearchQuery('Abricot, dénoyauté, sec');

  it('accepte de vrais abricots secs', () => {
    expect(productRelevance('Abricots secs', query)).toBeGreaterThan(-1);
    expect(productRelevance('Abricot morceaux moelleux', query)).toBeGreaterThan(-1);
    expect(productRelevance('Abricot bio', query)).toBeGreaterThan(-1);
  });

  it('refuse les mélanges, desserts et confitures', () => {
    expect(productRelevance('Abricot Ananas Pêche Poire', query)).toBe(-1);
    expect(productRelevance('Abricot et Yaourt', query)).toBe(-1);
    expect(productRelevance('Compote abricot', query)).toBe(-1);
    expect(productRelevance('Abricots au sirop', query)).toBe(-1);
    expect(productRelevance("Préparation d'abricots", query)).toBe(-1);
    expect(productRelevance('Clafoutis aux Abricots', query)).toBe(-1);
    expect(
      productRelevance("Préparation d'abricots", query, {
        brand: 'Les Confituriers du Vieux Chérier',
        categories: ['en:jams', 'en:fruit-jams'],
      }),
    ).toBe(-1);
  });

  it('accepte le clafoutis seulement si on le cherche', () => {
    expect(productRelevance('Clafoutis aux Abricots', 'Clafoutis aux abricots')).toBeGreaterThan(-1);
  });

  it('écarte encore un dessert au riz', () => {
    expect(productRelevance('Dessert au riz', 'riz')).toBe(-1);
    expect(productRelevance('Riz basmati', 'riz')).toBeGreaterThan(-1);
  });

  it('accepte un poivre moulu pour du poivre noir', () => {
    expect(productRelevance('Poivre moulu', 'Poivre noir')).toBeGreaterThan(-1);
    expect(productRelevance('Moulin poivre noir', 'Poivre noir')).not.toBe(-1);
    expect(productRelevance('Chips sel de mer et poivre noir', 'Poivre noir')).toBe(-1);
  });

  it('accepte les flocons d’avoine, même classés céréales petit-déj', () => {
    expect(
      productRelevance("Flocons d'avoine", "Flocons d'avoine", {
        categories: ['en:breakfast-cereals', 'en:rolled-oats', 'en:cereal-flakes'],
      }),
    ).toBeGreaterThan(-1);
    expect(
      productRelevance('Muesli Raisin Figue Abricot', 'abricot', {
        categories: ['en:mueslis', 'en:breakfast-cereals'],
      }),
    ).toBe(-1);
  });
});

describe('productCatalogTokens', () => {
  it('cherche l’aliment sans l’état', () => {
    expect(productCatalogTokens('Abricot sec')).toEqual(['abricot']);
    expect(productCatalogTokens('Feta')).toEqual(['feta']);
    expect(productCatalogTokens('Poivre noir')).toEqual(['poivre']);
  });
});
