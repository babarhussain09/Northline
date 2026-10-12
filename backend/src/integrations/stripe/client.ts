import Stripe from 'stripe';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';

let client: Stripe | null = null;

export function isStripeConfigured() {
  return Boolean(env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Payments are not configured');
  }
  if (!client) {
    client = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return client;
}

export function constructStripeEvent(payload: Buffer, signature: string | undefined) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Stripe webhooks are not configured');
  }
  if (!signature) {
    throw new AppError(400, 'INVALID_SIGNATURE', 'Missing Stripe signature');
  }
  try {
    return getStripe().webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new AppError(400, 'INVALID_SIGNATURE', 'Invalid Stripe signature');
  }
}
