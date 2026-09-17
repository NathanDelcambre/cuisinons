import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuantityUnit } from '@cuisinons/db';
import { resolveGrams, type QuantityUnit as SharedUnit } from '@cuisinons/shared';
import { PrismaService } from '../prisma/prisma.service';
import { nutritionForRecipe } from '../nutrition/recipe-nutrition';

export type RecipeWriteInput = {
  name: string;
  description?: string | null;
  servings: number;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  finalCookedWeight?: number | null;
  status?: 'DRAFT' | 'PUBLISHED';
  version?: number;
  ingredients: Array<{
    ingredientId: string;
    quantity: number;
    unit: SharedUnit;
    gramsManual?: number | null;
    displayQuantity?: string | null;
  }>;
  steps: Array<{ description: string; durationMinutes?: number | null }>;
  tagIds: string[];
  equipmentIds: string[];
};

const recipeInclude = {
  author: { select: { id: true, displayName: true, email: true } },
  ingredients: { include: { ingredient: { include: { conversions: true } } }, orderBy: { sortOrder: 'asc' as const } },
  steps: { orderBy: { stepNumber: 'asc' as const } },
  tags: { include: { tag: true } },
  equipment: { include: { equipment: true } },
  ratings: { include: { user: { select: { id: true, displayName: true } } } },
} satisfies Prisma.RecipeInclude;

