-- Open Food Facts becomes the primary purchasable-product source. Existing
-- Ciqual-backed rows remain valid and are explicitly treated as fallbacks.
CREATE TYPE "Retailer" AS ENUM ('LECLERC', 'U', 'CARREFOUR', 'AUCHAN', 'LIDL', 'INTERMARCHE');
CREATE TYPE "ProductDataSource" AS ENUM ('OPEN_FOOD_FACTS', 'CIQUAL_FALLBACK');

ALTER TABLE "PantryItem"
  ADD COLUMN "productBarcode" TEXT,
  ADD COLUMN "productName" TEXT,
  ADD COLUMN "productBrand" TEXT,
  ADD COLUMN "productImageUrl" TEXT,
  ADD COLUMN "dataSource" "ProductDataSource" NOT NULL DEFAULT 'CIQUAL_FALLBACK';

ALTER TABLE "ShoppingList"
  ADD COLUMN "retailer" "Retailer",
  ADD COLUMN "economical" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "ShoppingListItem"
  ADD COLUMN "neededQuantity" DECIMAL(12,4),
  ADD COLUMN "dataSource" "ProductDataSource" NOT NULL DEFAULT 'CIQUAL_FALLBACK',
  ADD COLUMN "productBarcode" TEXT,
  ADD COLUMN "productName" TEXT,
  ADD COLUMN "productBrand" TEXT,
  ADD COLUMN "productImageUrl" TEXT,
  ADD COLUMN "packageQuantity" DECIMAL(12,4),
  ADD COLUMN "packageCount" INTEGER,
  ADD COLUMN "estimatedPrice" DECIMAL(10,2),
  ADD COLUMN "currency" TEXT,
  ADD COLUMN "priceObservedAt" TIMESTAMP(3),
  ADD COLUMN "storeName" TEXT,
  ADD COLUMN "economyNote" TEXT;
