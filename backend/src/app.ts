import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { allowedOrigins, env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimit';
import { requestContext, requestLogger } from './middleware/requestLogger';
import { apiRouter } from './routes';
import { notFound } from './controllers/auth.controller';
import { health, ready, robots, sitemap, stripeWebhook } from './controllers/system.controller';
import { AppError } from './utils/errors';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(requestContext);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new AppError(403, 'CORS_FORBIDDEN', 'Origin not allowed'));
      },
      credentials: true,
    }),
  );
  app.use(requestLogger);

  app.get('/health', health);
  app.get('/ready', ready);
  app.get('/sitemap.xml', sitemap);
  app.get('/robots.txt', robots);
  app.post('/api/v1/webhooks/stripe', express.raw({ type: 'application/json', limit: '1mb' }), stripeWebhook);

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api/v1', generalLimiter, apiRouter);
  app.use(notFound);
  app.use(errorHandler);

  if (env.NODE_ENV === 'production' && allowedOrigins.includes('*')) {
    throw new Error('Wildcard CORS is not allowed in production');
  }

  return app;
}
