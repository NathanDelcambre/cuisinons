import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  // Sorties de build : du code genere, que la config plat d'ESLint n'exclut plus
  // automatiquement. Sans cette ligne, `next dev` suffit a faire echouer le lint.
  { ignores: ['.next/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**'] },
  ...compat.extends('next/core-web-vitals'),
];

export default config;
