import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../utils/errors';
import { formatMoney } from '../utils/money';
import { applyTax, assertPurchasable, priceService, sumMoney, toCents } from '../utils/pricing';
import { getStripe } from '../integrations/stripe/client';
import { getTaxRatePercent } from './settings.service';
import { nextNumber } from './numbering.service';

export async function createCheckout(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { clientProfile: true },
  });
  if (!user?.clientProfile) throw new AppError(403, 'FORBIDDEN', 'Client access required');
  if (!user.emailVerified) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before checkout');
  }

  const clientId = user.clientProfile.id;
  const cart = await prisma.cart.findUnique({
    where: { clientId },
    include: { items: { include: { service: true } } },
  });
  if (!cart || cart.items.length === 0) throw new AppError(400, 'CART_EMPTY', 'Your cart is empty');

  const lines = cart.items.map((item) => {
    const problem = assertPurchasable(item.service);
    if (problem) throw new AppError(400, 'SERVICE_NOT_PURCHASABLE', problem);
    if (item.quantity < 1 || item.quantity > 99) throw new AppError(400, 'INVALID_QUANTITY', 'Quantity must be between 1 and 99');
    const priced = priceService(item.service, item.quantity);
    return { item, priced, service: item.service };
  });

  const currencies = new Set(lines.map((line) => line.service.currency));
  if (currencies.size !== 1) throw new AppError(400, 'CURRENCY_MISMATCH', 'All services in the cart must use the same currency');
  const currency = lines[0].service.currency;
  const taxRate = await getTaxRatePercent();
  const totals = applyTax(sumMoney(lines.map((line) => line.priced.lineTotal)), taxRate, 0);
  if (totals.total.lessThan('0.50')) {
    throw new AppError(400, 'AMOUNT_TOO_SMALL', 'The order total is below the minimum charge');
  }

  const stripe = getStripe();
  let stripeCustomerId = user.clientProfile.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      metadata: { clientId },
    });
    stripeCustomerId = customer.id;
    await prisma.clientProfile.update({ where: { id: clientId }, data: { stripeCustomerId } });
  }

  const pending = await prisma.order.findMany({
    where: { clientId, status: 'PENDING_PAYMENT', stripeCheckoutSessionId: { not: null } },
  });
  for (const order of pending) {
    try {
      await stripe.checkout.sessions.expire(order.stripeCheckoutSessionId!);
    } catch (error) {
      logger.warn({ err: error instanceof Error ? error.message : 'expire failed', orderId: order.id }, 'could not expire checkout session');
    }
    await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
    await prisma.payment.updateMany({ where: { orderId: order.id, status: 'PENDING' }, data: { status: 'FAILED' } });
  }

  const hasRecurring = lines.some((line) => line.service.billingType === 'RECURRING');
  const order = await prisma.$transaction(async (tx) => {
    const orderNumber = await nextNumber(tx, 'order', 'ORD');
    const created = await tx.order.create({
      data: {
        orderNumber,
        clientId,
        status: 'PENDING_PAYMENT',
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        total: totals.total,
        currency,
        items: {
          create: lines.map((line) => ({
            serviceId: line.service.id,
            quantity: line.item.quantity,
            unitPrice: line.priced.unitPrice,
            setupFee: line.priced.setupFee,
            totalPrice: line.priced.lineTotal,
            name: line.service.name,
          })),
        },
        payments: {
          create: {
            clientId,
            amount: totals.total,
            currency,
            status: 'PENDING',
            stripeCustomerId,
          },
        },
      },
      include: { items: true },
    });
    return created;
  });

  const stripeLines: Array<{ quantity: number; price_data: Record<string, unknown> }> = [];
  for (const line of lines) {
    const recurring = line.service.billingType === 'RECURRING';
    stripeLines.push({
      quantity: line.item.quantity,
      price_data: {
        currency: currency.toLowerCase(),
        unit_amount: toCents(line.priced.unitPrice),
        product_data: { name: line.service.name, description: line.service.shortDescription.slice(0, 180) },
        ...(recurring ? { recurring: { interval: 'month' } } : {}),
      },
    });
    if (line.priced.setupFee.greaterThan(0)) {
      stripeLines.push({
        quantity: line.item.quantity,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: toCents(line.priced.setupFee),
          product_data: { name: `${line.service.name} setup` },
        },
      });
    }
  }
  if (totals.tax.greaterThan(0)) {
    stripeLines.push({
      quantity: 1,
      price_data: {
        currency: currency.toLowerCase(),
        unit_amount: toCents(totals.tax),
        product_data: { name: 'Tax' },
      },
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: hasRecurring ? 'subscription' : 'payment',
      customer: stripeCustomerId,
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      success_url: `${env.FRONTEND_URL}/checkout/success?order=${order.id}`,
      cancel_url: `${env.FRONTEND_URL}/checkout/cancel?order=${order.id}`,
      line_items: stripeLines as never,
      ...(hasRecurring
        ? { subscription_data: { metadata: { orderId: order.id } } }
        : { payment_intent_data: { metadata: { orderId: order.id } } }),
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: session.id },
    });
    await prisma.payment.updateMany({
      where: { orderId: order.id, status: 'PENDING' },
      data: { stripeCheckoutSessionId: session.id },
    });

    if (!session.url) throw new AppError(502, 'CHECKOUT_FAILED', 'Stripe did not return a checkout URL');
    return {
      url: session.url,
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: formatMoney(totals.total, currency),
    };
  } catch (error) {
    await prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } });
    await prisma.payment.updateMany({ where: { orderId: order.id, status: 'PENDING' }, data: { status: 'FAILED' } });
    if (error instanceof AppError) throw error;
    logger.error({ err: error instanceof Error ? error.message : 'stripe error', orderId: order.id }, 'checkout session failed');
    throw new AppError(502, 'CHECKOUT_FAILED', 'Could not start checkout');
  }
}
