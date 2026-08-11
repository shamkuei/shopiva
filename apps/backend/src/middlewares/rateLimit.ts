import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for credential-sensitive auth routes (login/register/refresh).
 * Mitigates brute-force / credential-stuffing. Behind the reverse proxy the
 * app trusts X-Forwarded-For (see `trust proxy` in app.ts) so the limiter keys
 * on the real client IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts, please try again later.' } },
});
