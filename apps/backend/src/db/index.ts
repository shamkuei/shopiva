import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '../config/env';

/**
 * Shared database client.
 *
 * Uses `postgres` (postgres.js) as the driver, with the relational query API
 * enabled by passing the schema. Drizzle derives all types from schema.ts, so
 * there is no separate `generate` step.
 */
export const client = postgres(env.databaseUrl, {
  max: 10,
  // Log executed SQL in dev.
  debug: (_connection, query) => {
    if (!env.isProd) console.log('[sql]', query);
  },
});

export const db = drizzle(client, { schema });

export type Database = typeof db;
export { schema };
