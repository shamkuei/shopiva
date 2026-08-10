import type { Request, Response, NextFunction } from 'express';
import { storeService } from '../services/store.service';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

/**
 * Multi-tenant resolution.
 *
 * Determines which store (tenant) the request belongs to and attaches it to
 * `req.store`. Today the tenant is selected by:
 *   1. the `x-store-slug` request header, or
 *   2. the configured default slug as a fallback (convenient while there is
 *      a single store — easily removed later).
 *
 * Extend this to also derive the tenant from the host/subdomain when you add
 * custom-domain support.
 */
export const tenantMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const slug = (req.header('x-store-slug') || env.storeDefaultSlug).trim();

    const store = await storeService.getBySlug(slug);
    if (!store) {
      throw ApiError.notFound(`Store '${slug}' not found`);
    }

    req.store = store;
    next();
  } catch (err) {
    next(err);
  }
};
