import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MealSlot } from '@cuisinons/db';
import { addDays, startOfWeek } from './dates.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { nutritionForRecipe } from '../nutrition/recipe-nutrition.js';
import { publicRecipePhotoUrl } from '../recipes/recipe-photo.js';
import { computeRecipeNutrition, type MacroNutrients, type MealKind } from '@cuisinons/shared';

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
          omit: { photoUrl: true },
          include: {
            ingredients: { include: { ingredient: true } },
            tags: { include: { tag: true } },
            author: { select: { displayName: true } },
          },
        },
        portions: { include: { user: { select: { id: true, displayName: true } } } },
        createdBy: { select: { displayName: true } },
      },
      orderBy: [{ date: 'asc' }, { slot: 'asc' }, { sortOrder: 'asc' }],
    });
    const withPhoto = new Set(
      (
        await this.prisma.recipe.findMany({
          where: {
            id: { in: items.map((item) => item.recipeId).filter((id): id is string => Boolean(id)) },
            photoUrl: { not: null },
          },
          select: { id: true },
        })
      ).map((row) => row.id),
    );
    return items.map((item) => {
      if (!item.recipe) {
        return { ...item, recipe: null, nutrition: computeRecipeNutrition([], 1) };
      }
      const nutrition = nutritionForRecipe(
        item.recipe.ingredients,
        Number(item.recipe.servings),
        item.recipe.finalCookedWeight,
      );
      return {
        ...item,
        recipe: {
          ...item.recipe,
          photoUrl: publicRecipePhotoUrl(item.recipe.id, withPhoto.has(item.recipe.id), item.recipe.updatedAt),
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
  }) {
    return this.prisma.$transaction(async (tx) => {
      if (input.kind === 'RECIPE') {
        if (!input.recipeId) throw new BadRequestException('Choisis une recette.');
        const recipe = await tx.recipe.findUnique({ where: { id: input.recipeId } });
        if (!recipe) throw new NotFoundException('Recette introuvable.');
      } else if (input.recipeId) {
        throw new BadRequestException('Pas de recette pour ce type de repas.');
      }
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

  macrosForUser(
    items: Awaited<ReturnType<PlannerService['getWeek']>>,
    userId: string,
    date: Date,
  ): MacroNutrients {
    const day = items.filter((item) => item.date.toISOString().slice(0, 10) === date.toISOString().slice(0, 10));
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
