import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { env } from './config/env';
import routes from './routes';
import healthRoute from './routes/health.route';
import authRoute from './routes/auth.route';
import adminRoute from './routes/admin.route';
import paymentRoute from './routes/payment.route';
import publicStoreRoute from './routes/publicStore.route';
import { tenantMiddleware } from './middlewares/tenantMiddleware';
import { requireAuth } from './middlewares/authMiddleware';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler';

/**
 * CORS origin validator: allows the explicitly configured origins and any
 * subdomain of ROOT_DOMAIN (the multi-tenant storefront subdomains). Requests
 * with no Origin header (same-origin, server-to-server, curl) are allowed.
 */
function corsOrigin(origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void): void {
  if (!origin) return cb(null, true);
  if (env.corsOrigin.includes(origin)) return cb(null, true);
  if (env.rootDomain) {
    try {
      const host = new URL(origin).hostname;
      if (host === env.rootDomain || host.endsWith(`.${env.rootDomain}`)) return cb(null, true);
    } catch {
      /* invalid origin -> fall through to reject */
    }
  }
  return cb(null, false);
}

export function createApp() {
  const app = express();

  // Trust the reverse proxy hop so req.ip / rate-limiting use the real client
  // IP from X-Forwarded-For (Caddy/Nginx in front).
  app.set('trust proxy', env.isProd ? 1 : false);

  // Security + parsing.
  app.use(helmet());

  // CORS: allow the configured origins AND any subdomain of ROOT_DOMAIN (so the
  // multi-tenant storefront subdomains can call the API with credentials).
  app.use(cors({ origin: corsOrigin, credentials: true }));

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  // Serve uploaded product images from local disk.
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // Root.
  app.get('/', (_req: Request, res: Response) => {
    res.json({ name: 'Shopiva API', status: 'running' });
  });

  // Public + auth endpoints (not tenant-scoped).
  app.use('/api/health', healthRoute);
  app.use('/api/auth', authRoute);

  // Zarinpal callback (no tenant header) — verifies then redirects to the web.
  app.use('/api/payments', paymentRoute);

  // Caddy on-demand-TLS "ask" check (does a store exist for a hostname?).
  // Mounted before the tenant middleware (the gateway sends no tenant header).
  app.use('/api/stores/exists', publicStoreRoute);

  // Admin panel API — protected; scoped by the authenticated user's store.
  app.use('/api/admin', requireAuth, adminRoute);

  // Tenant-scoped public storefront API (resolved via x-store-subdomain).
  app.use('/api', tenantMiddleware, routes);

  // 404 + error handling (must be last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
