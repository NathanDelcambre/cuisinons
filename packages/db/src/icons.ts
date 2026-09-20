import { categoryIconUrl } from '@cuisinons/shared';
import { prisma } from './client';
import { DEDICATED_KEYWORDS } from './icon-keywords.generated';
import { matchDedicatedIcon } from './icon-match';

type IconAsset = {
  slug: string;
  source: 'cuisinons' | 'openmoji';
  attribution: string;
};

const CATEGORY_ICONS: Record<string, IconAsset> = {
  VEGETABLES: { slug: 'cat-legumes', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  FRUITS: { slug: 'cat-fruits', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  STARCHES: { slug: 'cat-feculents', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  CEREALS: { slug: 'cat-cereales', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  LEGUMES: { slug: 'cat-legumineuses', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  MEATS: { slug: 'cat-viandes', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  FISH: { slug: 'cat-poissons', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  SEAFOOD: { slug: 'cat-fruits-de-mer', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  CHARCUTERIE: { slug: 'cat-charcuterie', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  EGGS: { slug: 'cat-oeufs', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  CHEESES: { slug: 'cat-fromages', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  DAIRY: { slug: 'cat-laitiers', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  FATS: { slug: 'cat-matieres-grasses', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  NUTS_SEEDS: { slug: 'cat-noix', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  SPICES: { slug: 'cat-epices', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  AROMATICS: { slug: 'cat-aromates', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  SAUCES: { slug: 'cat-sauces', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  CONDIMENTS: { slug: 'cat-condiments', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  PREPARATIONS: { slug: 'cat-preparations', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  BAKERY: { slug: 'cat-boulangerie', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  PASTRY: { slug: 'cat-patisserie', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  SUGARS: { slug: 'cat-sucres', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  BEVERAGES: { slug: 'cat-boissons', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  VEGETARIAN_PRODUCTS: { slug: 'cat-vegetarien', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  PROCESSED: { slug: 'cat-transformes', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
  OTHER: { slug: 'cat-autres', source: 'cuisinons', attribution: 'Illustration originale Cuisinons' },
};

function iconUrl(slug: string): string {
  return `/ingredients/${slug}.png`;
}

export async function applyDedicatedIcons(): Promise<void> {
  const ingredients = await prisma.ingredient.findMany({
    select: { id: true, nameNormalized: true, nameFr: true, uxCategory: true, uxSubCategory: true },
  });

  for (const ingredient of ingredients) {
    const dedicated = matchDedicatedIcon(ingredient.nameNormalized, ingredient.nameFr);
    const categoryIcon = CATEGORY_ICONS[ingredient.uxCategory] ?? CATEGORY_ICONS.OTHER;
    if (!categoryIcon) continue;
    if (dedicated) {
      await prisma.ingredient.update({
        where: { id: ingredient.id },
        data: {
          iconSlug: dedicated,
          iconUrl: iconUrl(dedicated),
          iconSource: 'cuisinons',
          iconAttribution: 'Illustration originale Cuisinons',
          dedicatedIcon: true,
        },
      });
    } else {
      await prisma.ingredient.update({
        where: { id: ingredient.id },
        data: {
          iconSlug: categoryIcon.slug,
          iconUrl: categoryIconUrl(ingredient.uxCategory),
          iconSource: categoryIcon.source,
          iconAttribution: categoryIcon.attribution,
          dedicatedIcon: false,
        },
      });
    }
  }
}

export { CATEGORY_ICONS, DEDICATED_KEYWORDS };
