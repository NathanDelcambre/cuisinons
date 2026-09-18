import * as argon2 from 'argon2';
import {
  DEFAULT_EQUIPMENT,
  DEFAULT_TAGS,
  displayNameForEmail,
} from '@cuisinons/shared';
import './load-env';
import { prisma } from './client';
import { loadDbEnv } from './env';
import { applyDedicatedIcons } from './icons';
import { reclassifyIngredients } from './reclassify-ingredients';
import { seedOfficialRecipes } from './seed-official-recipes';

async function hashPassword(password: string, pepper: string): Promise<string> {
  return argon2.hash(`${password}${pepper}`, { type: argon2.argon2id });
}

async function ensureUsers(pepper: string) {
  const seedNathan = process.env.SEED_NATHAN_PASSWORD;
  const seedJade = process.env.SEED_JADE_PASSWORD;
  const users = [
    { email: 'nathan.delcambre@gmail.com', password: seedNathan },
    { email: 'jade.peroch@gmail.com', password: seedJade },
  ];
  const created = [];
  for (const user of users) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (existing) {
      created.push(existing);
      continue;
    }
    if (!user.password) {
      created.push(
        await prisma.user.create({
          data: { email: user.email, displayName: displayNameForEmail(user.email) },
        }),
      );
      continue;
    }
    created.push(
      await prisma.user.create({
        data: {
          email: user.email,
          displayName: displayNameForEmail(user.email),
          passwordHash: await hashPassword(user.password, pepper),
        },
      }),
    );
  }
  return created;
}

async function main() {
  const env = loadDbEnv();
  const [nathan, jade] = await ensureUsers(env.PASSWORD_PEPPER);
  if (!nathan || !jade) {
    throw new Error('Seed utilisateurs incomplet.');
  }

  for (const tag of DEFAULT_TAGS) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { label: tag.label },
      create: { slug: tag.slug, label: tag.label },
    });
  }
  for (const item of DEFAULT_EQUIPMENT) {
    await prisma.equipment.upsert({
      where: { slug: item.slug },
      update: { label: item.label },
      create: { slug: item.slug, label: item.label, iconSlug: item.slug },
    });
  }

  await prisma.nutritionGoal.upsert({
    where: { userId: nathan.id },
    update: {},
    create: {
      userId: nathan.id,
      caloriesMode: 'AT_MOST',
      caloriesValue: 2300,
      proteinMode: 'AT_LEAST',
      proteinValue: 140,
      carbsMode: 'TARGET',
      carbsValue: 230,
      carbsTolerance: 20,
      fatMode: 'AT_MOST',
      fatValue: 70,
    },
  });
  await prisma.nutritionGoal.upsert({
    where: { userId: jade.id },
    update: {},
    create: {
      userId: jade.id,
      caloriesMode: 'AT_MOST',
      caloriesValue: 2000,
      proteinMode: 'AT_LEAST',
      proteinValue: 110,
      carbsMode: 'TARGET',
      carbsValue: 200,
      carbsTolerance: 20,
      fatMode: 'AT_MOST',
      fatValue: 65,
    },
  });

  await seedOfficialRecipes(jade.id);

  await prisma.mealItem.deleteMany({ where: { recipeId: { in: ['seed-poulet-curry', 'seed-skyr'] } } });
  await prisma.recipe.deleteMany({ where: { id: { in: ['seed-poulet-curry', 'seed-skyr'] } } });
  const demoCodes = [900001, 900002, 900003, 900004, 900005, 900006];
  await prisma.pantryItem.deleteMany({ where: { ingredient: { ciqualCode: { in: demoCodes } } } });
  await prisma.shoppingListItem.deleteMany({ where: { ingredient: { ciqualCode: { in: demoCodes } } } });
  await prisma.userIngredientFavorite.deleteMany({ where: { ingredient: { ciqualCode: { in: demoCodes } } } });
  await prisma.userIngredientRecent.deleteMany({ where: { ingredient: { ciqualCode: { in: demoCodes } } } });
  await prisma.ingredientConversion.deleteMany({ where: { ingredient: { ciqualCode: { in: demoCodes } } } });
  await prisma.ingredient.deleteMany({ where: { ciqualCode: { in: demoCodes } } });

  const today = new Date();
  const wednesday = new Date(today);
  const day = wednesday.getDay();
  const offset = day === 0 ? -2 : 3 - day;
  wednesday.setDate(wednesday.getDate() + offset);

  const dinner = await prisma.recipe.findFirst({
    where: { source: 'CATALOG', status: 'PUBLISHED', tags: { some: { tag: { slug: 'plat-principal' } } } },
    orderBy: { name: 'asc' },
  });
  const snack = await prisma.recipe.findFirst({
    where: { source: 'CATALOG', status: 'PUBLISHED', tags: { some: { tag: { slug: 'gouter' } } } },
    orderBy: { name: 'asc' },
  });

  if (dinner) {
    const existingMeal = await prisma.mealItem.findFirst({
      where: { recipeId: dinner.id, date: wednesday },
    });
    if (!existingMeal) {
      await prisma.mealItem.create({
        data: {
          date: wednesday,
          slot: 'DINNER',
          recipeId: dinner.id,
          createdById: nathan.id,
          portions: {
            create: [
              { userId: nathan.id, portions: 1.4 },
              { userId: jade.id, portions: 0.9 },
            ],
          },
        },
      });
    }
  }
  if (snack) {
    const existingSnack = await prisma.mealItem.findFirst({
      where: { recipeId: snack.id, date: wednesday },
    });
    if (!existingSnack) {
      await prisma.mealItem.create({
        data: {
          date: wednesday,
          slot: 'SNACK',
          recipeId: snack.id,
          createdById: jade.id,
          portions: {
            create: [
              { userId: nathan.id, portions: 1 },
              { userId: jade.id, portions: 1 },
            ],
          },
        },
      });
    }
  }

  await reclassifyIngredients();
  await applyDedicatedIcons();
  console.log('Seed terminé (utilisateurs, tags, équipements, recettes catalogue).');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
