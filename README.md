# Cuisinons

Application privée de recettes, planning et nutrition pour Nathan et Jade.

![Cuisinons](docs/screenshots/placeholder.md)

## Stack

Next.js (BFF) · NestJS · PostgreSQL / Prisma · Neon · Vercel · Ciqual 2025

## Installation

```bash
pnpm install
cp .env.example .env
docker compose up -d
# PostgreSQL écoute sur le port 55432 (évite les Postgres déjà présents sur 5432)

pnpm db:migrate
pnpm db:seed
pnpm db:import-ciqual
pnpm auth:bootstrap
pnpm dev
```

Web : http://localhost:3000  
API : http://localhost:4000 (`/health`, `/docs` en dev)

## Scripts

| Script | Rôle |
| --- | --- |
| `pnpm dev` | Next + Nest |
| `pnpm db:up` | PostgreSQL Docker |
| `pnpm db:migrate` | migrations |
| `pnpm db:seed` | tags, équipements, recettes démo |
| `pnpm db:import-ciqual` | table Ciqual 2025 |
| `pnpm auth:bootstrap` | mots de passe des 2 comptes |
| `pnpm test` / `pnpm test:e2e` | tests |
| `pnpm lint` `pnpm typecheck` `pnpm build` | qualité |

Les mots de passe de production ne sont jamais dans Git.

## Google OAuth

Voir [docs/deployment.md](docs/deployment.md).

## Sécurité

Voir [docs/security.md](docs/security.md). Cookies HttpOnly, CSRF, whitelist serveur, pas de token dans `localStorage`.

## Limitations connues

- L’optimiseur ne parle à aucun LLM.
- Les illustrations dédiées couvrent les aliments courants ; le reste utilise un fallback de catégorie.
- Le throttle login est en mémoire (instance serverless).
- Compte GitHub `gh` actuel : Hexachip — le dépôt `nathan.delcambre/cuisinons` doit être créé/poussé avec le bon compte.
