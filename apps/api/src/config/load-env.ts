import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';

/**
 * Sur Vercel les variables sont injectées par la plateforme : aucun fichier à lire.
 * En local le point d'entrée varie (apps/api pour tsx, racine pour turbo), donc on
 * remonte l'arborescence jusqu'au premier .env trouvé.
 */
function findEnvFile(startDir: string): string | null {
  let current = startDir;
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = join(current, '.env');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

export function loadEnvFiles(): void {
  if (process.env.VERCEL) return;
  const file = findEnvFile(process.cwd());
  if (file) config({ path: file });
}