@Injectable()
export class RecipesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async resolveLineGrams(line: RecipeWriteInput['ingredients'][number]) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: line.ingredientId },
      include: { conversions: true },
    });
    if (!ingredient) throw new NotFoundException('Ingrédient introuvable.');
    const resolved = resolveGrams({
      quantity: line.quantity,
      unit: line.unit,
      conversions: ingredient.conversions.map((c) => ({
        unit: c.unit as SharedUnit,
        gramsPerUnit: Number(c.gramsPerUnit),
      })),
      manualGrams: line.gramsManual ?? null,
    });
    if ('needsManualGrams' in resolved) {
      return { grams: null, estimated: true, gramsManual: true };
    }
    return {
      grams: resolved.grams,
      estimated: resolved.estimated,
      gramsManual: resolved.source === 'manual',
    };
  }

  private serialize(recipe: Prisma.RecipeGetPayload<{ include: typeof recipeInclude }>) {
    const nutrition = nutritionForRecipe(
      recipe.ingredients,
      Number(recipe.servings),
      recipe.finalCookedWeight,
    );
    const ratings = recipe.ratings;
    const average =
      ratings.length === 0 ? null : ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length;
    return { ...recipe, nutrition, rating: { average, count: ratings.length, ratings } };
  }

  async list(input: {
    q?: string;
    tag?: string;
    sort?: string;
    basis?: 'serving' | '100g';
    equipment?: string;
  }) {
    const where: Prisma.RecipeWhereInput = { status: 'PUBLISHED' };
    if (input.q) {
      where.name = { contains: input.q, mode: 'insensitive' };
    }
    if (input.tag) {
      where.tags = { some: { tag: { slug: input.tag } } };
    }
    if (input.equipment) {
      where.equipment = { some: { equipment: { slug: input.equipment } } };
    }
    const recipes = await this.prisma.recipe.findMany({
      where,
      include: recipeInclude,
      orderBy: { updatedAt: 'desc' },
    });
    const serialized = recipes.map((r) => this.serialize(r));
    const basis = input.basis ?? 'serving';
    const pick = (r: (typeof serialized)[number], key: 'kcal' | 'protein' | 'carbs') => {
      if (basis === '100g') return r.nutrition.per100g?.[key] ?? 0;
      return r.nutrition.perServing[key];
    };
    const sorted = [...serialized];
    switch (input.sort) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        break;
      case 'date':
        sorted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        break;
      case 'rating-asc':
        sorted.sort((a, b) => (a.rating.average ?? 0) - (b.rating.average ?? 0));
        break;
      case 'rating-desc':
        sorted.sort((a, b) => (b.rating.average ?? 0) - (a.rating.average ?? 0));
        break;
      case 'protein-asc':
        sorted.sort((a, b) => pick(a, 'protein') - pick(b, 'protein'));
        break;
      case 'protein-desc':
        sorted.sort((a, b) => pick(b, 'protein') - pick(a, 'protein'));
        break;
      case 'carbs-asc':
        sorted.sort((a, b) => pick(a, 'carbs') - pick(b, 'carbs'));
        break;
      case 'carbs-desc':
        sorted.sort((a, b) => pick(b, 'carbs') - pick(a, 'carbs'));
        break;
      case 'kcal-asc':
        sorted.sort((a, b) => pick(a, 'kcal') - pick(b, 'kcal'));
        break;
      case 'kcal-desc':
        sorted.sort((a, b) => pick(b, 'kcal') - pick(a, 'kcal'));
        break;
      default:
        break;
    }
    return sorted;
  }

  async get(id: string) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id }, include: recipeInclude });
    if (!recipe) throw new NotFoundException('Recette introuvable.');
    return this.serialize(recipe);
  }

  async create(userId: string, input: RecipeWriteInput) {
    const lines = await Promise.all(input.ingredients.map((line) => this.resolveLineGrams(line)));
    const created = await this.prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          name: input.name,
          description: input.description,
          authorId: userId,
          servings: input.servings,
          prepTimeMinutes: input.prepTimeMinutes,
          cookTimeMinutes: input.cookTimeMinutes,
          finalCookedWeight: input.finalCookedWeight,
          status: input.status ?? 'DRAFT',
          ingredients: {
            create: input.ingredients.map((line, index) => ({
              ingredientId: line.ingredientId,
              quantity: line.quantity,
              unit: line.unit as QuantityUnit,
              grams: lines[index]?.grams,
              gramsManual: lines[index]?.gramsManual ?? false,
              displayQuantity: line.displayQuantity,
              sortOrder: index,
              estimated: lines[index]?.estimated ?? false,
            })),
          },
          steps: {
            create: input.steps.map((step, index) => ({
              stepNumber: index + 1,
              description: step.description,
              durationMinutes: step.durationMinutes,
            })),
          },
          tags: { create: input.tagIds.map((tagId) => ({ tagId })) },
          equipment: { create: input.equipmentIds.map((equipmentId) => ({ equipmentId })) },
        },
      });
      return recipe.id;
    });
    return this.get(created);
  }

  async update(id: string, input: RecipeWriteInput) {
    const existing = await this.prisma.recipe.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Recette introuvable.');
    if (input.version !== undefined && input.version !== existing.version) {
      throw new ConflictException('La recette a été modifiée ailleurs. Recharge la page.');
    }
    const lines = await Promise.all(input.ingredients.map((line) => this.resolveLineGrams(line)));
    await this.prisma.$transaction(async (tx) => {
      await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
      await tx.recipeStep.deleteMany({ where: { recipeId: id } });
      await tx.recipeTag.deleteMany({ where: { recipeId: id } });
      await tx.recipeEquipment.deleteMany({ where: { recipeId: id } });
      await tx.recipe.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          servings: input.servings,
          prepTimeMinutes: input.prepTimeMinutes,
          cookTimeMinutes: input.cookTimeMinutes,
          finalCookedWeight: input.finalCookedWeight,
          status: input.status ?? existing.status,
          version: { increment: 1 },
          ingredients: {
            create: input.ingredients.map((line, index) => ({
              ingredientId: line.ingredientId,
              quantity: line.quantity,
              unit: line.unit as QuantityUnit,
              grams: lines[index]?.grams,
              gramsManual: lines[index]?.gramsManual ?? false,
              displayQuantity: line.displayQuantity,
              sortOrder: index,
              estimated: lines[index]?.estimated ?? false,
            })),
          },
          steps: {
            create: input.steps.map((step, index) => ({
              stepNumber: index + 1,
              description: step.description,
              durationMinutes: step.durationMinutes,
            })),
          },
          tags: { create: input.tagIds.map((tagId) => ({ tagId })) },
          equipment: { create: input.equipmentIds.map((equipmentId) => ({ equipmentId })) },
        },
      });
    });
    return this.get(id);
  }

  async remove(id: string) {
    await this.prisma.recipe.delete({ where: { id } });
    return { ok: true };
  }

  async rate(recipeId: string, userId: string, stars: number) {
    await this.prisma.recipeRating.upsert({
      where: { recipeId_userId: { recipeId, userId } },
      update: { stars },
      create: { recipeId, userId, stars },
    });
    return this.get(recipeId);
  }
}
