import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { connectRedis, redis } from './config/redis';
import { cleanupExpiredTokens } from './jobs/cleanup';

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'API listening');
});

connectRedis().catch((error: Error) => {
  logger.error({ err: error.message }, 'redis connection failed');
  if (env.NODE_ENV === 'production') process.exit(1);
});

const cleanupTimer = setInterval(() => {
  cleanupExpiredTokens().catch((error: Error) => logger.error({ err: error.message }, 'token cleanup failed'));
}, 24 * 60 * 60 * 1000);
cleanupTimer.unref();

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  redis.disconnect();
}

process.on('SIGTERM', () => {
  shutdown().finally(() => process.exit(0));
});
process.on('SIGINT', () => {
  shutdown().finally(() => process.exit(0));
});
