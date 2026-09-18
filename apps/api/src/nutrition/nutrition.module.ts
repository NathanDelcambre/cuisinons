import { Module } from '@nestjs/common';
import { PlannerModule } from '../planner/planner.module.js';
import { NutritionController } from './nutrition.controller.js';
import { NutritionService } from './nutrition.service.js';

@Module({
  imports: [PlannerModule],
  controllers: [NutritionController],
  providers: [NutritionService],
})
export class NutritionModule {}
