import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuantityUnit, nutritionFromSnapshot } from '@cuisinons/db';
import {
  resolveGrams,
  type QuantityUnit as SharedUnit,
  compareRecipesForSlot,
  recipeDietSlugsForQuery,
  type RecipeNutrition,
} from '@cuisinons/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { nutritionForRecipe } from '../nutrition/recipe-nutrition.js';
import { persistRecipeNutritionSnapshot } from '../nutrition/persist-snapshot.js';
import { decodePhotoDataUrl, publicRecipePhotoUrl, type RecipePhoto } from './recipe-photo.js';

export type RecipeWriteInput = {
  name: string;
  description?: string | null;
  servings: number;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  finalCookedWeight?: number | null;
  photoDataUrl?: string | null;
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
  ingredients: {
    select: {
      ingredientId: true,
      quantity: true,
      unit: true,
      grams: true,
      gramsManual: true,
      displayQuantity: true,
      estimated: true,
      sortOrder: true,
      ingredient: {
        select: {
          id: true,
          nameFr: true,
          iconUrl: true,
          uxCategory: true,
          energyKcal: true,
          proteinG: true,
          carbG: true,
          fatG: true,
          fiberG: true,
          conversions: { select: { unit: true, gramsPerUnit: true } },
        },
      },
    },
    orderBy: { sortOrder: 'asc' as const },
  },
  steps: { select: { stepNumber: true, description: true, durationMinutes: true }, orderBy: { stepNumber: 'asc' as const } },
  tags: { select: { tag: { select: { id: true, slug: true, label: true } } } },
  equipment: { select: { equipment: { select: { id: true, slug: true, label: true } } } },
  ratings: { select: { stars: true, user: { select: { id: true, displayName: true } } } },
} satisfies Prisma.RecipeInclude;

