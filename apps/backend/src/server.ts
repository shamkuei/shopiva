import { createApp } from './app';
import { env } from './config/env';
import { client } from './db';
import { redis } from './config/redis';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`[shopiva-api] listening on http://localhost:${env.port} (${env.nodeEnv})`);
});

const shutdown = async (signal: string) => {
  console.log(`[shopiva-api] ${signal} received, shutting down...`);
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
