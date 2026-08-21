import { createApp } from './app';
import { env, validatePayments } from './config/env';
import { client } from './db';
import { redis } from './config/redis';
import { orderService } from './services/order.service';

// Crash loudly on payment misconfiguration BEFORE binding the port — a
// production deploy with sandbox on / merchant ID unset must never serve.
validatePayments();

const app = createApp();

// Expire abandoned checkouts: pending orders older than the TTL are
// cancelled and their stock restored. setInterval keeps this single-process
// simple (the app runs one backend container).
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let sweepTimer: NodeJS.Timeout | undefined;

const server = app.listen(env.port, () => {
  console.log(`[shopiva-api] listening on http://localhost:${env.port} (${env.nodeEnv})`);

  sweepTimer = setInterval(() => {
    orderService
      .expirePendingOrders(env.pendingOrderTtlMinutes)
      .then((ids) => {
        if (ids.length > 0) {
          console.log(`[shopiva-api] expired ${ids.length} stale pending order(s)`);
        }
      })
      .catch((err) => console.error('[shopiva-api] pending-order sweep failed:', err));
  }, SWEEP_INTERVAL_MS);
  sweepTimer.unref();
});

const shutdown = async (signal: string) => {
  console.log(`[shopiva-api] ${signal} received, shutting down...`);
  if (sweepTimer) clearInterval(sweepTimer);
  server.close();
  try {
    await Promise.all([client.end(), redis.quit()]);
  } catch (err) {
    console.error('[shopiva-api] error during shutdown:', err);
  }
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
