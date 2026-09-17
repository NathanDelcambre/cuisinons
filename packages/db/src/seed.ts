import * as argon2 from 'argon2';
import {
  DEFAULT_EQUIPMENT,
  DEFAULT_TAGS,
  displayNameForEmail,
  normalizeSearchText,
} from '@cuisinons/shared';
import './load-env';
import { prisma } from './client';
import { loadDbEnv } from './env';
import { applyDedicatedIcons } from './icons';

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

async function demoIngredient(name: string, extras: {
  energyKcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG?: number;
  category: 'MEATS' | 'CEREALS' | 'FATS' | 'VEGETABLES' | 'DAIRY' | 'EGGS' | 'FRUITS' | 'STARCHES';
  code: number;
}) {
  return prisma.ingredient.upsert({
    where: { ciqualCode: extras.code },
    update: {},
    create: {
      ciqualCode: extras.code,
      nameFr: name,
      nameNormalized: normalizeSearchText(name),
      groupName: 'Démo',
      uxCategory: extras.category,
      uxSubCategory: name,
      energyKcalKind: 'VALUE',
      energyKcal: extras.energyKcal,
      proteinKind: 'VALUE',
      proteinG: extras.proteinG,
      carbKind: 'VALUE',
      carbG: extras.carbG,
      fatKind: 'VALUE',
      fatG: extras.fatG,
      fiberKind: extras.fiberG === undefined ? 'NA' : 'VALUE',
      fiberG: extras.fiberG ?? null,
      sugarKind: 'NA',
      saltKind: 'NA',
      source: 'Ciqual',
      sourceVersion: '2025',
      sourceDate: new Date('2025-11-03'),
    },
  });
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

  const poulet = await demoIngredient('Poulet, filet, cru (démo)', {
    code: 900001,
    energyKcal: 110,
    proteinG: 23.0,
    carbG: 0,
    fatG: 1.9,
    fiberG: 0,
    category: 'MEATS',
  });
  const riz = await demoIngredient('Riz blanc cuit (démo)', {
    code: 900002,
    energyKcal: 130,
    proteinG: 2.7,
    carbG: 28,
    fatG: 0.3,
    fiberG: 0.4,
    category: 'CEREALS',
  });
  const huile = await demoIngredient("Huile d'olive vierge (démo)", {
    code: 900003,
    energyKcal: 900,
    proteinG: 0,
    carbG: 0,
    fatG: 100,
    fiberG: 0,
    category: 'FATS',
  });
  const oignon = await demoIngredient('Oignon cru (démo)', {
    code: 900004,
    energyKcal: 39,
    proteinG: 1.1,
    carbG: 7.3,
    fatG: 0.1,
    fiberG: 1.7,
    category: 'VEGETABLES',
  });
  const creme = await demoIngredient('Crème fraîche épaisse 30% MG (démo)', {
    code: 900005,
    energyKcal: 292,
    proteinG: 2.2,
    carbG: 3.1,
    fatG: 30,
    fiberG: 0,
    category: 'DAIRY',
  });
  const skyr = await demoIngredient('Skyr nature (démo)', {
    code: 900006,
    energyKcal: 62,
    proteinG: 11,
    carbG: 4,
    fatG: 0.2,
    fiberG: 0,
    category: 'DAIRY',
  });

  await prisma.ingredientConversion.upsert({
    where: { ingredientId_unit: { ingredientId: huile.id, unit: 'TBSP' } },
    update: { gramsPerUnit: 13.5 },
    create: {
      ingredientId: huile.id,
      unit: 'TBSP',
      gramsPerUnit: 13.5,
      source: 'densité culinaire',
      confidence: 'medium',
    },
  });
  await prisma.ingredientConversion.upsert({
    where: { ingredientId_unit: { ingredientId: oignon.id, unit: 'PIECE' } },
    update: { gramsPerUnit: 90 },
    create: {
      ingredientId: oignon.id,
      unit: 'PIECE',
      gramsPerUnit: 90,
      source: 'poids moyen',
      confidence: 'medium',
    },
  });
  await prisma.ingredientConversion.upsert({
    where: { ingredientId_unit: { ingredientId: creme.id, unit: 'ML' } },
    update: { gramsPerUnit: 1 },
    create: {
      ingredientId: creme.id,
      unit: 'ML',
      gramsPerUnit: 1,
      source: 'densité ~1 g/ml',
      confidence: 'medium',
    },
  });

  const platTag = await prisma.tag.findUniqueOrThrow({ where: { slug: 'plat-principal' } });
  const proteineTag = await prisma.tag.findUniqueOrThrow({ where: { slug: 'proteine' } });
  const gouterTag = await prisma.tag.findUniqueOrThrow({ where: { slug: 'gouter' } });
  const poele = await prisma.equipment.findUniqueOrThrow({ where: { slug: 'poele' } });
  const casserole = await prisma.equipment.findUniqueOrThrow({ where: { slug: 'casserole' } });

  const curry = await prisma.recipe.upsert({
    where: { id: 'seed-poulet-curry' },
    update: {},
    create: {
      id: 'seed-poulet-curry',
      name: 'Poulet curry express',
      description: 'Poulet nappé d’une crème légère au curry, riz basmati.',
      status: 'PUBLISHED',
      authorId: nathan.id,
      servings: 2,
      prepTimeMinutes: 15,
      cookTimeMinutes: 20,
      ingredients: {
        create: [
          { ingredientId: poulet.id, quantity: 150, unit: 'G', grams: 150, sortOrder: 0, estimated: false },
          { ingredientId: riz.id, quantity: 120, unit: 'G', grams: 120, sortOrder: 1, estimated: false },
          { ingredientId: huile.id, quantity: 1, unit: 'TBSP', grams: 13.5, sortOrder: 2, estimated: true },
          { ingredientId: oignon.id, quantity: 0.5, unit: 'PIECE', grams: 45, sortOrder: 3, estimated: true, displayQuantity: '1/2' },
          { ingredientId: creme.id, quantity: 20, unit: 'CL', grams: 200, sortOrder: 4, estimated: true },
        ],
      },
      steps: {
        create: [
          { stepNumber: 1, description: 'Faire revenir l’oignon émincé dans l’huile.', durationMinutes: 4 },
          { stepNumber: 2, description: 'Ajouter le poulet, dorer, puis la crème.', durationMinutes: 12 },
          { stepNumber: 3, description: 'Servir avec le riz cuit.', durationMinutes: 2 },
        ],
      },
      tags: { create: [{ tagId: platTag.id }, { tagId: proteineTag.id }] },
      equipment: { create: [{ equipmentId: poele.id }, { equipmentId: casserole.id }] },
    },
  });

  const skyrRecipe = await prisma.recipe.upsert({
    where: { id: 'seed-skyr' },
    update: {},
    create: {
      id: 'seed-skyr',
      name: 'Skyr fruits rouges',
      description: 'Goûter protéiné ultra simple.',
      status: 'PUBLISHED',
      authorId: jade.id,
      servings: 1,
      prepTimeMinutes: 2,
      cookTimeMinutes: 0,
      ingredients: {
        create: [{ ingredientId: skyr.id, quantity: 150, unit: 'G', grams: 150, sortOrder: 0 }],
      },
      steps: {
        create: [{ stepNumber: 1, description: 'Servir frais.', durationMinutes: 1 }],
      },
      tags: { create: [{ tagId: gouterTag.id }] },
    },
  });

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

  const today = new Date();
  const wednesday = new Date(today);
  const day = wednesday.getDay();
  const offset = day === 0 ? -2 : 3 - day;
  wednesday.setDate(wednesday.getDate() + offset);

  const existingMeal = await prisma.mealItem.findFirst({
    where: { recipeId: curry.id, date: wednesday },
  });
  if (!existingMeal) {
    await prisma.mealItem.create({
      data: {
        date: wednesday,
        slot: 'DINNER',
        recipeId: curry.id,
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
  const existingSnack = await prisma.mealItem.findFirst({
    where: { recipeId: skyrRecipe.id, date: wednesday },
  });
  if (!existingSnack) {
    await prisma.mealItem.create({
      data: {
        date: wednesday,
        slot: 'SNACK',
        recipeId: skyrRecipe.id,
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

  await applyDedicatedIcons();
  console.log('Seed terminé (utilisateurs, tags, équipements, recettes démo).');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
