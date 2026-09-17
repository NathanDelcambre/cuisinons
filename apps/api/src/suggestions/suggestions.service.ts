import { Inject, Injectable } from '@nestjs/common';
import {
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
    const [pantry, tags, equipment] = await Promise.all([
      this.prisma.pantryItem.findMany({
        where: { userId },
        include: { ingredient: { include: { conversions: true } } },
      }),
      this.prisma.tag.findMany({ select: { id: true, slug: true } }),
      this.prisma.equipment.findMany({ select: { id: true, slug: true } }),
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
    const result = suggestDishes(stock, filters);

    return {
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
