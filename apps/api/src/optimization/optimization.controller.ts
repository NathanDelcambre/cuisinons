import { Body, Controller, Get, Inject, Post, Put, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { InternalJwtGuard } from '../auth/internal-jwt.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/internal-jwt.guard.js';
import { OptimizationService } from './optimization.service.js';

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

  @Post('/optimization/week/preview')
  previewWeek(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = z
      .object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        mode: z.enum(['fill', 'replace']),
      })
      .parse(body);
    return this.optimization.previewWeek(user.id, parsed.from, parsed.mode);
  }

  @Post('/optimization/week/apply')
  applyWeek(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = z
      .object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        mode: z.enum(['fill', 'replace']),
      })
      .parse(body);
    return this.optimization.applyWeek(user.id, parsed.from, parsed.mode);
  }

  @Post('/optimization/undo')
  undo(@CurrentUser() user: AuthUser) {
    return this.optimization.undo(user.id);
  }

  @Get('/optimization/undo')
  undoStatus(@CurrentUser() user: AuthUser) {
    return this.optimization.hasUndo(user.id);
  }
}
