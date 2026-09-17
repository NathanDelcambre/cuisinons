import { Body, Controller, Get, Inject, Put, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { GOAL_MODES } from '@cuisinons/shared';
import { InternalJwtGuard } from '../auth/internal-jwt.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/internal-jwt.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PlannerService } from '../planner/planner.service.js';
import { parseIsoDate } from '../planner/dates.js';

const goalSchema = z.object({
  caloriesMode: z.enum(GOAL_MODES),
  caloriesValue: z.number().nonnegative().nullable(),
  caloriesTolerance: z.number().nonnegative().nullable(),
  proteinMode: z.enum(GOAL_MODES),
  proteinValue: z.number().nonnegative().nullable(),
  proteinTolerance: z.number().nonnegative().nullable(),
  carbsMode: z.enum(GOAL_MODES),
  carbsValue: z.number().nonnegative().nullable(),
  carbsTolerance: z.number().nonnegative().nullable(),
  fatMode: z.enum(GOAL_MODES),
  fatValue: z.number().nonnegative().nullable(),
  fatTolerance: z.number().nonnegative().nullable(),
});

@Controller()
@UseGuards(InternalJwtGuard)
export class NutritionController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PlannerService) private readonly planner: PlannerService,
  ) {}

  @Get('/nutrition-goals')
  async getGoals(@CurrentUser() user: AuthUser, @Query('date') date?: string) {
    const base = await this.prisma.nutritionGoal.findUnique({ where: { userId: user.id } });
    if (!date) return base;
    const override = await this.prisma.dailyNutritionGoalOverride.findUnique({
      where: { userId_date: { userId: user.id, date: parseIsoDate(date) } },
    });
    return override ?? base;
  }

  @Put('/nutrition-goals')
  putGoals(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const data = goalSchema.parse(body);
    return this.prisma.nutritionGoal.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...data },
    });
  }

  @Put('/nutrition-goals/day')
  putDay(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = goalSchema.extend({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(body);
    const { date, ...data } = parsed;
    return this.prisma.dailyNutritionGoalOverride.upsert({
      where: { userId_date: { userId: user.id, date: parseIsoDate(date) } },
      update: data,
      create: { userId: user.id, date: parseIsoDate(date), ...data },
    });
  }

  @Get('/nutrition/day')
  async day(@CurrentUser() user: AuthUser, @Query('date') date: string) {
    const day = parseIsoDate(date);
    const items = await this.planner.getWeek(day);
    return this.planner.macrosForUser(items, user.id, day);
  }
}