const listSelect = {
  id: true,
  name: true,
  source: true,
  servings: true,
  updatedAt: true,
  prepTimeMinutes: true,
  cookTimeMinutes: true,
  nutritionSnapshot: true,
  author: { select: { id: true, displayName: true, email: true } },
  tags: { select: { tag: { select: { slug: true, label: true } } } },
  ratings: { select: { stars: true } },
} satisfies Prisma.RecipeSelect;

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

  private photoFields(input: RecipeWriteInput): { photoUrl?: string | null } {
    if (input.photoDataUrl === undefined) return {};
    if (input.photoDataUrl === null) return { photoUrl: null };
    try {
      decodePhotoDataUrl(input.photoDataUrl);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Photo invalide.');
    }
    return { photoUrl: input.photoDataUrl };
  }

  private ratingSummary(ratings: Array<{ stars: number }>) {
    const average =
      ratings.length === 0 ? null : ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length;
    return { average, count: ratings.length };
  }

  private serialize(
    recipe: Omit<Prisma.RecipeGetPayload<{ include: typeof recipeInclude }>, 'photoUrl'>,
    photoUrl: string | null,
  ) {
    const nutrition =
      nutritionFromSnapshot(recipe.nutritionSnapshot) ??
      nutritionForRecipe(recipe.ingredients, Number(recipe.servings), recipe.finalCookedWeight);
    const ratings = recipe.ratings;
    return {
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      status: recipe.status,
      source: recipe.source,
      authorId: recipe.authorId,
      author: recipe.author,
      servings: recipe.servings,
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
      finalCookedWeight: recipe.finalCookedWeight,
      version: recipe.version,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      tags: recipe.tags,
      equipment: recipe.equipment,
      photoUrl,
      nutrition,
      rating: { ...this.ratingSummary(ratings), ratings },
    };
  }

  private serializeCard(
    recipe: Prisma.RecipeGetPayload<{ select: typeof listSelect }>,
    photoUrl: string | null,
    nutrition: RecipeNutrition,
  ) {
    return {
      id: recipe.id,
      name: recipe.name,
      source: recipe.source,
      servings: recipe.servings,
      updatedAt: recipe.updatedAt,
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
      author: recipe.author,
      tags: recipe.tags,
      photoUrl,
      nutrition: {
        perServing: nutrition.perServing,
        per100g: nutrition.per100g,
        complete: nutrition.complete,
      },
      rating: this.ratingSummary(recipe.ratings),
    };
  }

  private async nutritionForIds(
    recipes: Array<{
      id: string;
      servings: Prisma.Decimal;
      nutritionSnapshot: Prisma.JsonValue | null;
    }>,
  ): Promise<Map<string, RecipeNutrition>> {
    const map = new Map<string, RecipeNutrition>();
    const missing: string[] = [];
    for (const recipe of recipes) {
      const snapshot = nutritionFromSnapshot(recipe.nutritionSnapshot);
      if (snapshot) map.set(recipe.id, snapshot);
      else missing.push(recipe.id);
    }
    if (missing.length === 0) return map;
    const lines = await this.prisma.recipeIngredient.findMany({
      where: { recipeId: { in: missing } },
      select: {
        recipeId: true,
        grams: true,
        ingredient: {
          select: { energyKcal: true, proteinG: true, carbG: true, fatG: true, fiberG: true },
        },
      },
    });
    const byRecipe = new Map<string, typeof lines>();
    for (const line of lines) {
      const bucket = byRecipe.get(line.recipeId) ?? [];
      bucket.push(line);
      byRecipe.set(line.recipeId, bucket);
    }
    const servingsById = new Map(recipes.map((recipe) => [recipe.id, Number(recipe.servings)]));
    for (const id of missing) {
      const nutrition = nutritionForRecipe(byRecipe.get(id) ?? [], servingsById.get(id) ?? 1);
      map.set(id, nutrition);
    }
    void Promise.all(missing.map((id) => persistRecipeNutritionSnapshot(this.prisma, id))).catch(() => undefined);
    return map;
  }

  private async photoUrlById(ids: string[], updatedAtById: Map<string, Date>) {
    const map = new Map<string, string | null>();
    const custom: string[] = [];
    for (const id of ids) {
      if (id.startsWith('official-')) {
        map.set(id, publicRecipePhotoUrl(id, null, updatedAtById.get(id) ?? new Date()));
      } else {
        custom.push(id);
      }
    }
    if (custom.length === 0) return map;
    const publicRows = await this.prisma.recipe.findMany({
      where: { id: { in: custom }, photoUrl: { startsWith: '/' } },
      select: { id: true, photoUrl: true },
    });
    const stored = new Map(publicRows.map((row) => [row.id, row.photoUrl]));
    const missing: string[] = [];
    for (const id of custom) {
      const url = publicRecipePhotoUrl(id, stored.get(id) ?? null, updatedAtById.get(id) ?? new Date());
      if (url) map.set(id, url);
      else missing.push(id);
    }
    if (missing.length > 0) {
      const dataRows = await this.prisma.recipe.findMany({
        where: { id: { in: missing }, photoUrl: { not: null } },
        select: { id: true },
      });
      for (const row of dataRows) {
        const updatedAt = updatedAtById.get(row.id) ?? new Date();
        map.set(row.id, publicRecipePhotoUrl(row.id, true, updatedAt));
      }
    }
    return map;
  }

  async list(input: {
    q?: string;
    tag?: string;
    sort?: string;
    basis?: 'serving' | '100g';
    equipment?: string;
    slot?: 'BREAKFAST' | 'LUNCH' | 'SNACK' | 'DINNER';
    view?: 'mine' | 'ideas';
  }) {
    const where: Prisma.RecipeWhereInput = { status: 'PUBLISHED' };
    if (input.view === 'ideas') {
      where.id = { startsWith: 'official-h' };
    } else if (input.view === 'mine') {
      where.NOT = { id: { startsWith: 'official-h' } };
    }
    if (input.q) {
      const needle = { contains: input.q, mode: 'insensitive' as const };
      const dietSlugs = recipeDietSlugsForQuery(input.q);
      const or: Prisma.RecipeWhereInput[] = [
        { name: needle },
        { description: needle },
        { tags: { some: { tag: { label: needle } } } },
        { tags: { some: { tag: { slug: needle } } } },
      ];
      if (dietSlugs.length > 0) {
        or.push({ tags: { some: { tag: { slug: { in: dietSlugs } } } } });
      }
      where.OR = or;
    }
    if (input.tag === 'vegetarien') {
      where.tags = { some: { tag: { slug: { in: ['vegetarien', 'vegan'] } } } };
    } else if (input.tag) {
      where.tags = { some: { tag: { OR: [{ slug: input.tag }, { id: input.tag }] } } };
    }
    if (input.equipment) {
      where.equipment = { some: { equipment: { slug: input.equipment } } };
    }
    const recipes = await this.prisma.recipe.findMany({
      where,
      select: listSelect,
      orderBy: { updatedAt: 'desc' },
    });
    const [photos, nutritionById] = await Promise.all([
      this.photoUrlById(
        recipes.map((recipe) => recipe.id),
        new Map(recipes.map((recipe) => [recipe.id, recipe.updatedAt])),
      ),
      this.nutritionForIds(recipes),
    ]);
    const serialized = recipes.map((recipe) =>
      this.serializeCard(
        recipe,
        photos.get(recipe.id) ?? null,
        nutritionById.get(recipe.id) ?? nutritionForRecipe([], Number(recipe.servings)),
      ),
    );
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
    if (input.slot) {
      sorted.sort((a, b) =>
        compareRecipesForSlot(
          { tags: a.tags.map((t) => t.tag.slug), name: a.name },
          { tags: b.tags.map((t) => t.tag.slug), name: b.name },
          input.slot!,
        ),
      );
    }
    return sorted;
  }

  async get(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: recipeInclude,
      omit: { photoUrl: true },
    });
    if (!recipe) throw new NotFoundException('Recette introuvable.');
    if (!nutritionFromSnapshot(recipe.nutritionSnapshot)) {
      void persistRecipeNutritionSnapshot(this.prisma, id).catch(() => undefined);
    }
    const photos = await this.photoUrlById([recipe.id], new Map([[recipe.id, recipe.updatedAt]]));
    return this.serialize(recipe, photos.get(recipe.id) ?? null);
  }

  async getPhoto(id: string): Promise<RecipePhoto> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      select: { photoUrl: true },
    });
    if (!recipe?.photoUrl) throw new NotFoundException('Photo introuvable.');
    try {
      return decodePhotoDataUrl(recipe.photoUrl);
    } catch {
      throw new NotFoundException('Photo introuvable.');
    }
  }

  async create(userId: string, input: RecipeWriteInput) {
    const lines = await Promise.all(input.ingredients.map((line) => this.resolveLineGrams(line)));
    const photo = this.photoFields(input);
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
          photoUrl: photo.photoUrl,
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
    await persistRecipeNutritionSnapshot(this.prisma, created);
    return this.get(created);
  }

  async update(id: string, input: RecipeWriteInput) {
    const existing = await this.prisma.recipe.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Recette introuvable.');
    if (input.version !== undefined && input.version !== existing.version) {
      throw new ConflictException('La recette a été modifiée ailleurs. Recharge la page.');
    }
    const lines = await Promise.all(input.ingredients.map((line) => this.resolveLineGrams(line)));
    const photo = this.photoFields(input);
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
          ...photo,
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
    await persistRecipeNutritionSnapshot(this.prisma, id);
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
