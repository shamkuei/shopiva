import Redis from 'ioredis';
import { env } from './env';

/**
 * Shared Redis client (sessions, caching, rate-limiting, etc.).
 * Exposed so the health check can verify connectivity.
 */
export const redis = new Redis(env.redisUrl, {
  // Don't crash the process if Redis is briefly unavailable at boot.
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

redis.on('error', (err) => {
  // ioredis keeps retrying; log but don't let it kill the API.
  console.error('[redis] connection error:', err.message);
});
