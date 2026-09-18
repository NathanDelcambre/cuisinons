import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@cuisinons/db';
import {
  collapseKitchenIngredients,
  isKitchenNoise,
  kitchenLabel,
  normalizeSearchText,
  queryWantsIndustrial,
  type UxCategory,
} from '@cuisinons/shared';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class IngredientsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async search(input: {
    q?: string;
    category?: UxCategory;
    userId: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = Math.min(input.limit ?? 40, 80);
    const query = input.q?.trim() ?? '';
    const where: Prisma.IngredientWhereInput = {};
    if (query.length > 0) {
      const normalized = normalizeSearchText(query);
      where.OR = [
        { nameNormalized: { contains: normalized, mode: 'insensitive' } },
        { nameFr: { contains: query, mode: 'insensitive' } },
      ];
    } else {
      where.NOT = {
        OR: [
          { groupName: { contains: 'infantiles', mode: 'insensitive' } },
          { nameNormalized: { contains: 'preleve a' } },
          { nameNormalized: { contains: 'aliment moyen' } },
          { nameNormalized: { contains: 'sans precision' } },
        ],
      };
    }
    if (input.category) {
      where.uxCategory = input.category;
    }
    const pool = await this.prisma.ingredient.findMany({
      where,
      select: {
        id: true,
        nameFr: true,
        iconUrl: true,
        uxCategory: true,
        dedicatedIcon: true,
        groupName: true,
      },
      orderBy: { nameFr: 'asc' },
    });
    const collapsed = collapseKitchenIngredients(pool, (item) => ({
      dedicatedIcon: item.dedicatedIcon,
      groupName: item.groupName,
    })).filter(
      (item) => !isKitchenNoise(item.nameFr, item.groupName) || queryWantsIndustrial(query),
    );
    const labeled = collapsed.map((item) => ({
      id: item.id,
      nameFr: kitchenLabel(item.nameFr),
      iconUrl: item.iconUrl,
      uxCategory: item.uxCategory,
    }));
    let start = 0;
    if (input.cursor) {
      const index = labeled.findIndex((item) => item.id === input.cursor);
      start = index === -1 ? labeled.length : index + 1;
    }
    const items = labeled.slice(start, start + limit);
    const nextCursor = start + limit < labeled.length ? items[items.length - 1]?.id ?? null : null;
    return { items, nextCursor };
  }

  async recents(userId: string) {
    return this.prisma.userIngredientRecent.findMany({
      where: { userId },
      orderBy: { usedAt: 'desc' },
      take: 12,
      include: { ingredient: true },
    });
  }

  async favorites(userId: string) {
    return this.prisma.userIngredientFavorite.findMany({
      where: { userId },
      include: { ingredient: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleFavorite(userId: string, ingredientId: string) {
    const existing = await this.prisma.userIngredientFavorite.findUnique({
      where: { userId_ingredientId: { userId, ingredientId } },
    });
    if (existing) {
      await this.prisma.userIngredientFavorite.delete({
        where: { userId_ingredientId: { userId, ingredientId } },
      });
      return { favorite: false };
    }
    await this.prisma.userIngredientFavorite.create({ data: { userId, ingredientId } });
    return { favorite: true };
  }

  async get(id: string) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id },
      include: { conversions: true },
    });
    if (!ingredient) throw new NotFoundException('Ingrédient introuvable.');
    return ingredient;
  }

  async markRecent(userId: string, ingredientId: string) {
    await this.prisma.userIngredientRecent.upsert({
      where: { userId_ingredientId: { userId, ingredientId } },
      update: { usedAt: new Date() },
      create: { userId, ingredientId },
    });
  }
}
