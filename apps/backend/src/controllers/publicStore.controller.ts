import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { storeService } from '../services/store.service';
import { env } from '../config/env';

/**
 * Caddy on-demand-TLS `ask` target: 200 if a store exists for the hostname,
 * 404 otherwise. Prevents issuing certs for arbitrary subdomains of your domain.
 * `?domain=<hostname>` is sent by Caddy.
 */
export const exists = asyncHandler(async (req: Request, res: Response) => {
  const raw = typeof req.query.domain === 'string' ? req.query.domain : '';
  const hostname = raw.split(':')[0];
  let subdomain = hostname.split('.')[0];
  if (env.rootDomain && hostname.endsWith(`.${env.rootDomain}`)) {
    subdomain = hostname.slice(0, hostname.length - env.rootDomain.length - 1);
  }
  if (!subdomain) return res.status(404).end();

  const store = await storeService.getBySubdomain(subdomain);
  res.status(store ? 200 : 404).end();
});
