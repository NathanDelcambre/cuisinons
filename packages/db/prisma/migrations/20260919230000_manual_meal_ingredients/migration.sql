CREATE TABLE "MealItemIngredient" (
    "id" TEXT NOT NULL,
    "mealItemId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit" "QuantityUnit" NOT NULL,
    "grams" DECIMAL(12,4),
    "sortOrder" INTEGER NOT NULL,
    CONSTRAINT "MealItemIngredient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MealItemIngredient_mealItemId_sortOrder_idx" ON "MealItemIngredient"("mealItemId", "sortOrder");
CREATE INDEX "MealItemIngredient_ingredientId_idx" ON "MealItemIngredient"("ingredientId");
ALTER TABLE "MealItemIngredient" ADD CONSTRAINT "MealItemIngredient_mealItemId_fkey" FOREIGN KEY ("mealItemId") REFERENCES "MealItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealItemIngredient" ADD CONSTRAINT "MealItemIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
