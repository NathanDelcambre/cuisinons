WITH observed AS (
  SELECT
    ri."ingredientId",
    percentile_cont(0.5) WITHIN GROUP (ORDER BY (ri.grams / ri.quantity)) AS "gramsPerUnit"
  FROM "RecipeIngredient" ri
  JOIN "Ingredient" i ON i.id = ri."ingredientId"
  WHERE i."uxCategory" IN ('FRUITS', 'VEGETABLES')
    AND ri.unit = 'PIECE'
    AND ri.quantity > 0
    AND ri.grams > 0
  GROUP BY ri."ingredientId"
)
INSERT INTO "IngredientConversion"
  (id, "ingredientId", unit, "gramsPerUnit", source, confidence, "createdAt")
SELECT
  'piece-' || md5("ingredientId"),
  "ingredientId",
  'PIECE'::"QuantityUnit",
  "gramsPerUnit",
  'Recettes healthy sourcées du catalogue',
  'estimated',
  CURRENT_TIMESTAMP
FROM observed
ON CONFLICT ("ingredientId", unit) DO UPDATE
SET "gramsPerUnit" = EXCLUDED."gramsPerUnit",
    source = EXCLUDED.source,
    confidence = EXCLUDED.confidence;
