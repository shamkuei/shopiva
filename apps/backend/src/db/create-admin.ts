import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import { db, client } from './index';
import { users } from './schema';

/**
 * Create (or reset the password of) the first admin user.
 *
 *   OWNER_EMAIL=x@y.z OWNER_PASSWORD=secret npm run create-admin
 *
 * Idempotent: if the email already exists the password is updated in place
 * (this is also the password-reset path until user management exists).
 * Defaults to the dev seed credentials so `npm run create-admin` with no env
 * still yields a login for local development.
 */

const EMAIL = process.env.OWNER_EMAIL ?? 'owner@shopiva.test';
const PASSWORD = process.env.OWNER_PASSWORD ?? 'password123';
const ROLE = 'OWNER' as const;

async function main() {
  if (PASSWORD.length < 8) {
    throw new Error('OWNER_PASSWORD must be at least 8 characters');
  }

  const existing = await db.select().from(users).where(eq(users.email, EMAIL)).limit(1);
  const passwordHash = await hash(PASSWORD, 10);

  if (existing[0]) {
    await db.update(users).set({ passwordHash }).where(eq(users.email, EMAIL));
    console.log(`[create-admin] password updated for existing user ${EMAIL}`);
  } else {
    await db.insert(users).values({ email: EMAIL, passwordHash, role: ROLE });
    console.log(`[create-admin] created ${ROLE} ${EMAIL}`);
  }
}

main()
  .catch((err) => {
    console.error('[create-admin] failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
