import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MealSlot, Prisma, type QuantityUnit } from '@cuisinons/db';
import { addDays, startOfWeek } from './dates.js';
import { nutritionFromSnapshot } from '@cuisinons/db';
import { PrismaService } from '../prisma/prisma.service.js';
import { publicRecipePhotoUrl } from '../recipes/recipe-photo.js';
import {
  canonicalQuantity,
  computeRecipeNutrition,
  mealsForEater,
  type MacroNutrients,
  type MealKind,
} from '@cuisinons/shared';

@Injectable()
export class PlannerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  weekBounds(from: Date) {
    const start = startOfWeek(from);
    const end = addDays(start, 6);
    return { start, end };
  }

  async getWeek(from: Date) {
    const { start, end } = this.weekBounds(from);
    const items = await this.prisma.mealItem.findMany({
      where: { date: { gte: start, lte: end } },
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
            servings: true,
            prepTimeMinutes: true,
            cookTimeMinutes: true,
            updatedAt: true,
            nutritionSnapshot: true,
            _count: { select: { ingredients: true } },
          },
        },
        portions: { include: { user: { select: { id: true, displayName: true } } } },
        manualIngredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                nameFr: true,
                iconUrl: true,
                energyKcal: true,
                proteinG: true,
                carbG: true,
                fatG: true,
                fiberG: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        createdBy: { select: { displayName: true } },
      },
      orderBy: [{ date: 'asc' }, { slot: 'asc' }, { sortOrder: 'asc' }],
    });
    const customPhotoIds = items
      .map((item) => item.recipeId)
      .filter((id): id is string => typeof id === 'string' && !id.startsWith('official-'));
    const withPhoto = new Map(
      customPhotoIds.length === 0
        ? []
        : (
            await this.prisma.recipe.findMany({
              where: { id: { in: customPhotoIds }, photoUrl: { not: null } },
              select: { id: true, photoUrl: true },
            })
          ).map((row) => [row.id, row.photoUrl]),
    );
    return items.map((item) => {
      const manualIngredients = item.manualIngredients.map((line) => ({
        id: line.id,
        ingredientId: line.ingredientId,
        quantity: Number(line.quantity),
        unit: line.unit,
        grams: line.grams === null ? null : Number(line.grams),
        ingredient: {
          id: line.ingredient.id,
          nameFr: line.ingredient.nameFr,
          iconUrl: line.ingredient.iconUrl,
        },
      }));
      if (!item.recipe) {
        const nutrition = computeRecipeNutrition(
          item.manualIngredients.map((line) => ({
            grams: line.grams === null ? null : Number(line.grams),
            energyKcalPer100g:
              line.ingredient.energyKcal === null ? null : Number(line.ingredient.energyKcal),
            proteinPer100g:
              line.ingredient.proteinG === null ? null : Number(line.ingredient.proteinG),
            carbsPer100g: line.ingredient.carbG === null ? null : Number(line.ingredient.carbG),
            fatPer100g: line.ingredient.fatG === null ? null : Number(line.ingredient.fatG),
            fiberPer100g: line.ingredient.fiberG === null ? null : Number(line.ingredient.fiberG),
          })),
          1,
        );
        return { ...item, manualIngredients, recipe: null, nutrition };
      }
      const nutrition =
        nutritionFromSnapshot(item.recipe.nutritionSnapshot) ??
        computeRecipeNutrition([], Number(item.recipe.servings));
      return {
        ...item,
        manualIngredients,
        recipe: {
          id: item.recipe.id,
          name: item.recipe.name,
          servings: item.recipe.servings,
          prepTimeMinutes: item.recipe.prepTimeMinutes,
          cookTimeMinutes: item.recipe.cookTimeMinutes,
          updatedAt: item.recipe.updatedAt,
          ingredientCount: item.recipe._count.ingredients,
          photoUrl: publicRecipePhotoUrl(
            item.recipe.id,
            withPhoto.get(item.recipe.id) ?? null,
            item.recipe.updatedAt,
          ),
        },
        nutrition,
      };
    });
  }

  async addItem(input: {
    date: Date;
    slot: MealSlot;
    kind: MealKind;
    recipeId?: string;
    createdById: string;
    portions: Array<{ userId: string; portions: number }>;
    ingredients?: Array<{ ingredientId: string; quantity: number; unit: QuantityUnit }>;
  }) {
    return this.prisma.$transaction(async (tx) => {
      if (input.kind === 'RECIPE') {
        if (!input.recipeId) throw new BadRequestException('Choisis une recette.');
        const recipe = await tx.recipe.findUnique({ where: { id: input.recipeId } });
        if (!recipe) throw new NotFoundException('Recette introuvable.');
      } else if (input.recipeId) {
        throw new BadRequestException('Pas de recette pour ce type de repas.');
      }
      const manualIngredients =
        input.kind === 'IMPOSED'
          ? (input.ingredients ?? []).map((line, sortOrder) => {
              const canonical = canonicalQuantity(line.quantity, line.unit);
              return {
                ingredientId: line.ingredientId,
                quantity: canonical.quantity,
                unit: canonical.unit,
                grams: canonical.unit === 'G' ? canonical.quantity : null,
                sortOrder,
              };
            })
          : [];
      if (input.kind === 'IMPOSED' && manualIngredients.length === 0)
        throw new BadRequestException('Ajoute au moins un ingrédient.');
      const eaters = input.portions.filter((p) => p.portions > 0).map((p) => p.userId);
      await this.releaseSlot(tx, input.date, input.slot, eaters);
      const count = await tx.mealItem.count({
        where: { date: input.date, slot: input.slot },
      });
      return tx.mealItem.create({
        data: {
          date: input.date,
          slot: input.slot,
          kind: input.kind,
          recipeId: input.kind === 'RECIPE' ? input.recipeId : null,
          createdById: input.createdById,
          sortOrder: count,
          portions: {
            create: input.portions.map((p) => ({
              userId: p.userId,
              portions: p.portions,
            })),
          },
          manualIngredients:
            manualIngredients.length > 0 ? { create: manualIngredients } : undefined,
        },
        include: { portions: true, recipe: true },
      });
    });
  }

  async updateItem(
    id: string,
    input: {
      date?: Date;
      slot?: MealSlot;
      recipeId?: string;
      kind?: MealKind;
      version?: number;
      portions?: Array<{ userId: string; portions: number }>;
    },
  ) {
    const existing = await this.prisma.mealItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Repas introuvable.');
    if (input.version !== undefined && input.version !== existing.version) {
      throw new ConflictException('Ce créneau a été modifié ailleurs.');
    }
    if (input.recipeId) {
      const recipe = await this.prisma.recipe.findUnique({ where: { id: input.recipeId } });
      if (!recipe) throw new NotFoundException('Recette introuvable.');
    }
    const nextKind = input.kind ?? (input.recipeId ? 'RECIPE' : existing.kind);
    if (nextKind === 'RECIPE' && !(input.recipeId ?? existing.recipeId)) {
      throw new BadRequestException('Choisis une recette.');
    }
    return this.prisma.$transaction(async (tx) => {
      if (input.portions) {
        await tx.mealParticipantPortion.deleteMany({ where: { mealItemId: id } });
        await tx.mealParticipantPortion.createMany({
          data: input.portions.map((p) => ({
            mealItemId: id,
            userId: p.userId,
            portions: p.portions,
          })),
        });
      }
      const remaining = await tx.mealParticipantPortion.findMany({ where: { mealItemId: id } });
      if (remaining.length > 0 && remaining.every((p) => Number(p.portions) <= 0)) {
        await tx.mealItem.delete({ where: { id } });
        return { id, deleted: true };
      }
      if (nextKind !== 'IMPOSED') {
        await tx.mealItemIngredient.deleteMany({ where: { mealItemId: id } });
      }
      const targetDate = input.date ?? existing.date;
      const targetSlot = input.slot ?? existing.slot;
      const eaters = remaining.filter((p) => Number(p.portions) > 0).map((p) => p.userId);
      await this.releaseSlot(tx, targetDate, targetSlot, eaters, id);
      return tx.mealItem.update({
        where: { id },
        data: {
          date: input.date,
          slot: input.slot,
          kind: nextKind,
          recipeId: nextKind === 'RECIPE' ? (input.recipeId ?? existing.recipeId) : null,
          version: { increment: 1 },
        },
        include: { portions: true, recipe: true },
      });
    });
  }

  async remove(id: string) {
    await this.prisma.mealItem.delete({ where: { id } });
    return { ok: true };
  }

  async removeForUser(id: string, userId: string) {
    const item = await this.prisma.mealItem.findUnique({
      where: { id },
      include: { portions: true },
    });
    if (!item) throw new NotFoundException('Repas introuvable.');
    const others = item.portions.filter((p) => p.userId !== userId && Number(p.portions) > 0);
    if (others.length === 0) return this.remove(id);
    await this.prisma.mealParticipantPortion.upsert({
      where: { mealItemId_userId: { mealItemId: id, userId } },
      update: { portions: 0 },
      create: { mealItemId: id, userId, portions: 0 },
    });
    await this.prisma.mealItem.update({ where: { id }, data: { version: { increment: 1 } } });
    return { ok: true, scoped: 'me' };
  }

  async replaceForUser(id: string, userId: string, input: { recipeId: string; portions: number }) {
    const item = await this.prisma.mealItem.findUnique({
      where: { id },
      include: { portions: true },
    });
    if (!item) throw new NotFoundException('Repas introuvable.');
    const others = item.portions.filter((p) => p.userId !== userId && Number(p.portions) > 0);
    if (others.length === 0) {
      return this.updateItem(id, { recipeId: input.recipeId });
    }
    const recipe = await this.prisma.recipe.findUnique({ where: { id: input.recipeId } });
    if (!recipe) throw new NotFoundException('Recette introuvable.');
    return this.prisma.$transaction(async (tx) => {
      await this.releaseSlot(tx, item.date, item.slot, [userId]);
      const users = await tx.user.findMany({ select: { id: true } });
      return tx.mealItem.create({
        data: {
          date: item.date,
          slot: item.slot,
          kind: 'RECIPE',
          recipeId: input.recipeId,
          createdById: userId,
          portions: {
            create: users.map((u) => ({
              userId: u.id,
              portions: u.id === userId ? input.portions : 0,
            })),
          },
        },
        include: { portions: true, recipe: true },
      });
    });
  }

  /**
   * Un convive ne peut pas occuper deux repas du même créneau. On le retire des
   * autres lignes ; une ligne qui n'a plus personne est supprimée.
   */
  private async releaseSlot(
    tx: Prisma.TransactionClient,
    date: Date,
    slot: MealSlot,
    userIds: string[],
    exceptItemId?: string,
  ) {
    if (userIds.length === 0) return;
    const others = await tx.mealItem.findMany({
      where: {
        date,
        slot,
        ...(exceptItemId ? { id: { not: exceptItemId } } : {}),
        portions: { some: { userId: { in: userIds }, portions: { gt: 0 } } },
      },
      include: { portions: true },
    });
    for (const item of others) {
      for (const userId of userIds) {
        const portion = item.portions.find((p) => p.userId === userId);
        if (!portion || Number(portion.portions) <= 0) continue;
        await tx.mealParticipantPortion.update({
          where: { mealItemId_userId: { mealItemId: item.id, userId } },
          data: { portions: 0 },
        });
      }
      const remaining = await tx.mealParticipantPortion.findMany({
        where: { mealItemId: item.id },
      });
      if (remaining.every((p) => Number(p.portions) <= 0)) {
        await tx.mealItem.delete({ where: { id: item.id } });
      } else {
        await tx.mealItem.update({ where: { id: item.id }, data: { version: { increment: 1 } } });
      }
    }
  }

  macrosForUser(
    items: Awaited<ReturnType<PlannerService['getWeek']>>,
    userId: string,
    date: Date,
  ): MacroNutrients {
    const day = mealsForEater(items, userId).filter(
      (item) => item.date.toISOString().slice(0, 10) === date.toISOString().slice(0, 10),
    );
    const acc: MacroNutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    let fiberOk = true;
    for (const item of day) {
      const portion = item.portions.find((p) => p.userId === userId);
      const qty = portion ? Number(portion.portions) : 0;
      acc.kcal += item.nutrition.perServing.kcal * qty;
      acc.protein += item.nutrition.perServing.protein * qty;
      acc.carbs += item.nutrition.perServing.carbs * qty;
      acc.fat += item.nutrition.perServing.fat * qty;
      if (item.nutrition.perServing.fiber === null) fiberOk = false;
      else acc.fiber = (acc.fiber ?? 0) + item.nutrition.perServing.fiber * qty;
    }
    if (!fiberOk) acc.fiber = null;
    return acc;
  }
}
