-- CreateEnum
CREATE TYPE "public"."StorageArea" AS ENUM ('FRIDGE', 'FREEZER', 'PANTRY', 'BREAKFAST', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ShoppingItemOrigin" AS ENUM ('PLANNER', 'MANUAL');

-- AlterTable
ALTER TABLE "public"."MealParticipantPortion" ADD COLUMN     "consumedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."PantryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "area" "public"."StorageArea" NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit" "public"."QuantityUnit" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PantryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShoppingList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromDate" DATE,
    "toDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ShoppingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShoppingListItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit" "public"."QuantityUnit" NOT NULL,
    "origin" "public"."ShoppingItemOrigin" NOT NULL DEFAULT 'PLANNER',
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoppingListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PantryItem_userId_area_idx" ON "public"."PantryItem"("userId", "area");

-- CreateIndex
CREATE UNIQUE INDEX "PantryItem_userId_ingredientId_unit_key" ON "public"."PantryItem"("userId", "ingredientId", "unit");

-- CreateIndex
CREATE INDEX "ShoppingList_userId_completedAt_idx" ON "public"."ShoppingList"("userId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingListItem_listId_ingredientId_unit_key" ON "public"."ShoppingListItem"("listId", "ingredientId", "unit");

-- CreateIndex
CREATE INDEX "MealParticipantPortion_userId_consumedAt_idx" ON "public"."MealParticipantPortion"("userId", "consumedAt");

-- AddForeignKey
ALTER TABLE "public"."PantryItem" ADD CONSTRAINT "PantryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PantryItem" ADD CONSTRAINT "PantryItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "public"."Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShoppingList" ADD CONSTRAINT "ShoppingList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShoppingListItem" ADD CONSTRAINT "ShoppingListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "public"."ShoppingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShoppingListItem" ADD CONSTRAINT "ShoppingListItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "public"."Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
