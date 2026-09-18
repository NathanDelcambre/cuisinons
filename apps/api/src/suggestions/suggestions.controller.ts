import { BadRequestException, Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { DIETS, DISH_KINDS } from '@cuisinons/shared';
import { InternalJwtGuard } from '../auth/internal-jwt.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/internal-jwt.guard.js';
import { SuggestionsService } from './suggestions.service.js';

const previewSchema = z.object({
  servings: z.number().int().min(1).max(12).optional(),
  maxMinutes: z.number().int().min(5).max(180).nullable().optional(),
  maxIngredients: z.number().int().min(2).max(16).nullable().optional(),
  kind: z.enum(DISH_KINDS).nullable().optional(),
  diet: z.enum(DIETS).optional(),
});

@Controller()
@UseGuards(InternalJwtGuard)
export class SuggestionsController {
  constructor(@Inject(SuggestionsService) private readonly suggestions: SuggestionsService) {}

  /** Lecture seule : rien n'est persisté tant que le client n'appelle pas POST /recipes. */
  @Post('/suggestions')
  preview(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = previewSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException('Filtres de proposition invalides.');
    }
    return this.suggestions.preview(user.id, parsed.data);
  }
}
