# Architecture

Cuisinons est un monorepo PNPM privé pour deux utilisateurs.

## Applications

- `apps/web` : Next.js App Router. UI + BFF same-origin.
- `apps/api` : NestJS. Métier, Prisma, auth interne.

## Packages

- `packages/shared` : whitelist e-mails, mots de passe, macros, fractions, conversions, mapping Ciqual, optimiseur.
- `packages/db` : schéma Prisma, migrations, seed, import Ciqual, bootstrap mots de passe.
- `packages/ui` : primitives glass.
- `packages/config` : tsconfig de base.

## Flux

Le navigateur ne parle qu’à Next.js. Les cookies de session restent sur l’origine web. Next signe un JWT interne court (`userId`, `email`, `iss=cuisinons-web`, `aud=cuisinons-api`) et l’envoie à Nest. Nest refuse toute identité navigateur. Seul `GET /health` est public.

## Données

PostgreSQL (Docker en local, Neon Free en production). Prisma + migrations versionnées. Pas de `db push` en production.
