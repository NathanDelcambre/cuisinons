import { describe, expect, it } from 'vitest';
import { recipeDietSlugsForQuery } from '../src/search/recipe-query.js';

describe('recipeDietSlugsForQuery', () => {
  it('reconnaît végé / végétarien sans accents', () => {
    expect(recipeDietSlugsForQuery('Végé')).toEqual(['vegetarien', 'vegan']);
    expect(recipeDietSlugsForQuery('végétarien')).toEqual(['vegetarien', 'vegan']);
    expect(recipeDietSlugsForQuery('Vegetarienne')).toEqual(['vegetarien', 'vegan']);
  });

  it('reconnaît vegan sans élargir au végétarien', () => {
    expect(recipeDietSlugsForQuery('vegan')).toEqual(['vegan']);
    expect(recipeDietSlugsForQuery('végane')).toEqual(['vegan']);
  });

  it('ignore les requêtes trop courtes ou hors régime', () => {
    expect(recipeDietSlugsForQuery('ve')).toEqual([]);
    expect(recipeDietSlugsForQuery('poulet')).toEqual([]);
  });
});
