import { Inject, Injectable } from '@nestjs/common';
import {
  catalogRecipeToArchetype,
  suggestDishes,
  type ComposedDish,
  type Diet,
  type DishKind,
  type PantryIngredient,
  type SuggestionFilters,
} from '@cuisinons/shared';
import { PrismaService } from '../prisma/prisma.service.js';

export type SuggestInput = {
  servings?: number;
  maxMinutes?: number | null;
  maxIngredients?: number | null;
  kind?: DishKind | null;
  diet?: Diet;
};

function num(value: { toNumber(): number } | number | null): number | null {
  if (value === null) return null;
  return typeof value === 'number' ? value : value.toNumber();
}

@Injectable()
export class SuggestionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async preview(userId: string, input: SuggestInput) {
    const [pantry, tags, equipment, catalogRows] = await Promise.all([
      this.prisma.pantryItem.findMany({
        where: { userId },
        include: { ingredient: { include: { conversions: true } } },
      }),
      this.prisma.tag.findMany({ select: { id: true, slug: true } }),
      this.prisma.equipment.findMany({ select: { id: true, slug: true } }),
      this.prisma.recipe.findMany({
        where: { source: 'CATALOG', status: 'PUBLISHED' },
        include: {
          ingredients: { include: { ingredient: true }, orderBy: { sortOrder: 'asc' } },
          tags: { include: { tag: true } },
          equipment: { include: { equipment: true } },
        },
      }),
    ]);

    const stock: PantryIngredient[] = pantry.map((item) => ({
      ingredientId: item.ingredientId,
      nameFr: item.ingredient.nameFr,
      iconUrl: item.ingredient.iconUrl,
      uxCategory: item.ingredient.uxCategory,
      quantity: Number(item.quantity),
      unit: item.unit,
      conversions: item.ingredient.conversions.map((conversion) => ({
        unit: conversion.unit,
        gramsPerUnit: Number(conversion.gramsPerUnit),
      })),
      energyKcal: num(item.ingredient.energyKcal),
      proteinG: num(item.ingredient.proteinG),
      carbG: num(item.ingredient.carbG),
      fatG: num(item.ingredient.fatG),
      fiberG: num(item.ingredient.fiberG),
    }));

    const filters: SuggestionFilters = {
      servings: input.servings ?? 2,
      maxMinutes: input.maxMinutes ?? null,
      maxIngredients: input.maxIngredients ?? null,
      kind: input.kind ?? null,
      diet: input.diet ?? 'omnivore',
    };

    const tagBySlug = new Map(tags.map((tag) => [tag.slug, tag.id]));
    const equipmentBySlug = new Map(equipment.map((item) => [item.slug, item.id]));
    const catalog = catalogRows.map((recipe) =>
      catalogRecipeToArchetype({
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        prepTimeMinutes: recipe.prepTimeMinutes,
        cookTimeMinutes: recipe.cookTimeMinutes,
        tagSlugs: recipe.tags.map((row) => row.tag.slug),
        equipmentSlugs: recipe.equipment.map((row) => row.equipment.slug),
        ingredients: recipe.ingredients.map((line) => ({
          nameFr: line.ingredient.nameFr,
          uxCategory: line.ingredient.uxCategory,
        })),
      }),
    );
    const pantrySummary = {
      count: pantry.length,
      usableCount: stock.length,
      names: pantry.slice(0, 8).map((item) => item.ingredient.nameFr),
    };

    try {
      const result = suggestDishes(stock, filters, catalog);
      return {
        pantry: pantrySummary,
        dishes: result.dishes.map((dish) => this.present(dish, tagBySlug, equipmentBySlug)),
        shortage: result.shortage
          ? {
              ...result.shortage,
              alternative: result.shortage.alternative
                ? {
                    ...result.shortage.alternative,
                    dish: this.present(result.shortage.alternative.dish, tagBySlug, equipmentBySlug),
                  }
                : null,
            }
          : null,
      };
    } catch {
      return {
        pantry: pantrySummary,
        dishes: [],
        shortage: {
          title: stock.length === 0 ? 'Réserves vides' : 'Aucun plat avec tes réserves',
          explanation:
            stock.length === 0
              ? 'On ne compose un plat qu’avec tes réserves. Ajoute d’abord ce que tu as dans le frigo ou le placard.'
              : 'On compose uniquement à partir de ton inventaire. Assouplis les filtres, ou complète tes réserves.',
          missing: [],
          alternative: null,
        },
      };
    }
  }

  /**
   * Les identifiants de tags et d'ustensiles vivent en base : le compositeur
   * ne connait que des slugs. On les résout ici, pour que valider la
   * suggestion soit un POST /recipes identique à une création manuelle.
   */
  private present(
    dish: ComposedDish,
    tagBySlug: Map<string, string>,
    equipmentBySlug: Map<string, string>,
  ) {
    const tagIds = dish.tagSlugs.map((slug) => tagBySlug.get(slug)).filter((id): id is string => Boolean(id));
    const equipmentIds = dish.equipmentSlugs
      .map((slug) => equipmentBySlug.get(slug))
      .filter((id): id is string => Boolean(id));
    return {
      ...dish,
      tagIds,
      equipmentIds,
      recipeDraft: {
        name: dish.name,
        description: dish.description,
        servings: dish.servings,
        prepTimeMinutes: dish.prepTimeMinutes,
        cookTimeMinutes: dish.cookTimeMinutes,
        status: 'PUBLISHED' as const,
        ingredients: dish.ingredients.map((line) => ({
          ingredientId: line.ingredientId,
          quantity: line.quantity,
          unit: line.unit,
          displayQuantity: line.displayQuantity,
        })),
        steps: dish.steps,
        tagIds,
        equipmentIds,
      },
    };
  }
}
