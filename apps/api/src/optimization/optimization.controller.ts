import { Body, Controller, Get, Inject, Post, Put, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { InternalJwtGuard } from '../auth/internal-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/internal-jwt.guard';
import { OptimizationService } from './optimization.service';

@Controller()
@UseGuards(InternalJwtGuard)
export class OptimizationController {
  constructor(@Inject(OptimizationService) private readonly optimization: OptimizationService) {}

  @Get('/optimization/preferences')
  prefs(@CurrentUser() user: AuthUser) {
    return this.optimization.prefs(user.id);
  }

  @Put('/optimization/preferences')
  save(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = z
      .object({
        enabled: z.boolean(),
        allowAutoAdd: z.boolean(),
        minPortionMultiplier: z.number().min(0.25).max(1),
        maxPortionMultiplier: z.number().min(1).max(3),
      })
      .parse(body);
    return this.optimization.savePrefs(user.id, parsed);
  }

  @Post('/optimization/day/preview')
  preview(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const { date } = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(body);
    return this.optimization.preview(user.id, date);
  }

  @Post('/optimization/day/apply')
  apply(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const { date } = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(body);
    return this.optimization.apply(user.id, date);
  }
}
