#!/bin/sh
# Runs on every backend container start. Keeps the DB schema in sync and seeds
# a default store so the API is usable immediately.
#
# We call the locally-installed drizzle-kit/tsx binaries directly (not `npx`)
# so the entrypoint never blocks on a package-registry lookup. Drizzle has no
# separate "generate" step — the schema IS the TypeScript source.
set -e

echo "[entrypoint] Pushing schema to the database (drizzle-kit push)..."
# `push` syncs src/db/schema.ts to the database. For production, generate
# migrations (`drizzle-kit generate`) and apply them with `drizzle-kit migrate`.
node_modules/.bin/drizzle-kit push --force

echo "[entrypoint] Seeding database..."
node_modules/.bin/tsx src/db/seed.ts

echo "[entrypoint] Starting backend in ${NODE_ENV:-development} mode..."
exec "$@"
