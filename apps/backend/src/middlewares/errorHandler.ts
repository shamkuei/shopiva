import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

/** 404 for anything that falls through unmatched. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

interface PgError {
  code?: string;
  constraint?: string;
  message?: string;
}

/** Last-resort error handler — normalises everything into a JSON response. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // Express requires exactly 4 args to identify this as the error handler.
  _next: NextFunction,
) {
  // Map Postgres error codes (surfaced by the `postgres` driver) to HTTP statuses.
  const pg = (typeof err === 'object' && err !== null ? err : {}) as PgError;
  switch (pg.code) {
    // unique_violation
    case '23505':
      return res
        .status(409)
        .json({ error: { message: 'A record with this value already exists', details: { constraint: pg.constraint } } });
    // foreign_key_violation
    case '23503':
      return res
        .status(409)
        .json({ error: { message: 'Referenced record does not exist', details: { constraint: pg.constraint } } });
    // not_null_violation
    case '23502':
      return res
        .status(400)
        .json({ error: { message: 'Missing required field', details: { column: pg.constraint } } });
    default:
      break;
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, details: err.details },
    });
  }

  // Unexpected error — never leak internals in production.
  console.error('[error]', err);
  const message =
    env.isProd ? 'Internal server error' : (err as Error)?.message ?? 'Internal server error';
  return res.status(500).json({ error: { message } });
}
