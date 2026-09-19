CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE "OpenFoodProduct" (
  "barcode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "searchText" TEXT NOT NULL,
  "brand" TEXT,
  "imageUrl" TEXT,
  "packageQuantity" DECIMAL(12,4),
  "packageUnit" TEXT,
  "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "nutriScore" TEXT,
  "novaGroup" INTEGER,
  "popularity" INTEGER NOT NULL DEFAULT 0,
  "isStaple" BOOLEAN NOT NULL DEFAULT false,
  "sourceUpdatedAt" TIMESTAMP(3),
  "importBatchId" TEXT NOT NULL,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpenFoodProduct_pkey" PRIMARY KEY ("barcode")
);

CREATE TABLE "OpenFoodPrice" (
  "id" TEXT NOT NULL,
  "productBarcode" TEXT NOT NULL,
  "retailer" "Retailer" NOT NULL,
  "locationId" INTEGER NOT NULL,
  "storeName" TEXT,
  "price" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "observedAt" DATE NOT NULL,
  "importBatchId" TEXT NOT NULL,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpenFoodPrice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpenFoodImport" (
  "id" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "productCount" INTEGER NOT NULL DEFAULT 0,
  "priceCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "error" TEXT,
  CONSTRAINT "OpenFoodImport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OpenFoodProduct_normalizedName_idx" ON "OpenFoodProduct"("normalizedName");
CREATE INDEX "OpenFoodProduct_staple_popularity_idx" ON "OpenFoodProduct"("isStaple", "popularity" DESC);
CREATE INDEX "OpenFoodProduct_importBatchId_idx" ON "OpenFoodProduct"("importBatchId");
CREATE INDEX "OpenFoodProduct_searchText_trgm_idx" ON "OpenFoodProduct" USING GIN ("searchText" gin_trgm_ops);
CREATE UNIQUE INDEX "OpenFoodPrice_productBarcode_retailer_key" ON "OpenFoodPrice"("productBarcode", "retailer");
CREATE INDEX "OpenFoodPrice_retailer_productBarcode_idx" ON "OpenFoodPrice"("retailer", "productBarcode");
CREATE INDEX "OpenFoodPrice_importBatchId_idx" ON "OpenFoodPrice"("importBatchId");

ALTER TABLE "OpenFoodPrice"
  ADD CONSTRAINT "OpenFoodPrice_productBarcode_fkey"
  FOREIGN KEY ("productBarcode") REFERENCES "OpenFoodProduct"("barcode")
  ON DELETE CASCADE ON UPDATE CASCADE;
