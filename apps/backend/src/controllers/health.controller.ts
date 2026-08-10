import type { Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { asyncHandler } from '../utils/asyncHandler';
import { db } from '../db';
import { redis } from '../config/redis';

/** Liveness/readiness check that verifies DB + Redis connectivity. */
export const healthCheck = asyncHandler(async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {};

  try {
    await db.execute(sql`select 1`);
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  try {
    checks.redis = (await redis.ping()) === 'PONG' ? 'ok' : 'error';
  } catch {
    checks.redis = 'error';
  }

  const ok = Object.values(checks).every((v) => v === 'ok');
  res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', checks });
});
