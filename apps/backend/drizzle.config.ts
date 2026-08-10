import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';
import { env } from './src/config/env';

// `drizzle-kit` reads this for push/migrate/studio.
//   db:push    -> drizzle-kit push     (dev: sync schema.ts to the database)
//   db:migrate -> drizzle-kit migrate  (prod: apply generated migrations)
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.databaseUrl,
  },
  verbose: true,
  strict: true,
});
