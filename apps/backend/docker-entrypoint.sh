#!/bin/sh
# Runs on every backend container start. Applies pending Drizzle migrations and
# seeds a default store so the API is usable immediately.
#
# We call the locally-installed drizzle-kit/tsx binaries directly (not `npx`)
# so the entrypoint never blocks on a package-registry lookup.
set -e

echo "[entrypoint] Applying Drizzle migrations..."
node_modules/.bin/drizzle-kit migrate

echo "[entrypoint] Seeding database..."
node_modules/.bin/tsx src/db/seed.ts

echo "[entrypoint] Starting backend in ${NODE_ENV:-development} mode..."
exec "$@"
