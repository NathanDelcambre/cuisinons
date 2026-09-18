-- CreateEnum
CREATE TYPE "RecipeSource" AS ENUM ('USER', 'CATALOG');

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "source" "RecipeSource" NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE INDEX "Recipe_source_idx" ON "Recipe"("source");

-- Recettes maison déjà semées (id stables official-* et seed-*).
UPDATE "Recipe" SET "source" = 'CATALOG' WHERE "id" LIKE 'official-%' OR "id" LIKE 'seed-%';
