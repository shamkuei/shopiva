import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';

export interface AuthUser {
  id: string;
  role: string;
  email: string;
}

/**
 * Reads the access token from the httpOnly `access_token` cookie, verifies it,
 * and attaches the decoded user to `req.user`. Rejects with 401 otherwise.
 *
 * Use to protect admin routes: app.use('/api/admin', requireAuth, ...).
 */
export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) throw ApiError.unauthorized('Authentication required');

    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
    };
    next();
  } catch (err) {
    next(err);
  }
};

/** Restrict a route to store owners. Must run after `requireAuth`. */
export const requireOwner = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'OWNER') {
    return next(ApiError.forbidden('Owner access required'));
  }
  next();
};
