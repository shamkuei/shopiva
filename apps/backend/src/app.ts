import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import routes from './routes';
import healthRoute from './routes/health.route';
import { tenantMiddleware } from './middlewares/tenantMiddleware';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler';

export function createApp() {
  const app = express();

  // Security + parsing.
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  // Root + tenant-agnostic health check (no store required).
  app.get('/', (_req: Request, res: Response) => {
    res.json({ name: 'Shopiva API', status: 'running' });
  });
  app.use('/api/health', healthRoute);

  // Tenant-scoped API: resolve the store first, then mount catalog routes.
  app.use('/api', tenantMiddleware, routes);

  // 404 + error handling (must be last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
