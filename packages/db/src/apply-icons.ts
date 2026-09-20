import './load-env';
import { prisma } from './client';
import { applyDedicatedIcons } from './icons';

async function main() {
  await applyDedicatedIcons();
  console.log('Icônes d’ingrédients mises à jour.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
