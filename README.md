# Shopiva

A monorepo starter for **Shopiva**, a multi-tenant storefront-builder SaaS.
Built with an npm-workspaces layout:

- **`apps/backend`** — Express.js + TypeScript + Drizzle ORM (PostgreSQL)
- **`apps/frontend`** — Next.js (App Router) + TypeScript + Tailwind CSS
- **`docker-compose.yml`** — PostgreSQL 16, Redis, backend, frontend

The data model is multi-tenant from day one: every catalog row is scoped to a
`stores` tenant. Today there is a single seeded store; the schema and the API
are ready to host many tenants without changes.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) **with the Compose plugin** (v2). That's all you need.
- (Optional) Node.js ≥ 20 + `make`, only if you want to run the apps outside Docker.

> This repo uses `docker compose` (the plugin). `make` is **not** required — the
> npm scripts are the primary entry point.

---

## Quick start (one command)

```bash
# 1. configure environment
cp .env.example .env

# 2. build + run the whole stack
npm start
```

That's it. Docker builds the backend and frontend images, starts PostgreSQL and
Redis, and on first boot the backend automatically:

1. `drizzle-kit migrate` — apply pending migrations (from `src/db/schema.ts`)
2. `seed` — create the default store + sample products
3. start the API

Open:
- **Frontend (storefront):** http://localhost:3000
- **Backend API:** http://localhost:4000
- **Health check:** http://localhost:4000/api/health
- **Products (JSON):** http://localhost:4000/api/products

Prefer detached mode? `npm run up` (then `npm run logs` / `npm run down`).

---

## Common commands

| Task                          | npm                          | make            |
| ----------------------------- | ---------------------------- | --------------- |
| Start the stack (foreground)  | `npm start`                  | `make dev`      |
| Start the stack (detached)    | `npm run up`                 | `make up`       |
| Stop the stack                | `npm run down`               | `make down`     |
| Tail logs                     | `npm run logs`               | `make logs`     |
| Rebuild images (no cache)     | `npm run rebuild`            | `make rebuild`  |
| Show containers               | `npm run ps`                 | `make ps`       |
| Sync Drizzle schema → DB      | `npm run db:push`            | `make db-push`  |
| Open Drizzle Studio (:3001)   | `npm run db:studio`          | `make db-studio`|
| **Delete everything (incl. data)** | _docker only_           | `make clean`    |

The backend also exposes per-app scripts (run inside the container or locally):
`dev`, `build`, `start`, `typecheck`, `db:push`, `db:generate`, `db:migrate`,
`db:studio`, `db:seed`.

---

## Project structure

```
shopiva/
├── apps/
│   ├── backend/                     # Express + TS + Drizzle ORM
│   │   ├── src/
│   │   │   ├── config/              # env, redis client
│   │   │   ├── db/                  # Drizzle client, schema, seed
│   │   │   │   ├── schema.ts        # multi-tenant data model
│   │   │   │   ├── index.ts         # drizzle(client, { schema })
│   │   │   │   └── seed.ts          # default store + sample products
│   │   │   ├── middlewares/         # tenant resolution, error handling
│   │   │   ├── routes/              # route definitions (thin)
│   │   │   ├── controllers/         # request/response orchestration
│   │   │   ├── services/            # data access (Drizzle queries)
│   │   │   ├── utils/               # ApiError, asyncHandler
│   │   │   ├── types/               # Express Request augmentation
│   │   │   ├── app.ts               # express app wiring
│   │   │   └── server.ts            # listen + graceful shutdown
│   │   ├── drizzle.config.ts        # drizzle-kit config (push/migrate/studio)
│   │   ├── Dockerfile
│   │   └── docker-entrypoint.sh     # db push + seed on boot
│   └── frontend/                    # Next.js App Router + Tailwind
│       ├── app/                     # layout.tsx, page.tsx, globals.css
│       ├── components/              # ProductCard, …
│       ├── lib/                     # api client, shared types
│       ├── next.config.mjs
│       ├── tailwind.config.ts
│       └── Dockerfile
├── docker-compose.yml
├── Makefile
├── package.json                     # npm workspaces + scripts
└── .env.example
```

---

## How multi-tenancy works

- The **`stores`** table (`apps/backend/src/db/schema.ts`) is the tenant. Every
  `users`, `categories`, and `products` row belongs to a store via `storeId`.
- The **tenant middleware** (`apps/backend/src/middlewares/tenantMiddleware.ts`)
  resolves the current store per request — from the `x-store-slug` header, or
  the configured default — and attaches it to `req.store`.
- The **services layer** always scopes queries by `req.store.id`, so a request
  for one tenant can never touch another tenant's data.

To add a second store later, create one (`POST` is straightforward to add), then
send its slug as the `x-store-slug` header; the rest works unchanged.

---

## Running apps locally (without Docker)

Install dependencies for the whole monorepo from the root:

```bash
npm install
```

You'll need PostgreSQL and Redis reachable at the URLs in
`apps/backend/.env.example` (copy it to `apps/backend/.env`). Then in two
terminals:

```bash
npm run dev -w @shopiva/backend     # http://localhost:4000
npm run dev -w @shopiva/frontend    # http://localhost:3000
```

Apply the schema and seed once:

```bash
npm run db:generate -w @shopiva/backend   # generate the initial migration
npm run db:migrate  -w @shopiva/backend   # apply it
npm run db:seed     -w @shopiva/backend
```

---

## Notes

- Migrations are the source of truth. Change the schema in `src/db/schema.ts`,
  then `npm run db:generate` (writes versioned SQL under `apps/backend/drizzle/`)
  and `npm run db:migrate` to apply it. The container entrypoint runs
  `drizzle-kit migrate` on boot, so committed migrations apply automatically.
  `npm run db:push` is available as a quick dev-only shortcut (it syncs the
  schema without creating migration files).
- Secrets in `.env.example` are placeholders — replace them before any real use.
