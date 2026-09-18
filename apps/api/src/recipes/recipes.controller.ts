import { Body, Controller, Delete, Get, Header, Inject, Param, Patch, Post, Put, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { z } from 'zod';
import { MEAL_SLOTS } from '@cuisinons/shared';
import { InternalJwtGuard } from '../auth/internal-jwt.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/internal-jwt.guard.js';
import { RecipesService } from './recipes.service.js';
import { recipeWriteSchema } from './recipe-write.js';

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
    @Query('slot') slot?: string,
  ) {
    const parsedSlot = MEAL_SLOTS.includes(slot as (typeof MEAL_SLOTS)[number])
      ? (slot as (typeof MEAL_SLOTS)[number])
      : undefined;
    return this.recipes.list({ q, tag, sort, basis, equipment, slot: parsedSlot });
  }

  @Post('/recipes')
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.recipes.create(user.id, recipeWriteSchema.parse(body));
  }

  @Get('/recipes/:id/photo')
  @SkipThrottle()
  @Header('Cache-Control', 'private, max-age=86400')
  async photo(@Param('id') id: string) {
    const { bytes, mime } = await this.recipes.getPhoto(id);
    return new StreamableFile(bytes, { type: mime, disposition: 'inline' });
  }

  @Get('/recipes/:id')
  get(@Param('id') id: string) {
    return this.recipes.get(id);
  }

  @Patch('/recipes/:id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.recipes.update(id, recipeWriteSchema.parse(body));
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
