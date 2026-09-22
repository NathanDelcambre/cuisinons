import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  aggregateUserStats,
  avatarUrlForEmail,
  manualMealName,
  periodDayCount,
  resolveGrams,
  STATS_PERIODS,
  type StatsPeriod,
  type MealSlot,
} from '@cuisinons/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { parseIsoDate, startOfWeek, addDays } from '../planner/dates.js';
import { nutritionFromSnapshot } from '@cuisinons/db';
import { computeRecipeNutrition } from '@cuisinons/shared';

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
    const period = STATS_PERIODS.includes(periodRaw as StatsPeriod)
      ? (periodRaw as StatsPeriod)
      : 'week';
    const date = dateRaw
      ? parseIsoDate(dateRaw)
      : parseIsoDate(new Date().toISOString().slice(0, 10));
    const { from, to } = bounds(period, date);
    const todayIso = new Date().toISOString().slice(0, 10);
    const days = periodDayCount(period, from, to);

    const users = await this.prisma.user.findMany({
      select: { id: true, displayName: true, email: true },
      orderBy: { displayName: 'asc' },
    });
    const items = await this.prisma.mealItem.findMany({
      where: { date: { gte: from, lte: to } },
      select: {
        date: true,
        slot: true,
        recipeId: true,
        recipe: { select: { name: true, servings: true, nutritionSnapshot: true } },
        manualIngredients: {
          select: {
            quantity: true,
            unit: true,
            grams: true,
            ingredient: {
              select: {
                nameFr: true,
                energyKcal: true,
                proteinG: true,
                carbG: true,
                fatG: true,
                fiberG: true,
                conversions: { select: { unit: true, gramsPerUnit: true } },
              },
            },
          },
        },
        portions: {
          select: { userId: true, portions: true, consumedAt: true, skipAutoConsume: true },
        },
      },
    });

    const meals = items.map((item) => {
      const manualLines = item.manualIngredients.map((line) => {
        const fallback =
          line.grams === null
            ? resolveGrams({
                quantity: Number(line.quantity),
                unit: line.unit,
                conversions: line.ingredient.conversions.map((conversion) => ({
                  unit: conversion.unit,
                  gramsPerUnit: Number(conversion.gramsPerUnit),
                })),
              })
            : null;
        return {
          ...line,
          resolvedGrams:
            line.grams !== null
              ? Number(line.grams)
              : fallback && !('needsManualGrams' in fallback)
                ? fallback.grams
                : null,
        };
      });
      const nutrition = item.recipe
        ? (nutritionFromSnapshot(item.recipe.nutritionSnapshot) ??
          computeRecipeNutrition([], Number(item.recipe.servings)))
        : computeRecipeNutrition(
            manualLines.map((line) => ({
              grams: line.resolvedGrams,
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
      return {
        date: item.date.toISOString(),
        slot: item.slot as MealSlot,
        recipeId: item.recipeId,
        recipeName:
          item.recipe?.name ??
          (manualLines.length > 0
            ? manualMealName(
                manualLines.map((line) => ({
                  nameFr: line.ingredient.nameFr,
                  grams: line.resolvedGrams,
                  quantity: Number(line.quantity),
                })),
              )
            : null),
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
