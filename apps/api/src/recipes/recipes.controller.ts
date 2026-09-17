import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { QUANTITY_UNITS } from '@cuisinons/shared';
import { InternalJwtGuard } from '../auth/internal-jwt.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/internal-jwt.guard.js';
import { RecipesService } from './recipes.service.js';

const writeSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(4000).nullable().optional(),
  servings: z.number().positive().max(50),
  prepTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  cookTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  finalCookedWeight: z.number().positive().nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  version: z.number().int().optional(),
  ingredients: z.array(
    z.object({
      ingredientId: z.string().min(1),
      quantity: z.number().nonnegative(),
      unit: z.enum(QUANTITY_UNITS),
      gramsManual: z.number().positive().nullable().optional(),
      displayQuantity: z.string().max(32).nullable().optional(),
    }),
  ),
  steps: z.array(
    z.object({
      description: z.string().min(1).max(2000),
      durationMinutes: z.number().int().nonnegative().nullable().optional(),
    }),
  ),
  tagIds: z.array(z.string()),
  equipmentIds: z.array(z.string()),
});

@Controller()
@UseGuards(InternalJwtGuard)
export class RecipesController {
  constructor(@Inject(RecipesService) private readonly recipes: RecipesService) {}

  @Get('/recipes')
  list(
    @Query('q') q?: string,
    @Query('tag') tag?: string,
    @Query('sort') sort?: string,
    @Query('basis') basis?: 'serving' | '100g',
    @Query('equipment') equipment?: string,
  ) {
    return this.recipes.list({ q, tag, sort, basis, equipment });
  }

  @Post('/recipes')
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.recipes.create(user.id, writeSchema.parse(body));
  }

  @Get('/recipes/:id')
  get(@Param('id') id: string) {
    return this.recipes.get(id);
  }

  @Patch('/recipes/:id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.recipes.update(id, writeSchema.parse(body));
  }

  @Delete('/recipes/:id')
  remove(@Param('id') id: string) {
    return this.recipes.remove(id);
  }

  @Put('/recipes/:id/rating')
  rate(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z.object({ stars: z.number().int().min(1).max(5) }).parse(body);
    return this.recipes.rate(id, user.id, parsed.stars);
  }
}
