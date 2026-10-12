import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      'accessToken',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.refreshToken',
      '*.accessToken',
      '*.stripeSecret',
      '*.card',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'SMTP_PASSWORD',
    ],
    censor: '[redacted]',
  },
});
