# Déploiement (offres gratuites uniquement)

Ne jamais passer sur un plan payant.

## Neon PostgreSQL Free

1. Créer un projet Neon Free.
2. Copier l’URL pooled (`DATABASE_URL`) et l’URL directe (`DIRECT_URL`).
3. `pnpm db:migrate:deploy` avec `DATABASE_URL` de production.
4. `pnpm db:import-ciqual` une fois (pas à chaque boot).
5. `pnpm auth:bootstrap` pour poser les mots de passe (jamais dans Git).

## Vercel — web (Next.js)

Racine du projet : `apps/web` (monorepo, framework Next).

Variables :

- `DATABASE_URL` n’est **pas** nécessaire au web
- `AUTH_SECRET` (≥ 32)
- `INTERNAL_API_SECRET` (≥ 32, identique à l’API)
- `API_BASE_URL` = URL du projet API Vercel (https)
- `NEXT_PUBLIC_APP_URL` = URL du projet web
- `AUTH_COOKIE_SECURE=true`
- `AUTH_COOKIE_NAME_SESSION=cuisinons_session` (préfixé `__Host-` automatiquement)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

## Vercel — API (NestJS)

Racine : `apps/api`. Entrée serverless : `api/index.ts`.

Variables : `DATABASE_URL`, `PASSWORD_PEPPER`, `AUTH_SECRET`, `INTERNAL_API_SECRET`, `WEB_ORIGIN` (URL web https), `APP_ENV=production`.

## Google OAuth

- Origine JS autorisée : `https://<web>.vercel.app` et `http://localhost:3000`
- Redirect : `http://localhost:3000/api/auth/google/callback`
- Redirect prod : `https://<web>.vercel.app/api/auth/google/callback`

## Migrations

Toujours `prisma migrate deploy`. Jamais `prisma db push` en production.
