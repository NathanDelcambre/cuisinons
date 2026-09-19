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

Le cron Hobby (1× / jour, 00:10 UTC) appelle `GET /api/cron/settle-past` : déduction des repas des jours passés, sans ouvrir l’app et sans bandeau. Pas de secret à ajouter.

## Vercel — API (NestJS)

Racine : `apps/api`. Entrée serverless : `api/index.ts`. `vercel.json` réécrit `/(.*)` vers `/api`, et Nest route sur l’URL d’origine.

Trois contraintes structurelles, toutes déjà cassées une fois en production :

1. **`apps/api/api/` ne contient qu’`index.ts`.** Vercel crée une fonction par fichier de ce dossier : un import relatif d’une fonction vers une autre n’existe plus au runtime. Tout helper va dans `src/` — voir `src/config/load-env.ts`. Le test `tests/vercel-entry.test.ts` échoue si un fichier est ajouté.
2. **Preset framework = « Other »** (dans `vercel.json`, pas dans le dashboard). Le preset `nestjs` compile en plus `src/main.ts` en fonction `index`, or ce fichier appelle `app.listen()` : inexploitable en serverless. `src/main.ts` reste réservé au développement local.
3. **Tout import relatif du backend porte son extension `.js`.** Vercel ne bundle pas la fonction : il transpile chaque fichier séparément et livre l’arborescence, donc Node applique la résolution ESM stricte, qui n’ajoute aucune extension (`ERR_MODULE_NOT_FOUND`). `apps/api` et `packages/shared` sont en `moduleResolution: NodeNext` pour que le typecheck refuse un import sans extension. `packages/db` reste en CommonJS car le client Prisma généré l’est.

Variables : `DATABASE_URL`, `PASSWORD_PEPPER`, `AUTH_SECRET`, `INTERNAL_API_SECRET`, `WEB_ORIGIN` (URL web https), `APP_ENV=production` et `OPEN_FOOD_FACTS_USER_AGENT` au format `Cuisinons/0.1 (adresse-de-contact)`.

## Google OAuth

Le code construit le callback depuis `NEXT_PUBLIC_APP_URL` (`/api/auth/google/callback`).
Il n’y a pas de second callback hardcodé : c’est l’origine de l’env qui compte.

Dans Google Cloud Console (client OAuth Web), coller **exactement** :

Origines JavaScript autorisées :

- `http://localhost:3600`
- `https://<web>.vercel.app`
- `https://<TON_DOMAINE_CUSTOM>` — même origin que `NEXT_PUBLIC_APP_URL` une fois collé dans Vercel. Ne pas inventer le host : le coller depuis le DNS / Vercel.

URI de redirection autorisés :

- `http://localhost:3600/api/auth/google/callback`
- `https://<web>.vercel.app/api/auth/google/callback`
- `https://<TON_DOMAINE_CUSTOM>/api/auth/google/callback`

`NEXT_PUBLIC_APP_URL` (web) et `WEB_ORIGIN` (API) doivent matcher ce DNS HTTPS. Le cookie de session `__Host-` n’est envoyé qu’en HTTPS sur ce host (`AUTH_COOKIE_SECURE=true`). Sans l’origine + le redirect du domaine custom, OAuth casse en prod.

## Latence

Deux réglages non évidents, tous les deux responsables d’une production lente ou cassée.

1. **Les deux projets sont épinglés à `lhr1` (Londres) dans leur `vercel.json`.**
   Par défaut Vercel exécute les fonctions à `iad1` (Washington) alors que Neon
   est en `aws-eu-west-2` : chaque requête SQL traversait l’Atlantique, et une
   seule lecture du BFF en enchaîne plusieurs (résolution de session, puis le
   métier). Le plan Hobby n’autorise qu’une région, d’où Londres — au plus près
   de la base, que l’on interroge beaucoup plus souvent que le navigateur.
2. **Le BFF ne relaie jamais les en-têtes de transport de Nest.** `fetch`
   décompresse le corps mais conserve `content-encoding: gzip` : renvoyer la
   réponse telle quelle faisait échouer le navigateur en
   `ERR_CONTENT_DECODING_FAILED`, uniquement sur les réponses assez grosses pour
   que Vercel les compresse. `relay()` dans `lib/bff/proxy.ts` ne recopie que le
   type de contenu.

La base reste sur l’offre gratuite : elle se suspend après quelques minutes
d’inactivité, donc la première requête d’une session paie le réveil du compute.

## Migrations

Toujours `prisma migrate deploy`. Jamais `prisma db push` en production.

Séquence prod, depuis la racine, avec `DATABASE_URL` (et `DIRECT_URL` si besoin) pointé sur Neon :

```powershell
$env:DATABASE_URL = '<url pooled Neon>'
$env:DIRECT_URL = '<url directe Neon>'
$env:PASSWORD_PEPPER = '<pepper>'
pnpm --filter @cuisinons/db migrate:deploy
pnpm --filter @cuisinons/db import-ciqual
pnpm --filter @cuisinons/db seed
```

L’import Ciqual pose les 3483 aliments. Le seed est rejouable (upserts) : il publie le catalogue officiel (fiches `official-*` + photos `/recipes/{id}.png`) et relance `applyDedicatedIcons`, qui pointe `iconUrl` vers `/ingredients/{slug}.png`. Photos et pictos sont servis par le projet web Vercel (`apps/web/public/`). Sans cette séquence après un ajout d’assets, les anciennes URLs en base ne se mettent pas à jour — l’API sert toutefois `/recipes/{id}.png` pour toute fiche `official-*`.

Il ne recrée pas les comptes existants et ne touche pas aux repas déjà planifiés.

## Actions manuelles restantes

Neon est prêt. CLI Vercel non authentifiée, Google OAuth sans identifiants. Ne pas inventer de secrets.

1. **GitHub** — dépôt privé [https://github.com/NathanDelcambre/cuisinons](https://github.com/NathanDelcambre/cuisinons).
2. **Vercel — deux projets gratuits**
   - Web : racine `apps/web`, framework Next.js.
   - API : racine `apps/api`, entrée `api/index.ts`.
3. **Variables** — coller celles listées ci-dessus. Pour l’API : `DATABASE_URL` pooled Neon + `DIRECT_URL` directe.
4. **Google Cloud** — OAuth Web, origines et callbacks ci-dessus.
5. **E2E local** — `pnpm test:e2e` avec `E2E_NATHAN_PASSWORD` dans `apps/web/.env.local`.
