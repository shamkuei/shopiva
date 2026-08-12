import { eq } from 'drizzle-orm';
import { compare } from 'bcryptjs';
import { db } from '../db';
import { users, type User } from '../db/schema';
import { ApiError } from '../utils/ApiError';

export interface LoginInput {
  email: string;
  password: string;
}

export const authService = {
  /** Verify credentials. Returns a generic error so email existence isn't leaked. */
  async login({ email, password }: LoginInput): Promise<User> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) throw ApiError.unauthorized('Invalid email or password');

    const ok = await compare(password, user.passwordHash);
    if (!ok) throw ApiError.unauthorized('Invalid email or password');

    return user;
  },

  async getById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  },
};
