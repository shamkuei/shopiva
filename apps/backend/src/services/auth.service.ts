import { eq } from 'drizzle-orm';
import { hash, compare } from 'bcryptjs';
import { db } from '../db';
import { stores, users, type Store, type User } from '../db/schema';
import { ApiError } from '../utils/ApiError';

export interface RegisterInput {
  storeName: string;
  subdomain: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

const BCRYPT_ROUNDS = 10;

export const authService = {
  /**
   * Create a Store and its owner User in a single transaction. The owner is
   * linked back to the store via `users.storeId` (FK) and `stores.ownerId`
   * (plain pointer). Passwords are hashed with bcrypt before storage.
   */
  async register({ storeName, subdomain, email, password }: RegisterInput): Promise<{
    store: Store;
    user: User;
  }> {
    // Pre-check uniqueness for clear, field-specific errors.
    const [takenSub] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.subdomain, subdomain))
      .limit(1);
    if (takenSub) throw ApiError.conflict('Subdomain already taken');

    const [takenEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (takenEmail) throw ApiError.conflict('Email already registered');

    const passwordHash = await hash(password, BCRYPT_ROUNDS);

    return db.transaction(async (tx) => {
      const [store] = await tx.insert(stores).values({ name: storeName, subdomain }).returning();
      const [user] = await tx
        .insert(users)
        .values({ email, passwordHash, storeId: store.id, role: 'OWNER' })
        .returning();
      return { store, user };
    });
  },

  /** Verify credentials. Returns a generic error so email existence isn't leaked. */
  async login({ email, password }: LoginInput): Promise<{ user: User; store: Store }> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) throw ApiError.unauthorized('Invalid email or password');

    const ok = await compare(password, user.passwordHash);
    if (!ok) throw ApiError.unauthorized('Invalid email or password');

    const [store] = await db.select().from(stores).where(eq(stores.id, user.storeId)).limit(1);
    if (!store) throw ApiError.internal('Store not found for user');

    return { user, store };
  },

  async getById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  },
};
