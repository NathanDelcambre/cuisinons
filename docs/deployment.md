# Déploiement (offres gratuites uniquement)

Ne jamais passer sur un plan payant.

## Neon PostgreSQL Free

Projet lié : `frosty-lab-38361236` (branche `production`, région `aws-eu-west-2`). Compte CLI : `nathandelcambre`.

Le dépôt contient `.neon` + `neon.ts` (`defineConfig({})` — Postgres seulement, pas Better Auth). Les URLs de prod sont dans `.env.production.local` (gitignored). Le `.env` local reste sur Docker `localhost:55432`.

Déjà fait : `prisma migrate deploy`, seed, import Ciqual 2025 (3483 aliments), `auth:bootstrap`.

Pour Vercel API, coller `DATABASE_URL` (pooled, host `-pooler`) et `DIRECT_URL` (direct) depuis `neon connection-string production --pooled` / sans `--pooled`.

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

## Actions manuelles restantes

Neon est prêt. CLI Vercel non authentifiée, Google OAuth sans identifiants. Ne pas inventer de secrets.

1. **GitHub** — dépôt privé [https://github.com/NathanDelcambre/cuisinons](https://github.com/NathanDelcambre/cuisinons).
2. **Vercel — deux projets gratuits**
   - Web : racine `apps/web`, framework Next.js.
   - API : racine `apps/api`, entrée `api/index.ts`.
3. **Variables** — coller celles listées ci-dessus. Pour l’API : `DATABASE_URL` pooled Neon + `DIRECT_URL` directe.
4. **Google Cloud** — OAuth Web, origines et callbacks ci-dessus.
5. **E2E local** — `pnpm test:e2e` avec `E2E_NATHAN_PASSWORD` dans `apps/web/.env.local`.
