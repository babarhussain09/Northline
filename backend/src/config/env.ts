import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
  FRONTEND_URL: z.string().url(),
  ALLOWED_ORIGINS: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_PUBLISHABLE_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM: z.string().default('Northline <noreply@localhost>'),
  ADMIN_NOTIFY_EMAIL: z.string().default(''),
  BACKUP_DIR: z.string().default('/backups'),
  BACKUP_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  LOG_LEVEL: z.string().default('info'),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  SEED_ADMIN_EMAIL: z.string().default(''),
  SEED_ADMIN_PASSWORD: z.string().default(''),
  SEED_DEMO_CLIENT_EMAIL: z.string().default(''),
  SEED_DEMO_CLIENT_PASSWORD: z.string().default(''),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

if (parsed.data.NODE_ENV === 'production') {
  const origins = parsed.data.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());
  if (origins.includes('*') || origins.length === 0) {
    throw new Error('Wildcard CORS is not allowed in production. Set ALLOWED_ORIGINS to explicit origins.');
  }
  if (parsed.data.JWT_ACCESS_SECRET.length < 32 || parsed.data.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT secrets must be at least 32 characters in production.');
  }
}

export const env = parsed.data;

export const cookieSecure = env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : env.NODE_ENV === 'production';

export const allowedOrigins = env.ALLOWED_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
