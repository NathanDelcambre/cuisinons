import { Module } from '@nestjs/common';
import { PlannerModule } from '../planner/planner.module.js';
import { OptimizationController } from './optimization.controller.js';
import { OptimizationService } from './optimization.service.js';

@Module({
  imports: [PlannerModule],
  controllers: [OptimizationController],
  providers: [OptimizationService],
})
export class OptimizationModule {}
