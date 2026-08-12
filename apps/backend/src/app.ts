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
import { requireAuth } from './middlewares/authMiddleware';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler';

export function createApp() {
  const app = express();

  // Trust the reverse proxy hop so req.ip / rate-limiting use the real client
  // IP from X-Forwarded-For (Caddy/Nginx in front).
  app.set('trust proxy', env.isProd ? 1 : false);

  // Security + parsing. Credentials allowed for the configured origins.
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  // Serve uploaded product images from local disk.
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // Root.
  app.get('/', (_req: Request, res: Response) => {
    res.json({ name: 'Shopiva API', status: 'running' });
  });

  // Health + auth + Zarinpal callback.
  app.use('/api/health', healthRoute);
  app.use('/api/auth', authRoute);
  app.use('/api/payments', paymentRoute);

  // Admin panel API — protected.
  app.use('/api/admin', requireAuth, adminRoute);

  // Public storefront API (products + orders).
  app.use('/api', routes);

  // 404 + error handling (must be last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
