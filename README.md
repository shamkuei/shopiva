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
- **Register / create a store:** http://localhost:3000/register
- **Log in:** http://localhost:3000/login
- **Admin panel (protected):** http://localhost:3000/admin
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
│   │   │   ├── middlewares/         # tenant, auth (requireAuth/Owner), errors, upload
│   │   │   ├── routes/              # auth, admin, store, product, order, payment, health
│   │   │   ├── controllers/         # request/response orchestration
│   │   │   ├── services/            # auth, store, product, order, zarinpal
│   │   │   ├── utils/               # ApiError, asyncHandler, jwt, authCookies
│   │   │   ├── types/               # Express Request augmentation
│   │   │   ├── app.ts               # express app wiring
│   │   │   └── server.ts            # listen + graceful shutdown
│   │   ├── test/                    # vitest + supertest (auth, products, orders, payments)
│   │   ├── drizzle/                 # committed SQL migrations
│   │   ├── drizzle.config.ts        # drizzle-kit config (push/migrate/studio)
│   │   ├── Dockerfile
│   │   └── docker-entrypoint.sh     # migrate + seed on boot
│   └── frontend/                    # Next.js App Router + Tailwind
│       ├── app/                     # storefront, cart, checkout, payment result, login, register, admin
│       ├── components/              # ProductCard, CartBadge, ProductFormModal, …
│       ├── lib/                     # api client, cart store (Zustand), shared types
│       ├── middleware.ts            # gates /admin and the auth routes
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

## Authentication

Store-owner auth is JWT-based with tokens stored **only in httpOnly cookies**
(never `localStorage`, never returned in response bodies):

- `POST /api/auth/register` — creates a Store + owner User together (atomic),
  hashes the password (bcrypt), and sets the cookies.
- `POST /api/auth/login` — verifies credentials and sets the cookies.
- `POST /api/auth/refresh` — rotates the access token from the refresh cookie.
- `POST /api/auth/logout` — clears the cookies.
- `GET  /api/auth/me` — returns the current user (protected).

Cookies:

- `access_token` (15m, `path=/`) — short-lived, sent on every API request.
- `refresh_token` (7d, `path=/api/auth`) — only sent to the refresh/logout endpoints.

`requireAuth` middleware reads + verifies the access cookie and protects
`/api/admin/*` (the admin panel API, scoped to the owner's store). A
`requireOwner` guard restricts owner-only routes.

On the frontend, `app/login` and `app/register` post to the auth endpoints
(`credentials: 'include'`) and redirect to `/admin` on success. A Next.js
`middleware.ts` gates `/admin` (redirects to `/login` without an `access_token`
cookie) and skips the auth pages when already logged in.

> Passwords are hashed with **bcryptjs** (pure-JS bcrypt — same algorithm/API as
> native `bcrypt`, no native build step). Swap to `bcrypt` with a one-line change
> if you prefer the native addon.

---

## Payments (Zarinpal)

Checkout creates a `pending` order, then hands off to the Zarinpal gateway:

1. `POST /api/orders/:id/pay` (tenant-scoped) — requests an authority from
   Zarinpal and returns `{ gatewayUrl }`. The frontend redirects the browser
   there (`window.location.href`).
2. Zarinpal redirects back to `GET /api/payments/callback?Authority=…&Status=…&order=…`
   (tenant-agnostic — the gateway sends no `x-store-subdomain` header).
3. The backend verifies the transaction with Zarinpal **server-side**, then
   redirects to the frontend result page:
   - `code 100/101` → order marked **paid** → `/payment/result?status=paid&ref=…`
   - cancelled (`Status≠OK`) or verification failure → order marked **failed** →
     `/payment/result?status=failed` (the cart is left intact so the customer
     can retry).

Frontend: `/checkout` → gateway → `/payment/result` (success/failure). The cart
is cleared only after a verified payment.

Configuration (all in `.env`): `ZARINPAL_MERCHANT_ID`, `ZARINPAL_SANDBOX=true`
(sandbox by default), `ZARINPAL_CALLBACK_URL`, `WEB_URL`. Amounts are sent to
Zarinpal as integer **Tomans** (1000-Toman minimum) — handle currency conversion
for production. Schema change (orders `authority`/`ref_id` columns + a `failed`
status) is in migration `0001_add_payment_fields.sql`.

> A merchant ID is required to actually charge. For sandbox testing the default
> placeholder works against Zarinpal's sandbox; replace it with your own for live.

---

## Testing

```bash
npm test                      # = npm run test -w @shopiva/backend (vitest)
```

`apps/backend/test/auth.test.ts` exercises the auth endpoints through the real
Express app (supertest) with the database and Redis mocked, so it needs no live
infrastructure. bcrypt hashing and JWT signing run for real. It covers
registration (store + owner created, hashed password, cookies), duplicate/short/
missing-field errors, login (success / wrong password / unknown email),
`/me`, refresh, logout, and the protected `/api/admin/store`.

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
