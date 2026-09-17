import { Inject, Injectable } from '@nestjs/common';
import {
  optimizeDay,
  type NutritionGoals,
  type GoalMode,
  type MealSlot,
} from '@cuisinons/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { PlannerService } from '../planner/planner.service.js';
import { parseIsoDate } from '../planner/dates.js';
import { nutritionForRecipe } from '../nutrition/recipe-nutrition.js';

function toGoal(mode: GoalMode, value: unknown, tolerance: unknown) {
  return {
    mode,
    value: value === null || value === undefined ? null : Number(value),
    tolerance: tolerance === null || tolerance === undefined ? null : Number(tolerance),
  };
}

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

  async preview(userId: string, dateIso: string) {
    const date = parseIsoDate(dateIso);
    const items = await this.planner.getWeek(date);
    const dayItems = items.filter(
      (item) => item.date.toISOString().slice(0, 10) === date.toISOString().slice(0, 10),
    );
      // Restaurant, repas sauté ou imposé occupent le créneau sans entrer
      // dans le calcul nutritionnel : l'optimiseur ne les remplace pas.
      const occupied = new Set(dayItems.map((i) => i.slot));
      const emptySlots = (['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'] as MealSlot[]).filter(
        (slot) => !occupied.has(slot),
      );
    const recipes = await this.prisma.recipe.findMany({
      where: { status: 'PUBLISHED' },
      omit: { photoUrl: true },
      include: {
        ingredients: { include: { ingredient: true } },
        tags: { include: { tag: true } },
      },
    });
    const prefs = await this.prefs(userId);
    const result = optimizeDay({
      meals: dayItems
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
      recipes: recipes.map((recipe) => {
        const nutrition = nutritionForRecipe(
          recipe.ingredients,
          Number(recipe.servings),
          recipe.finalCookedWeight,
        );
        return {
          id: recipe.id,
          name: recipe.name,
          tags: recipe.tags.map((t) => t.tag.slug),
          perServing: nutrition.perServing,
          nutritionComplete: nutrition.complete,
        };
      }),
      goals: await this.goalsFor(userId, date),
      prefs: {
        minPortionMultiplier: Number(prefs.minPortionMultiplier),
        maxPortionMultiplier: Number(prefs.maxPortionMultiplier),
        allowAutoAdd: prefs.allowAutoAdd,
      },
    });
    return result;
  }

  async apply(userId: string, dateIso: string) {
    const preview = await this.preview(userId, dateIso);
    const date = parseIsoDate(dateIso);
    await this.prisma.$transaction(async (tx) => {
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
      for (const add of preview.suggestedAdds) {
        const users = await tx.user.findMany({ select: { id: true } });
        await tx.mealItem.create({
          data: {
            date,
            slot: add.slot,
            recipeId: add.recipeId,
            createdById: userId,
            portions: {
              create: users.map((u) => ({
                userId: u.id,
                portions: u.id === userId ? add.portions : 1,
              })),
            },
          },
        });
      }
    });
    return preview;
  }
}
