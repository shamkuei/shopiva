import type { Store } from '../db/schema';

// Attach the resolved tenant to every request. Set by the tenant middleware.
declare module 'express-serve-static-core' {
  interface Request {
    store?: Store;
  }
}
