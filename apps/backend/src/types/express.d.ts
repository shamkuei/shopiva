// `user` is attached by the auth middleware (requireAuth).
// `export {}` makes this a module so the `declare module` below is an
// augmentation (merged with the real Express types), not a replacement.
export {};

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      role: string;
      email: string;
    };
  }
}
