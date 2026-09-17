-- CreateEnum
CREATE TYPE "public"."MealSlot" AS ENUM ('BREAKFAST', 'LUNCH', 'SNACK', 'DINNER');

-- CreateEnum
CREATE TYPE "public"."NutrientGoalMode" AS ENUM ('AT_LEAST', 'AT_MOST', 'TARGET', 'NONE');

-- CreateEnum
CREATE TYPE "public"."QuantityUnit" AS ENUM ('G', 'KG', 'ML', 'CL', 'L', 'TSP', 'TBSP', 'PIECE', 'PINCH', 'SLICE', 'SACHET', 'JAR', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."NutrientValueKind" AS ENUM ('VALUE', 'TRACES', 'LESS_THAN', 'ABSENT', 'NA');

-- CreateEnum
CREATE TYPE "public"."RecipeStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "public"."UxCategory" AS ENUM ('VEGETABLES', 'FRUITS', 'STARCHES', 'CEREALS', 'LEGUMES', 'MEATS', 'FISH', 'SEAFOOD', 'CHARCUTERIE', 'EGGS', 'CHEESES', 'DAIRY', 'FATS', 'NUTS_SEEDS', 'SPICES', 'AROMATICS', 'SAUCES', 'CONDIMENTS', 'PREPARATIONS', 'BAKERY', 'PASTRY', 'SUGARS', 'BEVERAGES', 'VEGETARIAN_PRODUCTS', 'PROCESSED', 'OTHER');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleSub" TEXT,
    "passwordChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ingredient" (
    "id" TEXT NOT NULL,
    "ciqualCode" INTEGER NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "subGroupName" TEXT,
    "subSubGroupName" TEXT,
    "uxCategory" "public"."UxCategory" NOT NULL,
    "uxSubCategory" TEXT NOT NULL,
    "energyKcalKind" "public"."NutrientValueKind" NOT NULL,
    "energyKcal" DECIMAL(12,4),
    "proteinKind" "public"."NutrientValueKind" NOT NULL,
    "proteinG" DECIMAL(12,4),
    "carbKind" "public"."NutrientValueKind" NOT NULL,
    "carbG" DECIMAL(12,4),
    "fatKind" "public"."NutrientValueKind" NOT NULL,
    "fatG" DECIMAL(12,4),
    "fiberKind" "public"."NutrientValueKind" NOT NULL,
    "fiberG" DECIMAL(12,4),
    "sugarKind" "public"."NutrientValueKind" NOT NULL,
    "sugarG" DECIMAL(12,4),
    "saltKind" "public"."NutrientValueKind" NOT NULL,
    "saltG" DECIMAL(12,4),
    "source" TEXT NOT NULL DEFAULT 'Ciqual',
    "sourceVersion" TEXT NOT NULL DEFAULT '2025',
    "sourceDate" TIMESTAMP(3) NOT NULL,
    "iconSlug" TEXT,
    "iconUrl" TEXT,
    "iconSource" TEXT,
    "iconAttribution" TEXT,
    "dedicatedIcon" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IngredientConversion" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "unit" "public"."QuantityUnit" NOT NULL,
    "gramsPerUnit" DECIMAL(12,4) NOT NULL,
    "source" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngredientConversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Recipe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."RecipeStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT NOT NULL,
    "servings" DECIMAL(8,2) NOT NULL,
    "prepTimeMinutes" INTEGER,
    "cookTimeMinutes" INTEGER,
    "photoUrl" TEXT,
    "finalCookedWeight" DECIMAL(12,4),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit" "public"."QuantityUnit" NOT NULL,
    "grams" DECIMAL(12,4),
    "gramsManual" BOOLEAN NOT NULL DEFAULT false,
    "displayQuantity" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "estimated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecipeStep" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "durationMinutes" INTEGER,

    CONSTRAINT "RecipeStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecipeTag" (
    "recipeId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "RecipeTag_pkey" PRIMARY KEY ("recipeId","tagId")
);

-- CreateTable
CREATE TABLE "public"."Equipment" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "iconSlug" TEXT,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecipeEquipment" (
    "recipeId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,

    CONSTRAINT "RecipeEquipment_pkey" PRIMARY KEY ("recipeId","equipmentId")
);

-- CreateTable
CREATE TABLE "public"."RecipeRating" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MealItem" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "slot" "public"."MealSlot" NOT NULL,
    "recipeId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MealParticipantPortion" (
    "id" TEXT NOT NULL,
    "mealItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "portions" DECIMAL(8,3) NOT NULL,

    CONSTRAINT "MealParticipantPortion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NutritionGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caloriesMode" "public"."NutrientGoalMode" NOT NULL DEFAULT 'NONE',
    "caloriesValue" DECIMAL(10,2),
    "caloriesTolerance" DECIMAL(10,2),
    "proteinMode" "public"."NutrientGoalMode" NOT NULL DEFAULT 'NONE',
    "proteinValue" DECIMAL(10,2),
    "proteinTolerance" DECIMAL(10,2),
    "carbsMode" "public"."NutrientGoalMode" NOT NULL DEFAULT 'NONE',
    "carbsValue" DECIMAL(10,2),
    "carbsTolerance" DECIMAL(10,2),
    "fatMode" "public"."NutrientGoalMode" NOT NULL DEFAULT 'NONE',
    "fatValue" DECIMAL(10,2),
    "fatTolerance" DECIMAL(10,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DailyNutritionGoalOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "caloriesMode" "public"."NutrientGoalMode" NOT NULL,
    "caloriesValue" DECIMAL(10,2),
    "caloriesTolerance" DECIMAL(10,2),
    "proteinMode" "public"."NutrientGoalMode" NOT NULL,
    "proteinValue" DECIMAL(10,2),
    "proteinTolerance" DECIMAL(10,2),
    "carbsMode" "public"."NutrientGoalMode" NOT NULL,
    "carbsValue" DECIMAL(10,2),
    "carbsTolerance" DECIMAL(10,2),
    "fatMode" "public"."NutrientGoalMode" NOT NULL,
    "fatValue" DECIMAL(10,2),
    "fatTolerance" DECIMAL(10,2),

    CONSTRAINT "DailyNutritionGoalOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OptimizationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "allowAutoAdd" BOOLEAN NOT NULL DEFAULT true,
    "minPortionMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 0.5,
    "maxPortionMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 2.0,

    CONSTRAINT "OptimizationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserIngredientFavorite" (
    "userId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserIngredientFavorite_pkey" PRIMARY KEY ("userId","ingredientId")
);

-- CreateTable
CREATE TABLE "public"."UserIngredientRecent" (
    "userId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserIngredientRecent_pkey" PRIMARY KEY ("userId","ingredientId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "public"."User"("googleSub");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "public"."Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE INDEX "Session_familyId_idx" ON "public"."Session"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_ciqualCode_key" ON "public"."Ingredient"("ciqualCode");

-- CreateIndex
CREATE INDEX "Ingredient_nameNormalized_idx" ON "public"."Ingredient"("nameNormalized");

-- CreateIndex
CREATE INDEX "Ingredient_uxCategory_idx" ON "public"."Ingredient"("uxCategory");

-- CreateIndex
CREATE INDEX "Ingredient_nameFr_idx" ON "public"."Ingredient"("nameFr");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientConversion_ingredientId_unit_key" ON "public"."IngredientConversion"("ingredientId", "unit");

-- CreateIndex
CREATE INDEX "Recipe_name_idx" ON "public"."Recipe"("name");

-- CreateIndex
CREATE INDEX "Recipe_authorId_idx" ON "public"."Recipe"("authorId");

-- CreateIndex
CREATE INDEX "Recipe_updatedAt_idx" ON "public"."Recipe"("updatedAt");

-- CreateIndex
CREATE INDEX "Recipe_status_idx" ON "public"."Recipe"("status");

-- CreateIndex
CREATE INDEX "RecipeIngredient_recipeId_idx" ON "public"."RecipeIngredient"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeStep_recipeId_idx" ON "public"."RecipeStep"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "public"."Tag"("slug");

-- CreateIndex
CREATE INDEX "RecipeTag_tagId_idx" ON "public"."RecipeTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_slug_key" ON "public"."Equipment"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeRating_recipeId_userId_key" ON "public"."RecipeRating"("recipeId", "userId");

-- CreateIndex
CREATE INDEX "MealItem_date_slot_idx" ON "public"."MealItem"("date", "slot");

-- CreateIndex
CREATE INDEX "MealItem_recipeId_idx" ON "public"."MealItem"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "MealParticipantPortion_mealItemId_userId_key" ON "public"."MealParticipantPortion"("mealItemId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionGoal_userId_key" ON "public"."NutritionGoal"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyNutritionGoalOverride_userId_date_key" ON "public"."DailyNutritionGoalOverride"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationPreference_userId_key" ON "public"."OptimizationPreference"("userId");

-- CreateIndex
CREATE INDEX "UserIngredientRecent_userId_usedAt_idx" ON "public"."UserIngredientRecent"("userId", "usedAt");

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IngredientConversion" ADD CONSTRAINT "IngredientConversion_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "public"."Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Recipe" ADD CONSTRAINT "Recipe_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "public"."Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecipeStep" ADD CONSTRAINT "RecipeStep_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecipeTag" ADD CONSTRAINT "RecipeTag_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecipeTag" ADD CONSTRAINT "RecipeTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecipeEquipment" ADD CONSTRAINT "RecipeEquipment_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecipeEquipment" ADD CONSTRAINT "RecipeEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "public"."Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecipeRating" ADD CONSTRAINT "RecipeRating_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecipeRating" ADD CONSTRAINT "RecipeRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MealItem" ADD CONSTRAINT "MealItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MealItem" ADD CONSTRAINT "MealItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MealParticipantPortion" ADD CONSTRAINT "MealParticipantPortion_mealItemId_fkey" FOREIGN KEY ("mealItemId") REFERENCES "public"."MealItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MealParticipantPortion" ADD CONSTRAINT "MealParticipantPortion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NutritionGoal" ADD CONSTRAINT "NutritionGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyNutritionGoalOverride" ADD CONSTRAINT "DailyNutritionGoalOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OptimizationPreference" ADD CONSTRAINT "OptimizationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserIngredientFavorite" ADD CONSTRAINT "UserIngredientFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserIngredientFavorite" ADD CONSTRAINT "UserIngredientFavorite_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "public"."Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserIngredientRecent" ADD CONSTRAINT "UserIngredientRecent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserIngredientRecent" ADD CONSTRAINT "UserIngredientRecent_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "public"."Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
