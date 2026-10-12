import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-value-0123456789';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-value-0123456789';
process.env.FRONTEND_URL ||= 'http://localhost:5173';
process.env.ALLOWED_ORIGINS ||= 'http://localhost:5173';
process.env.REDIS_URL ||= 'redis://127.0.0.1:6379';
process.env.STRIPE_SECRET_KEY ||= 'sk_test_placeholder';
process.env.STRIPE_WEBHOOK_SECRET ||= 'whsec_test_placeholder';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/subscription_portal';
process.env.DATABASE_URL = databaseUrl.includes('_test')
  ? databaseUrl
  : databaseUrl.replace(/\/([^/?]+)(\?|$)/, '/$1_test$2');
