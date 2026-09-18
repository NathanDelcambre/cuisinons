import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  optimizeDay,
  mealsForEater,
  computeRecipeNutrition,
  type NutritionGoals,
  type GoalMode,
  type MealSlot,
  MEAL_SLOTS,
} from '@cuisinons/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { PlannerService } from '../planner/planner.service.js';
import { addDays, parseIsoDate, startOfWeek } from '../planner/dates.js';
import { nutritionFromSnapshot } from '@cuisinons/db';

function toGoal(mode: GoalMode, value: unknown, tolerance: unknown) {
  return {
    mode,
    value: value === null || value === undefined ? null : Number(value),
    tolerance: tolerance === null || tolerance === undefined ? null : Number(tolerance),
  };
}

type WeekMode = 'fill' | 'replace';

type SnapshotItem = {
  id: string;
  date: string;
  slot: string;
  kind: string;
  recipeId: string | null;
  sortOrder: number;
  createdById: string;
  portions: Array<{
    userId: string;
    portions: number;
    consumedAt: string | null;
    skipAutoConsume: boolean;
  }>;
};

@Injectable()
export class OptimizationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PlannerService) private readonly planner: PlannerService,
  ) {}

  async prefs(userId: string) {
    return this.prisma.optimizationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async savePrefs(
    userId: string,
    data: { enabled: boolean; allowAutoAdd: boolean; minPortionMultiplier: number; maxPortionMultiplier: number },
  ) {
    return this.prisma.optimizationPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  private async goalsFor(userId: string, date: Date): Promise<NutritionGoals> {
    const override = await this.prisma.dailyNutritionGoalOverride.findUnique({
      where: { userId_date: { userId, date } },
    });
    const base = await this.prisma.nutritionGoal.findUnique({ where: { userId } });
    const src = override ?? base;
    if (!src) {
      return {
        calories: { mode: 'NONE', value: null, tolerance: null },
        protein: { mode: 'NONE', value: null, tolerance: null },
        carbs: { mode: 'NONE', value: null, tolerance: null },
        fat: { mode: 'NONE', value: null, tolerance: null },
      };
    }
    return {
      calories: toGoal(src.caloriesMode, src.caloriesValue, src.caloriesTolerance),
      protein: toGoal(src.proteinMode, src.proteinValue, src.proteinTolerance),
      carbs: toGoal(src.carbsMode, src.carbsValue, src.carbsTolerance),
      fat: toGoal(src.fatMode, src.fatValue, src.fatTolerance),
    };
  }

  private async publishedRecipes() {
    const recipes = await this.prisma.recipe.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        name: true,
        nutritionSnapshot: true,
        tags: { select: { tag: { select: { slug: true } } } },
      },
    });
    return recipes.map((recipe) => {
      const nutrition = nutritionFromSnapshot(recipe.nutritionSnapshot) ?? computeRecipeNutrition([], 1);
      return {
        id: recipe.id,
        name: recipe.name,
        tags: recipe.tags.map((t) => t.tag.slug),
        perServing: nutrition.perServing,
        nutritionComplete: nutrition.complete,
      };
    });
  }

  async preview(userId: string, dateIso: string, options?: { fillOnly?: boolean; replaceRecipes?: boolean }) {
    const date = parseIsoDate(dateIso);
    const items = await this.planner.getWeek(date);
    const dayItems = items.filter(
      (item) => item.date.toISOString().slice(0, 10) === date.toISOString().slice(0, 10),
    );
    const keep = options?.replaceRecipes
      ? dayItems.filter((item) => item.kind !== 'RECIPE')
      : dayItems;
    const mine = mealsForEater(keep, userId);
    const occupied = new Set(mine.map((i) => i.slot));
    const emptySlots = (MEAL_SLOTS as unknown as MealSlot[]).filter((slot) => !occupied.has(slot));
    const recipes = await this.publishedRecipes();
    const prefs = await this.prefs(userId);
    return optimizeDay({
      meals: mine
        .filter((item): item is typeof item & { recipeId: string; recipe: NonNullable<typeof item.recipe> } =>
          Boolean(item.recipe && item.recipeId),
        )
        .map((item) => {
          const portion = item.portions.find((p) => p.userId === userId);
          return {
            id: item.id,
            recipeId: item.recipeId,
            recipeName: item.recipe.name,
            slot: item.slot as MealSlot,
            portions: portion ? Number(portion.portions) : 0,
            perServing: item.nutrition.perServing,
            nutritionComplete: item.nutrition.complete,
          };
        }),
      emptySlots,
      recipes,
      goals: await this.goalsFor(userId, date),
      prefs: {
        minPortionMultiplier: Number(prefs.minPortionMultiplier),
        maxPortionMultiplier: Number(prefs.maxPortionMultiplier),
        allowAutoAdd: options?.replaceRecipes ? true : prefs.allowAutoAdd,
        fillOnly: options?.fillOnly ?? false,
        requireImprovement: options?.fillOnly || options?.replaceRecipes ? false : true,
      },
    });
  }

  async previewWeek(userId: string, fromIso: string, mode: WeekMode) {
    const start = startOfWeek(parseIsoDate(fromIso));
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i).toISOString().slice(0, 10));
    const perDay = [];
    for (const date of days) {
      perDay.push({
        date,
        result: await this.preview(userId, date, {
          fillOnly: mode === 'fill',
          replaceRecipes: mode === 'replace',
        }),
      });
    }
    return { mode, from: days[0], to: days[6], days: perDay };
  }

  private async snapshotWindow(userId: string, from: Date, to: Date) {
    const items = await this.prisma.mealItem.findMany({
      where: { date: { gte: from, lte: to } },
      include: { portions: true },
      orderBy: [{ date: 'asc' }, { slot: 'asc' }, { sortOrder: 'asc' }],
    });
    const payload: SnapshotItem[] = items.map((item) => ({
      id: item.id,
      date: item.date.toISOString().slice(0, 10),
      slot: item.slot,
      kind: item.kind,
      recipeId: item.recipeId,
      sortOrder: item.sortOrder,
      createdById: item.createdById,
      portions: item.portions.map((p) => ({
        userId: p.userId,
        portions: Number(p.portions),
        consumedAt: p.consumedAt ? p.consumedAt.toISOString() : null,
        skipAutoConsume: p.skipAutoConsume,
      })),
    }));
    await this.prisma.optimizationUndoSnapshot.upsert({
      where: { userId },
      update: { fromDate: from, toDate: to, payload },
      create: { userId, fromDate: from, toDate: to, payload },
    });
  }

  private async applyPreview(
    userId: string,
    dateIso: string,
    preview: Awaited<ReturnType<OptimizationService['preview']>>,
    options?: { replaceRecipes?: boolean },
  ) {
    const date = parseIsoDate(dateIso);
    await this.prisma.$transaction(async (tx) => {
      if (options?.replaceRecipes) {
        await tx.mealItem.deleteMany({ where: { date, kind: 'RECIPE' } });
      }
      for (const change of preview.portionChanges) {
        await tx.mealParticipantPortion.upsert({
          where: {
            mealItemId_userId: { mealItemId: change.mealItemId, userId },
          },
          update: { portions: change.toPortions },
          create: {
            mealItemId: change.mealItemId,
            userId,
            portions: change.toPortions,
          },
        });
        await tx.mealItem.update({
          where: { id: change.mealItemId },
          data: { version: { increment: 1 } },
        });
      }
      const users = await tx.user.findMany({ select: { id: true } });
      for (const add of preview.suggestedAdds) {
        await tx.mealItem.create({
          data: {
            date,
            slot: add.slot,
            recipeId: add.recipeId,
            createdById: userId,
            portions: {
              create: users.map((u) => ({
                userId: u.id,
                portions: u.id === userId ? add.portions : 0,
              })),
            },
          },
        });
      }
    });
  }

  async apply(userId: string, dateIso: string) {
    const date = parseIsoDate(dateIso);
    await this.snapshotWindow(userId, date, date);
    const preview = await this.preview(userId, dateIso);
    await this.applyPreview(userId, dateIso, preview);
    return preview;
  }

  async applyWeek(userId: string, fromIso: string, mode: WeekMode) {
    const start = startOfWeek(parseIsoDate(fromIso));
    const end = addDays(start, 6);
    await this.snapshotWindow(userId, start, end);
    const preview = await this.previewWeek(userId, fromIso, mode);
    for (const day of preview.days) {
      await this.applyPreview(userId, day.date, day.result, { replaceRecipes: mode === 'replace' });
    }
    return preview;
  }

  async undo(userId: string) {
    const snap = await this.prisma.optimizationUndoSnapshot.findUnique({ where: { userId } });
    if (!snap) throw new BadRequestException('Aucune proposition à annuler.');
    const payload = snap.payload as SnapshotItem[];
    await this.prisma.$transaction(async (tx) => {
      await tx.mealItem.deleteMany({
        where: { date: { gte: snap.fromDate, lte: snap.toDate } },
      });
      for (const item of payload) {
        await tx.mealItem.create({
          data: {
            id: item.id,
            date: parseIsoDate(item.date),
            slot: item.slot as MealSlot,
            kind: item.kind as 'RECIPE' | 'SKIPPED' | 'RESTAURANT' | 'IMPOSED',
            recipeId: item.recipeId,
            sortOrder: item.sortOrder,
            createdById: item.createdById,
            portions: {
              create: item.portions.map((p) => ({
                userId: p.userId,
                portions: p.portions,
                consumedAt: p.consumedAt ? new Date(p.consumedAt) : null,
                skipAutoConsume: p.skipAutoConsume,
              })),
            },
          },
        });
      }
      await tx.optimizationUndoSnapshot.delete({ where: { userId } });
    });
    return { ok: true };
  }

  async hasUndo(userId: string) {
    const snap = await this.prisma.optimizationUndoSnapshot.findUnique({
      where: { userId },
      select: { id: true },
    });
    return { available: Boolean(snap) };
  }
}
