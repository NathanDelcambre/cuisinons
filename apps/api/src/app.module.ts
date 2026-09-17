import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { IngredientsModule } from './ingredients/ingredients.module';
import { RecipesModule } from './recipes/recipes.module';
import { PlannerModule } from './planner/planner.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { OptimizationModule } from './optimization/optimization.module';
import { CatalogModule } from './catalog/catalog.module';

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
