import { Module } from '@nestjs/common';
import { PlannerModule } from '../planner/planner.module';
import { NutritionController } from './nutrition.controller';

@Module({
  imports: [PlannerModule],
  controllers: [NutritionController],
})
export class NutritionModule {}
