-- L'index unique (userId, ingredientId, unit) a été créé par CREATE UNIQUE INDEX.
-- Le DROP CONSTRAINT de 20260920150000_product_first_pantry ne retire pas un index,
-- donc deux produits du même aliment (brocoli vrac, puis un second) faisaient
-- échouer l'insert en 500.
DROP INDEX IF EXISTS "PantryItem_userId_ingredientId_unit_key";
