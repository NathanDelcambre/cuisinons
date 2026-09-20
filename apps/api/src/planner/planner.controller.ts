import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { MEAL_KINDS, MEAL_SLOTS, QUANTITY_UNITS } from '@cuisinons/shared';
import { InternalJwtGuard } from '../auth/internal-jwt.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/internal-jwt.guard.js';
import { PlannerService } from './planner.service.js';
import { maxFutureDate, parseIsoDate } from './dates.js';
import { ForbiddenException } from '@nestjs/common';

const portionLine = z.object({ userId: z.string(), portions: z.number().min(0).max(6) });
const manualIngredientLine = z.object({
  ingredientId: z.string().min(1),
  quantity: z.number().positive().max(100_000),
  unit: z.enum(QUANTITY_UNITS),
});

function assertSomePortions(portions: Array<{ portions: number }>, ctx: z.RefinementCtx) {
  if (!portions.some((line) => line.portions > 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Au moins une personne doit garder une portion.',
      path: ['portions'],
    });
  }
}

@Controller()
@UseGuards(InternalJwtGuard)
export class PlannerController {
  constructor(@Inject(PlannerService) private readonly planner: PlannerService) {}

  @Get('/planner/week')
  week(@Query('from') from?: string) {
    const date = from ? parseIsoDate(from) : new Date();
    return this.planner.getWeek(date);
  }

  @Post('/planner/items')
  add(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        slot: z.enum(MEAL_SLOTS),
        kind: z.enum(MEAL_KINDS).optional(),
        recipeId: z.string().min(1).optional(),
        portions: z.array(portionLine),
        ingredients: z.array(manualIngredientLine).max(30).optional(),
      })
      .superRefine((val, ctx) => {
        const kind = val.kind ?? 'RECIPE';
        if (kind === 'RECIPE' && !val.recipeId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Choisis une recette.',
            path: ['recipeId'],
          });
        }
        if (kind !== 'RECIPE' && val.recipeId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Pas de recette pour ce type de repas.',
            path: ['recipeId'],
          });
        }
        if (kind === 'IMPOSED' && !val.ingredients?.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Ajoute au moins un ingrédient.',
            path: ['ingredients'],
          });
        }
        if (kind !== 'IMPOSED' && val.ingredients?.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Les ingrédients manuels sont réservés à l’ajout manuel.',
            path: ['ingredients'],
          });
        }
        assertSomePortions(val.portions, ctx);
      })
      .parse(body);
    const date = parseIsoDate(parsed.date);
    if (date.getTime() > maxFutureDate().getTime()) {
      throw new ForbiddenException('Planning limité à 12 mois.');
    }
    return this.planner.addItem({
      date,
      slot: parsed.slot,
      kind: parsed.kind ?? 'RECIPE',
      recipeId: parsed.recipeId,
      createdById: user.id,
      portions: parsed.portions,
      ingredients: parsed.ingredients,
    });
  }

  @Patch('/planner/items/:id')
  update(@Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        slot: z.enum(MEAL_SLOTS).optional(),
        recipeId: z.string().min(1).optional(),
        kind: z.enum(MEAL_KINDS).optional(),
        version: z.number().int().optional(),
        portions: z.array(portionLine).optional(),
      })
      .superRefine((val, ctx) => {
        if (val.portions) assertSomePortions(val.portions, ctx);
      })
      .parse(body);
    return this.planner.updateItem(id, {
      date: parsed.date ? parseIsoDate(parsed.date) : undefined,
      slot: parsed.slot,
      recipeId: parsed.recipeId,
      kind: parsed.kind,
      version: parsed.version,
      portions: parsed.portions,
    });
  }

  @Delete('/planner/items/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query('scope') scope?: string) {
    if (scope === 'me') return this.planner.removeForUser(id, user.id);
    return this.planner.remove(id);
  }

  @Post('/planner/items/:id/replace-for-me')
  replaceForMe(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        recipeId: z.string().min(1),
        portions: z.number().min(0.5).max(6).optional(),
      })
      .parse(body);
    return this.planner.replaceForUser(id, user.id, {
      recipeId: parsed.recipeId,
      portions: parsed.portions ?? 1,
    });
  }
}
