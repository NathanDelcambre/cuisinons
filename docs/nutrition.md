# Nutrition

Source officielle : table Ciqual 2025 (Anses), DOI 10.57745/RDMHWY, licence etalab 2.0. Environ 3 484 aliments.

Les fiches indiquent **pour combien de personnes** elles sont prévues. Les quantités d’ingrédients sont celles du plat entier. Les macros affichées sont **pour 1 personne** : total de la recette ÷ nombre de convives.

Assiette type d’une personne (catalogue officiel et suggestions) :

- viande / poisson : 100–150 g (130 g par défaut)
- légumes : un peu plus, ~150–200 g
- féculent : ~90–100 g (cru / sec) ou 200 g de pomme de terre
- légumineuses cuites : ~140 g

## Valeurs spéciales

Une donnée Ciqual n’est jamais transformée silencieusement en 0.

- nombre → `VALUE`
- `traces` → `TRACES`
- `< x` → `LESS_THAN`
- `-` / vide / N.A. → `NA`

Seul `VALUE` entre dans le calcul des macros. Les autres lignes rendent la recette **incomplète**.

## Formules

Pour une ligne de masse `g` :

`macro = macroPour100g * g / 100`

Total recette = somme des lignes calculables.

Par portion = total / N.

Pour 100 g = total / poids × 100.

Le poids par défaut est la somme des ingrédients (cru estimé). `finalCookedWeight` peut affiner le /100 g plus tard.

Les unités non métriques passent par `IngredientConversion`. Sinon l’UI demande les grammes équivalents.
