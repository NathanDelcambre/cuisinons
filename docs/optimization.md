# Optimiseur

Algorithme déterministe, local, sans LLM.

## Entrées

Repas du jour, portions de l’utilisateur, créneaux vides, recettes publiées à macros complètes, objectifs, min/max de portions (défaut 0,5×–2×), autorisation d’ajout automatique.

## Pénalités

- `AT_LEAST` : `(objectif - valeur)²` si en dessous
- `AT_MOST` : `(valeur - plafond)²` si au-dessus
- `TARGET` : distance au-delà de la tolérance (défaut 8 %)
- `NONE` : 0

Poids : protéines et lipides plus élevés que glucides et calories, pour éviter d’exploser un plafond en chassant les protéines.

## Étape 1

Descente coordonnée : on parcourt les repas par id croissant, on teste des multiplicateurs discrets (pas 0,05) et on retient le premier voisin qui réduit le plus la pénalité. On répète jusqu’à stabilité.

## Étape 2

Si un créneau est vide et que l’ajout auto est autorisé, on essaie les recettes dont les tags correspondent au moment (petit-déjeuner, goûter/dessert, plat principal). On ajoute au plus une recette par créneau, uniquement si la pénalité baisse.

## Sortie

Avant / après, changements de portions, ajouts proposés, résumé, écarts restants. Rien n’est écrit tant que l’utilisateur n’applique pas. L’application est transactionnelle.
