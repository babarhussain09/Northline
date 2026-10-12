import type Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { AppError } from '../utils/errors';
import {
  applyChargeRefund,
  fulfillPaidOrder,
  markOrderPaymentFailed,
  notifyInvoicePaymentFailed,
  recordSubscriptionInvoice,
  syncSubscription,
} from './fulfillment.service';

function idOf(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value && 'id' in value && typeof value.id === 'string') return value.id;
  return null;
}

export async function handleStripeEvent(event: Stripe.Event) {
  try {
    await prisma.webhookEvent.create({
      data: {
        eventId: event.id,
        eventType: event.type,
        payload: event as unknown as Prisma.InputJsonValue,
        processed: false,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { duplicate: true };
    }
    throw error;
  }

  try {
    await dispatch(event);
    await prisma.webhookEvent.update({
      where: { eventId: event.id },
      data: { processed: true, processedAt: new Date() },
    });
    return { duplicate: false };
  } catch (error) {
    await prisma.webhookEvent.delete({ where: { eventId: event.id } }).catch(() => undefined);
    throw error;
  }
}

async function dispatch(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId || session.client_reference_id;
      if (!orderId) return;
      if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
        return;
      }
      await fulfillPaidOrder({
        orderId,
        stripePaymentIntentId: idOf(session.payment_intent),
        stripeCustomerId: idOf(session.customer),
        stripeSubscriptionId: idOf(session.subscription),
        stripeInvoiceId: idOf(session.invoice),
      });
      return;
    }
    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.orderId;
      if (!orderId) return;
      await fulfillPaidOrder({
        orderId,
        stripePaymentIntentId: intent.id,
        stripeChargeId: idOf(intent.latest_charge),
        stripeCustomerId: idOf(intent.customer),
      });
      return;
    }
    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent;
      if (intent.metadata?.orderId) await markOrderPaymentFailed(intent.metadata.orderId);
      return;
    }
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      await applyChargeRefund({
        chargeId: charge.id,
        paymentIntentId: idOf(charge.payment_intent),
        amountRefundedCents: charge.amount_refunded,
        refunds: (charge.refunds?.data ?? []).map((refund) => ({
          id: refund.id,
          amount: refund.amount,
          status: refund.status,
        })),
      });
      return;
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.billing_reason === 'subscription_create') return;
      const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription) || subscriptionFromInvoice(invoice);
      if (!subscriptionId || !invoice.id) return;
      await recordSubscriptionInvoice({
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId: subscriptionId,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        stripePaymentIntentId: paymentIntentFromInvoice(invoice),
        stripeChargeId: null,
      });
      return;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = subscriptionFromInvoice(invoice);
      await notifyInvoicePaymentFailed(subscriptionId);
      return;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const periodEnd = subscription.items?.data?.[0]?.current_period_end ?? null;
      await syncSubscription(subscription.id, subscription.status, periodEnd);
      if (event.type === 'customer.subscription.created') {
        const orderId = subscription.metadata?.orderId;
        if (orderId) {
          await prisma.clientService.updateMany({
            where: { project: { orderId }, stripeSubscriptionId: null, service: { billingType: 'RECURRING' } },
            data: { stripeSubscriptionId: subscription.id },
          });
        }
      }
      return;
    }
    default:
      logger.info({ type: event.type }, 'stripe event ignored');
  }
}

function subscriptionFromInvoice(invoice: Stripe.Invoice) {
  const legacy = invoice as Stripe.Invoice & { subscription?: string | { id: string } | null };
  return idOf(legacy.subscription) || idOf(invoice.parent?.subscription_details?.subscription);
}

function paymentIntentFromInvoice(invoice: Stripe.Invoice) {
  const legacy = invoice as Stripe.Invoice & { payment_intent?: string | { id: string } | null };
  return idOf(legacy.payment_intent);
}

export function assertWebhookConfigured() {
  if (!process.env.STRIPE_WEBHOOK_SECRET && !process.env.NODE_ENV) {
    throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Stripe webhooks are not configured');
  }
}
