import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health/health.controller.js';
import { IngredientsModule } from './ingredients/ingredients.module.js';
import { RecipesModule } from './recipes/recipes.module.js';
import { PlannerModule } from './planner/planner.module.js';
import { NutritionModule } from './nutrition/nutrition.module.js';
import { OptimizationModule } from './optimization/optimization.module.js';
import { CatalogModule } from './catalog/catalog.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 80 }] }),
    PrismaModule,
    AuthModule,
    IngredientsModule,
    RecipesModule,
    PlannerModule,
    NutritionModule,
    OptimizationModule,
    CatalogModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
