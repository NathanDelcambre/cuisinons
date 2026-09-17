import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { MEAL_SLOTS } from '@cuisinons/shared';
import { InternalJwtGuard } from '../auth/internal-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/internal-jwt.guard';
import { PlannerService } from './planner.service';
import { maxFutureDate, parseIsoDate } from './dates';
import { ForbiddenException } from '@nestjs/common';

@Controller()
@UseGuards(InternalJwtGuard)
export class PlannerController {
  constructor(private readonly planner: PlannerService) {}

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
        recipeId: z.string().min(1),
        portions: z.array(z.object({ userId: z.string(), portions: z.number().positive().max(6) })),
      })
      .parse(body);
    const date = parseIsoDate(parsed.date);
    if (date.getTime() > maxFutureDate().getTime()) {
      throw new ForbiddenException('Planning limité à 12 mois.');
    }
    return this.planner.addItem({
      date,
      slot: parsed.slot,
      recipeId: parsed.recipeId,
      createdById: user.id,
      portions: parsed.portions,
    });
  }

  @Patch('/planner/items/:id')
  update(@Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        slot: z.enum(MEAL_SLOTS).optional(),
        version: z.number().int().optional(),
        portions: z
          .array(z.object({ userId: z.string(), portions: z.number().positive().max(6) }))
          .optional(),
      })
      .parse(body);
    return this.planner.updateItem(id, {
      date: parsed.date ? parseIsoDate(parsed.date) : undefined,
      slot: parsed.slot,
      version: parsed.version,
      portions: parsed.portions,
    });
  }

  @Delete('/planner/items/:id')
  remove(@Param('id') id: string) {
    return this.planner.remove(id);
  }
}
