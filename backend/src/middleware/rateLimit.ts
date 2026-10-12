import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import type { RedisReply } from 'rate-limit-redis';
import { env } from '../config/env';
import { redis } from '../config/redis';

function store(name: string) {
  if (env.NODE_ENV === 'test') return undefined;
  return new RedisStore({
    // Each limiter needs its own prefix. A shared prefix makes login, registration,
    // and the general API counter share one Redis key.
    prefix: `rl:${name}:`,
    sendCommand: (command: string, ...args: string[]) =>
      redis.call(command, ...args) as Promise<RedisReply>,
  });
}

const testMultiplier = env.NODE_ENV === 'test' ? 100 : 1;

function limiter(
  name: string,
  options: {
    windowMs: number;
    limit: number;
    code: string;
    message: string;
  },
) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit * testMultiplier,
    standardHeaders: true,
    legacyHeaders: false,
    store: store(name),
    passOnStoreError: env.NODE_ENV !== 'production',
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: options.code,
          message: options.message,
        },
      });
    },
  });
}

export const generalLimiter = limiter('general', {
  windowMs: 60 * 1000,
  limit: 100,
  code: 'RATE_LIMITED',
  message: 'Too many requests. Try again in a minute.',
});

export const loginLimiter = limiter('login', {
  windowMs: 15 * 60 * 1000,
  limit: 5,
  code: 'RATE_LIMITED',
  message: 'Too many login attempts. Try again in 15 minutes.',
});

export const registerLimiter = limiter('register', {
  windowMs: 60 * 60 * 1000,
  limit: 5,
  code: 'RATE_LIMITED',
  message: 'Too many registration attempts. Try again in an hour.',
});

export const forgotPasswordLimiter = limiter('forgot', {
  windowMs: 60 * 60 * 1000,
  limit: 5,
  code: 'RATE_LIMITED',
  message: 'Too many password reset attempts. Try again in an hour.',
});

export const contactLimiter = limiter('contact', {
  windowMs: 60 * 60 * 1000,
  limit: 5,
  code: 'RATE_LIMITED',
  message: 'Too many contact requests. Try again in an hour.',
});

export const demoLimiter = limiter('demo', {
  windowMs: 60 * 60 * 1000,
  limit: 5,
  code: 'RATE_LIMITED',
  message: 'Too many demo requests. Try again in an hour.',
});
