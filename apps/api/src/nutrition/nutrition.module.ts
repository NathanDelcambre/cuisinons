import { Module } from '@nestjs/common';
import { PlannerModule } from '../planner/planner.module.js';
import { NutritionController } from './nutrition.controller.js';

@Module({
  imports: [PlannerModule],
  controllers: [NutritionController],
})
export class NutritionModule {}
