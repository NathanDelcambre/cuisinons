import './load-env';
import { prisma } from './client';
import { refreshMissingNutritionSnapshots, refreshRecipeNutritionSnapshot } from './recipe-nutrition';

async function main() {
  const catalog = await prisma.recipe.findMany({
    where: { source: 'CATALOG' },
    select: { id: true },
  });
  for (const row of catalog) {
    await refreshRecipeNutritionSnapshot(prisma, row.id);
  }
  const extra = await refreshMissingNutritionSnapshots(prisma);
  console.log(`Macros dénormalisées : ${String(catalog.length)} catalogue, ${String(extra)} autres.`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
