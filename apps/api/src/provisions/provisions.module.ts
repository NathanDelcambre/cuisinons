import { Module } from '@nestjs/common';
import { ProvisionsController } from './provisions.controller.js';
import { ProvisionsJobsController } from './provisions-jobs.controller.js';
import { ProvisionsService } from './provisions.service.js';
import { OpenFoodFactsService } from './open-food-facts.service.js';

@Module({
  controllers: [ProvisionsController, ProvisionsJobsController],
  providers: [ProvisionsService, OpenFoodFactsService],
})
export class ProvisionsModule {}
