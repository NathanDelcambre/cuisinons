import { Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UX_CATEGORIES } from '@cuisinons/shared';
import { InternalJwtGuard } from '../auth/internal-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/internal-jwt.guard';
import { IngredientsService } from './ingredients.service';

@Controller()
@UseGuards(InternalJwtGuard)
export class IngredientsController {
  constructor(@Inject(IngredientsService) private readonly ingredients: IngredientsService) {}

  @Get('/ingredients')
  search(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('cursor') cursor?: string,
  ) {
    const cat = UX_CATEGORIES.find((c) => c === category);
    return this.ingredients.search({ q, category: cat, userId: user.id, cursor });
  }

  @Get('/ingredients/recents')
  recents(@CurrentUser() user: AuthUser) {
    return this.ingredients.recents(user.id);
  }

  @Get('/ingredients/favorites')
  favorites(@CurrentUser() user: AuthUser) {
    return this.ingredients.favorites(user.id);
  }

  @Get('/ingredients/:id')
  get(@Param('id') id: string) {
    return this.ingredients.get(id);
  }

  @Post('/ingredients/:id/favorite')
  favorite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ingredients.toggleFavorite(user.id, id);
  }

  @Post('/ingredients/:id/recent')
  recent(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ingredients.markRecent(user.id, id);
  }

  @Get('/dev/icons')
  icons() {
    return this.ingredients.iconReport();
  }
}
