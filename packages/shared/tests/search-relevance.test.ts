import { describe, expect, it } from 'vitest';
import { ingredientSearchScore, recipeSearchScore, searchRelevanceScore } from '../src/index.js';

describe('priorisation des recherches', () => {
  it('préfère un début de libellé à une occurrence tardive', () => {
    expect(searchRelevanceScore('poulet', 'Poulet blanc')).toBeGreaterThan(
      searchRelevanceScore('poulet', 'Bouillon goût poulet'),
    );
  });

  it('préfère le poulet courant aux variantes transformées', () => {
    expect(
      ingredientSearchScore({ query: 'poulet', nameFr: 'Poulet blanc', dedicatedIcon: true }),
    ).toBeGreaterThan(
      ingredientSearchScore({ query: 'poulet', nameFr: 'Poulet rôti en sauce' }),
    );
  });

  it('donne la priorité au titre de la recette', () => {
    expect(recipeSearchScore({ query: 'poulet', name: 'Poulet rôti aux légumes' })).toBeGreaterThan(
      recipeSearchScore({
        query: 'poulet',
        name: 'Bouillon maison',
        description: 'Préparé avec du poulet',
      }),
    );
  });
});
