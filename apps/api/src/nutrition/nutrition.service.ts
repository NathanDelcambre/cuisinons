import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  aggregateUserStats,
  avatarUrlForEmail,
  periodDayCount,
  STATS_PERIODS,
  type StatsPeriod,
  type MealSlot,
} from '@cuisinons/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { parseIsoDate, startOfWeek, addDays } from '../planner/dates.js';
import { nutritionForRecipe } from './recipe-nutrition.js';

function bounds(period: StatsPeriod, date: Date): { from: Date; to: Date } {
  if (period === 'day') return { from: date, to: date };
  if (period === 'week') {
    const from = startOfWeek(date);
    return { from, to: addDays(from, 6) };
  }
  if (period === 'month') {
    const from = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    const to = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
    return { from, to };
  }
  const from = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const to = new Date(Date.UTC(date.getUTCFullYear(), 11, 31));
  return { from, to };
}

@Injectable()
export class NutritionService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async stats(periodRaw: string | undefined, dateRaw: string | undefined) {
    const period = STATS_PERIODS.includes(periodRaw as StatsPeriod) ? (periodRaw as StatsPeriod) : 'week';
    const date = dateRaw ? parseIsoDate(dateRaw) : parseIsoDate(new Date().toISOString().slice(0, 10));
    const { from, to } = bounds(period, date);
    const todayIso = new Date().toISOString().slice(0, 10);
    const days = periodDayCount(period, from, to);

    const users = await this.prisma.user.findMany({
      select: { id: true, displayName: true, email: true },
      orderBy: { displayName: 'asc' },
    });
    const items = await this.prisma.mealItem.findMany({
      where: { date: { gte: from, lte: to } },
      include: {
        recipe: { include: { ingredients: { include: { ingredient: true } } } },
        portions: true,
      },
    });

    const meals = items.map((item) => {
      const nutrition = item.recipe
        ? nutritionForRecipe(item.recipe.ingredients, Number(item.recipe.servings), item.recipe.finalCookedWeight)
        : { perServing: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 } };
      return {
        date: item.date.toISOString(),
        slot: item.slot as MealSlot,
        recipeId: item.recipeId,
        recipeName: item.recipe?.name ?? null,
        perServing: nutrition.perServing,
        portions: item.portions.map((p) => ({
          userId: p.userId,
          portions: Number(p.portions),
          consumedAt: p.consumedAt,
          skipAutoConsume: p.skipAutoConsume,
        })),
      };
    });

    return {
      period,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      users: users.map((user) => ({
        ...aggregateUserStats({
          userId: user.id,
          displayName: user.displayName,
          meals,
          todayIso,
          days,
        }),
        avatarUrl: avatarUrlForEmail(user.email),
      })),
    };
  }

  async requireUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    return user;
  }
}
