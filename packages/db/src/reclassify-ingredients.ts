import { mapCiqualToUxCategory, type UxCategory } from '@cuisinons/shared';
import { prisma } from './client';

export async function reclassifyIngredients(): Promise<void> {
  const rows = await prisma.ingredient.findMany({
    select: { id: true, groupName: true, subGroupName: true, nameFr: true, uxCategory: true },
  });
  const byCategory = new Map<UxCategory, string[]>();
  for (const row of rows) {
    const category = mapCiqualToUxCategory({
      groupName: row.groupName,
      subGroupName: row.subGroupName,
      foodName: row.nameFr,
    });
    if (category === row.uxCategory) continue;
    const list = byCategory.get(category) ?? [];
    list.push(row.id);
    byCategory.set(category, list);
  }
  let changed = 0;
  for (const [uxCategory, ids] of byCategory) {
    changed += ids.length;
    const chunk = 250;
    for (let i = 0; i < ids.length; i += chunk) {
      await prisma.ingredient.updateMany({
        where: { id: { in: ids.slice(i, i + chunk) } },
        data: { uxCategory },
      });
    }
  }
  console.log(`Catégories Ciqual : ${String(changed)} aliments reclassés.`);
}
