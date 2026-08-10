import type { Store } from '../db/schema';

// Request augmentations:
// - `store`: the resolved tenant (set by the tenant middleware).
// - `user`:  the authenticated store owner/staff (set by the auth middleware).
declare module 'express-serve-static-core' {
  interface Request {
    store?: Store;
    user?: {
      id: string;
      storeId: string;
      role: string;
      email: string;
    };
  }
}
