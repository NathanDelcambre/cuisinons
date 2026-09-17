import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@cuisinons/db';
import { normalizeSearchText, type UxCategory } from '@cuisinons/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(input: {
    q?: string;
    category?: UxCategory;
    userId: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = Math.min(input.limit ?? 20, 50);
    const where: Prisma.IngredientWhereInput = {};
    if (input.q && input.q.trim().length > 0) {
      const normalized = normalizeSearchText(input.q);
      where.OR = [
        { nameNormalized: { contains: normalized, mode: 'insensitive' } },
        { nameFr: { contains: input.q.trim(), mode: 'insensitive' } },
      ];
    }
    if (input.category) {
      where.uxCategory = input.category;
    }
    const items = await this.prisma.ingredient.findMany({
      where,
      take: limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      orderBy: [{ nameFr: 'asc' }],
    });
    const nextCursor = items.length > limit ? items[limit]?.id : null;
    return { items: items.slice(0, limit), nextCursor };
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

  async iconReport() {
    const [total, dedicated] = await Promise.all([
      this.prisma.ingredient.count(),
      this.prisma.ingredient.count({ where: { dedicatedIcon: true } }),
    ]);
    return {
      total,
      dedicated,
      fallbacks: total - dedicated,
    };
  }
}
