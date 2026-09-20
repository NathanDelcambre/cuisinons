ALTER TABLE "OpenFoodProduct"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "PantryItem"
DROP CONSTRAINT IF EXISTS "PantryItem_userId_ingredientId_unit_key";

-- Les anciennes réserves SIQUAL sont reliées à un produit officiel compatible.
-- Ce bloc ne concerne que la transition : toutes les nouvelles lignes sont créées
-- directement depuis un code-barres OpenFoodFacts.
UPDATE "PantryItem" pantry
SET "productBarcode" = (
  SELECT product.barcode
  FROM "OpenFoodProduct" product
  JOIN "Ingredient" ingredient ON ingredient.id = pantry."ingredientId"
  WHERE product."packageUnit" = pantry.unit::text
    AND product."searchText" ~ (
      '(^| )' || split_part(ingredient."nameNormalized", ' ', 1) || '( |$)'
    )
  ORDER BY
    (product."normalizedName" = split_part(ingredient."nameNormalized", ' ', 1)) DESC,
    (product."normalizedName" ~ ('^' || split_part(ingredient."nameNormalized", ' ', 1) || '( |$)')) DESC,
    length(product."normalizedName"),
    product."isStaple" DESC,
    product.popularity DESC,
    length(product.name)
  LIMIT 1
)
WHERE pantry."productBarcode" IS NULL;

-- Plusieurs anciennes lignes SIQUAL peuvent converger vers le même produit.
WITH duplicates AS (
  SELECT id,
         first_value(id) OVER (
           PARTITION BY "userId", "productBarcode" ORDER BY "createdAt", id
         ) AS keeper
  FROM "PantryItem"
), totals AS (
  SELECT d.keeper, SUM(p.quantity) AS quantity
  FROM duplicates d
  JOIN "PantryItem" p ON p.id = d.id
  GROUP BY d.keeper
)
UPDATE "PantryItem" p
SET quantity = totals.quantity
FROM totals
WHERE p.id = totals.keeper;

WITH duplicates AS (
  SELECT id,
         first_value(id) OVER (
           PARTITION BY "userId", "productBarcode" ORDER BY "createdAt", id
         ) AS keeper
  FROM "PantryItem"
)
DELETE FROM "PantryItem" p
USING duplicates d
WHERE p.id = d.id AND d.id <> d.keeper;

ALTER TABLE "PantryItem"
ALTER COLUMN "productBarcode" SET NOT NULL,
DROP COLUMN "productName",
DROP COLUMN "productBrand",
DROP COLUMN "productImageUrl",
DROP COLUMN "dataSource";

ALTER TABLE "PantryItem"
ADD CONSTRAINT "PantryItem_productBarcode_fkey"
FOREIGN KEY ("productBarcode") REFERENCES "OpenFoodProduct"("barcode")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "PantryItem_userId_productBarcode_key"
ON "PantryItem"("userId", "productBarcode");

CREATE INDEX "PantryItem_userId_ingredientId_unit_idx"
ON "PantryItem"("userId", "ingredientId", "unit");

CREATE TABLE "PantryConsumption" (
  "id" TEXT NOT NULL,
  "portionId" TEXT NOT NULL,
  "productBarcode" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL,
  "area" "StorageArea" NOT NULL,
  "quantity" DECIMAL(12,4) NOT NULL,
  "unit" "QuantityUnit" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PantryConsumption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PantryConsumption_portionId_productBarcode_key"
ON "PantryConsumption"("portionId", "productBarcode");
CREATE INDEX "PantryConsumption_portionId_idx"
ON "PantryConsumption"("portionId");

ALTER TABLE "PantryConsumption"
ADD CONSTRAINT "PantryConsumption_portionId_fkey"
FOREIGN KEY ("portionId") REFERENCES "MealParticipantPortion"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PantryConsumption"
ADD CONSTRAINT "PantryConsumption_productBarcode_fkey"
FOREIGN KEY ("productBarcode") REFERENCES "OpenFoodProduct"("barcode")
ON DELETE RESTRICT ON UPDATE CASCADE;
