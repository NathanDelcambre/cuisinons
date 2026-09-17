import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), '../api');

describe('point d’entrée serverless Vercel', () => {
  // Vercel crée une fonction par fichier de ce dossier. Un second fichier casserait
  // la prod : chaque fonction est bundlée à part, donc un import relatif entre elles
  // n’est plus résolvable au runtime. Les helpers vont dans src/.
  it('ne contient que index.ts', () => {
    expect(readdirSync(apiDir)).toEqual(['index.ts']);
  });
});
