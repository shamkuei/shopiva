import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import routes from './routes';
import healthRoute from './routes/health.route';
import authRoute from './routes/auth.route';
import adminRoute from './routes/admin.route';
import { tenantMiddleware } from './middlewares/tenantMiddleware';
import { requireAuth } from './middlewares/authMiddleware';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler';

export function createApp() {
  const app = express();

  // Security + parsing. `credentials: true` lets the browser send the
  // httpOnly auth cookies cross-origin (frontend :3000 -> backend :4000).
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  // Root.
  app.get('/', (_req: Request, res: Response) => {
    res.json({ name: 'Shopiva API', status: 'running' });
  });

  // Public + auth endpoints (not tenant-scoped).
  app.use('/api/health', healthRoute);
  app.use('/api/auth', authRoute);

  // Admin panel API — protected; scoped by the authenticated user's store.
  app.use('/api/admin', requireAuth, adminRoute);

  // Tenant-scoped public storefront API (resolved via x-store-subdomain).
  app.use('/api', tenantMiddleware, routes);

  // 404 + error handling (must be last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
