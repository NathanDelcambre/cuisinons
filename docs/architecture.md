# Architecture

Cuisinons est un monorepo PNPM privé pour deux utilisateurs.

## Applications

- `apps/web` : Next.js App Router. UI + BFF same-origin.
- `apps/api` : NestJS. Métier, Prisma, auth interne.

## Packages

- `packages/shared` : whitelist e-mails, mots de passe, macros, fractions, conversions, mapping Ciqual, optimiseur.
- `packages/db` : schéma Prisma, migrations, seed, import Ciqual, bootstrap mots de passe.
- `packages/ui` : design system (voir plus bas).
- `packages/config` : tsconfig de base.

## Design system

Les jetons vivent dans `apps/web/src/app/globals.css`, sous `@theme` : rampe de
neutres chauds `ink-*`, accents `sage-*`, `peach-*`, `tomato-*`, rayons, ombres à
deux couches et courbes d’animation (`ease-out-soft`, `ease-spring`). Les écrans
n’utilisent plus `stone-*` ni de valeur arbitraire : tout passe par ces jetons.

Les composants sont dans `packages/ui/src`, un fichier par famille, réexportés
par `index.tsx` : `Button`/`IconButton`/`buttonClasses`, surfaces (`Card`,
`Panel`, `Inset`), formulaires (`Field`, `Input`, `Select`, `Textarea`,
`Stepper`, `Switch`, `Segmented`, `Chip`), et le reste (`Modal`, `Meter`,
`Badge`, `NavRow`, `PageHeader`, `EmptyState`, `Skeleton`).

Deux points non évidents :

1. **`globals.css` déclare `@source '../../../../packages/ui/src'`.** Tailwind v4
   ne scanne que le dossier de l’application : sans cette ligne, une classe
   présente uniquement dans le design system ne serait jamais générée, et le
   composant s’afficherait sans style en production.
2. **`cn()` repose sur `tailwind-merge`.** Chaque composant accepte `className`
   pour un ajustement ponctuel ; sans fusion, la classe de l’appelant et celle du
   composant coexisteraient et le gagnant dépendrait de l’ordre de la feuille de
   style.

Les animations d’entrée de page sont en CSS (`animate-rise`), pas en JavaScript :
un état initial `opacity: 0` posé par Motion est rendu tel quel côté serveur,
donc la page resterait invisible tant que l’hydratation n’a pas eu lieu. Motion
est réservé à ce qui exige de connaître la position réelle des éléments :
pastille active de la navigation, dépliage des sous-menus, feuille modale.

## Flux

Le navigateur ne parle qu’à Next.js. Les cookies de session restent sur l’origine web. Next signe un JWT interne court (`userId`, `email`, `iss=cuisinons-web`, `aud=cuisinons-api`) et l’envoie à Nest. Nest refuse toute identité navigateur. Seul `GET /health` est public.

## Courses et réserves

Deux écrans (`/shopping`, `/pantry`), un module Nest (`provisions`) et la logique
de quantités dans `packages/shared/src/provisions`. **Tout y est personnel à un
compte** : chacun a ses réserves et sa liste, jamais en commun.

La génération part du planning : pour chaque repas de la période, on calcule le
besoin du convive (`grams` de la ligne de recette, au prorata de ses portions),
on cumule, puis on retire ce qu’il a déjà en stock. Les repas déjà consommés sont
ignorés, sinon on rachèterait ce qui a servi. Trois périodes possibles : la
semaine, des jours cochés à la main, ou les N prochains jours.

Quatre décisions à connaître :

1. **L’unité fait partie de la clé** des lignes de stock et de courses. On
   ramène les masses au gramme et les volumes au millilitre (`canonicalQuantity`),
   mais « 2 pièces » et « 100 g » d’un même ingrédient restent deux lignes :
   les fondre exigerait une équivalence que nous n’avons pas.
2. **Une ligne dont la quantité a été fixée à la main passe en `MANUAL`, et la
   régénération n’y touche plus.** Sans cette règle, le besoin du planning
   s’ajouterait à chaque génération et l’article grossirait tout seul.
3. **`consumedAt` sur la portion rend la déduction idempotente** et réversible :
   marquer un repas consommé retire ses ingrédients du stock, annuler les
   recrédite. Le stock ne descend jamais sous zéro. Un manque n’est pas affiché :
   on déduit ce qu’on a. Les jours passés sont réglés par un **cron Vercel**
   (`GET /api/cron/settle-past`, 00:10 UTC), pas à l’ouverture du planning.
4. **Les zones de rangement ne se devinent qu’à moitié.** `defaultStorageArea`
   place au frigo ou au placard d’après la catégorie Ciqual, mais
   « Congélateur » et « Petit déjeuner » sont des habitudes personnelles, pas des
   propriétés de l’aliment : ils restent un choix explicite.

L’état du stock par zone est affiché en permanence sous « Réserves » dans la
barre latérale. Ce n’est pas un sous-menu mais un panneau d’information, et les
requêtes partagent les clés de cache des écrans (`['pantry']`, `['shopping']`) :
une modification faite sur la page des courses met la barre à jour sans requête
supplémentaire.

## Proposer un plat

Modale sur `/recettes?proposer=1`, module Nest `suggestions`, logique dans
`packages/shared/src/suggestions`. **Aucun LLM.** Une seule table `Recipe` :
les fiches maison (`source = CATALOG`) et celles que vous créez
(`source = USER`). Healthy, salade, poêlée… ce sont des **tags**, pas des
types à part.

On compose d’abord avec les recettes du catalogue (leurs ingrédients
deviennent des filtres sur le stock), puis avec les archétypes génériques
(poêlée, salade, soupe…) si rien ne matche. Un plat catalogue ne se propose
que si les noms d’ingrédients de la fiche recoupent une réserve — sinon on
retombe sur les archétypes. Rien n’est persisté tant que l’utilisateur n’a
pas validé (une composition générique crée alors une fiche `USER`).

Trois refus volontaires :

1. **Hors stock = hors proposition.** On ne complète pas avec un ingrédient à
   acheter. Si le frigo ne fait pas une assiette, on renvoie une pénurie, pas
   un plat creux.
2. **Une salade de courgette à 20 kcal n’est pas un plat.** En dessous d’environ
   90 kcal par portion (70 au petit-déjeuner), la suggestion est rejetée.
3. **Si les filtres (végétarien, 15 min, 3 ingrédients) ne passent pas**, on
   propose au plus une alternative obtenue en relâchant *une* contrainte, clairement
   étiquetée. On n’invente pas un deuxième moteur.

## Données

PostgreSQL (Docker en local, Neon Free en production). Prisma + migrations versionnées. Pas de `db push` en production.

Une recette est une ligne `Recipe`. `source = CATALOG` pour le fonds maison (semé), `USER` pour ce que vous créez. Healthy, type de plat, régime : des tags, pas d’autres tables.
