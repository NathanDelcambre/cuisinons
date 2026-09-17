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

## Données

PostgreSQL (Docker en local, Neon Free en production). Prisma + migrations versionnées. Pas de `db push` en production.
