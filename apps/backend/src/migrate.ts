import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from './config/env';

/**
 * Programmatic migration runner (used by the production entrypoint so the image
 * doesn't need drizzle-kit at runtime). Applies every file under ./drizzle.
 *
 *   node dist/migrate.js
 */
async function main() {
  const client = postgres(env.databaseUrl, { max: 1, prepare: false });
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: './drizzle' });
  await client.end();
  console.log('[migrate] all migrations applied');
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
