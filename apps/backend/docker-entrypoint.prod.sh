#!/bin/sh
# Production entrypoint: apply pending migrations, optionally seed, then start.
# Uses the programmatic migrator (dist/migrate.js) so the image needs no
# drizzle-kit at runtime.
set -e

echo "[prod] Running migrations..."
node dist/migrate.js

case "${SEED_ON_BOOT:-false}" in
  admin)
    # Provision ONLY the first admin (no demo products/orders).
    echo "[prod] Creating admin user..."
    node dist/db/create-admin.js
    ;;
  true)
    # Full demo seed (owner + sample products + orders). Dev convenience.
    echo "[prod] Seeding database..."
    node dist/db/seed.js
    ;;
esac

echo "[prod] Starting backend..."
exec "$@"
