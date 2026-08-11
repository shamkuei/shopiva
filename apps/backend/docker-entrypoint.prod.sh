#!/bin/sh
# Production entrypoint: apply pending migrations, optionally seed, then start.
# Uses the programmatic migrator (dist/migrate.js) so the image needs no
# drizzle-kit at runtime.
set -e

echo "[prod] Running migrations..."
node dist/migrate.js

if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  echo "[prod] Seeding database..."
  node dist/db/seed.js
fi

echo "[prod] Starting backend..."
exec "$@"
