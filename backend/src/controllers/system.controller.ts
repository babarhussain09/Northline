import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { prisma } from '../config/prisma';
import { pingRedis } from '../config/redis';
import { getPublicSettings } from '../services/settings.service';
import { buildSitemap, robotsTxt } from '../services/site.service';
import { constructStripeEvent } from '../integrations/stripe/client';
import { handleStripeEvent } from '../services/webhook.service';

export const health = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

export const ready = asyncHandler(async (_req, res) => {
  let database = false;
  let cache = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }
  cache = await pingRedis();
  const readyState = database && cache;
  res.status(readyState ? 200 : 503).json({
    success: readyState,
    data: { database, redis: cache },
  });
});

export const publicConfig = asyncHandler(async (_req, res) => ok(res, await getPublicSettings()));

export const sitemap = asyncHandler(async (_req, res) => {
  res.type('application/xml').send(await buildSitemap());
});

export const robots = asyncHandler(async (_req, res) => {
  res.type('text/plain').send(robotsTxt());
});

export const stripeWebhook = asyncHandler(async (req, res) => {
  const event = constructStripeEvent(req.body as Buffer, req.header('stripe-signature'));
  const result = await handleStripeEvent(event);
  return ok(res, { received: true, duplicate: result.duplicate });
});
