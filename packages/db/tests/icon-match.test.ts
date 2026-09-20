import { describe, expect, it } from 'vitest';
import { matchDedicatedIcon, normalizeIconText } from '../src/icon-match';

describe('ingredient icon matching', () => {
  it('normalise les accents, ligatures et séparateurs', () => {
    expect(normalizeIconText("Œufs à la crème-fraîche")).toBe('oeufs a la creme fraiche');
  });

  it('associe un aliment ou une expression complète', () => {
    expect(matchDedicatedIcon('huile d olive extra vierge')).toBe('huile-olive-extra');
    expect(matchDedicatedIcon('Nuggets de poulet, cuits')).toBe('nugget');
    expect(matchDedicatedIcon('Pomme de terre, cuite')).toBe('pomme-de-terre');
  });

  it('ne confond plus une sous-chaîne avec un aliment', () => {
    expect(matchDedicatedIcon('Chapon, viande et peau rôties')).not.toBe('eau');
    expect(matchDedicatedIcon('Croquette panée de poulet')).not.toBe('roquette');
    expect(matchDedicatedIcon("Brochette d'agneau")).not.toBe('brochet');
  });
});
