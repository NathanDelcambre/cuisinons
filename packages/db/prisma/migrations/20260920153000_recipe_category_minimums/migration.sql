UPDATE "Recipe"
SET name = CASE id
  WHEN 'official-h130' THEN 'Bowl de riz, saumon et avocat'
  WHEN 'official-h146' THEN 'Gratin léger d’aubergine au yaourt'
  WHEN 'official-h149' THEN 'Gratin léger de courge et chèvre'
  ELSE name
END
WHERE id IN ('official-h130', 'official-h146', 'official-h149');

INSERT INTO "RecipeTag" ("recipeId", "tagId")
SELECT mapping."recipeId", tag.id
FROM (VALUES
  ('official-h130', 'riz'),
  ('official-h146', 'gratin'),
  ('official-h149', 'gratin')
) AS mapping("recipeId", slug)
JOIN "Tag" tag ON tag.slug = mapping.slug
JOIN "Recipe" recipe ON recipe.id = mapping."recipeId"
ON CONFLICT ("recipeId", "tagId") DO NOTHING;
