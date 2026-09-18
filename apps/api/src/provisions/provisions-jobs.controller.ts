import { Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InternalKeyGuard } from '../auth/internal-key.guard.js';
import { ProvisionsService } from './provisions.service.js';

@Controller()
@UseGuards(InternalKeyGuard)
@SkipThrottle()
export class ProvisionsJobsController {
  constructor(@Inject(ProvisionsService) private readonly provisions: ProvisionsService) {}

  /** Cron : déduit les repas des jours passés pour tous les comptes. */
  @Post('/internal/provisions/settle-past')
  settlePast() {
    return this.provisions.settlePastConsumptionAll();
  }
}
