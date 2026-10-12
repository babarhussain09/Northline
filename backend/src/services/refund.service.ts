import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { money, toCents } from '../utils/pricing';
import { getStripe } from '../integrations/stripe/client';
import { writeAudit } from './audit.service';
import { pageMeta, type PaginationQuery } from '../utils/pagination';

export async function listRefunds(query: PaginationQuery) {
  const where = query.search
    ? { payment: { order: { orderNumber: { contains: query.search, mode: 'insensitive' as const } } } }
    : {};
  const [total, data] = await prisma.$transaction([
    prisma.refund.count({ where }),
    prisma.refund.findMany({
      where,
      include: {
        payment: {
          include: {
            order: { select: { orderNumber: true } },
            client: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return { data, pagination: pageMeta(query.page, query.limit, total) };
}

export async function requestRefund(
  input: { paymentId: string; amount?: number; reason?: string },
  actorId: string,
  meta: { ipAddress?: string; userAgent?: string },
) {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    include: { refunds: true, order: true },
  });
  if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
  if (payment.status !== 'SUCCEEDED' && payment.status !== 'PARTIALLY_REFUNDED') {
    throw new AppError(400, 'REFUND_NOT_ALLOWED', 'Only successful payments can be refunded');
  }
  if (!payment.stripePaymentIntentId && !payment.stripeChargeId) {
    throw new AppError(400, 'REFUND_NOT_ALLOWED', 'This payment has no Stripe reference');
  }

  const already = payment.refunds
    .filter((refund) => refund.status !== 'FAILED')
    .reduce((sum, refund) => sum.plus(refund.amount), money(0));
  const remaining = money(payment.amount).minus(already);
  const amount = input.amount !== undefined ? money(input.amount) : remaining;
  if (amount.lessThanOrEqualTo(0) || amount.greaterThan(remaining)) {
    throw new AppError(400, 'INVALID_REFUND_AMOUNT', 'Refund amount exceeds the remaining balance');
  }

  const stripeRefund = await getStripe().refunds.create({
    ...(payment.stripePaymentIntentId
      ? { payment_intent: payment.stripePaymentIntentId }
      : { charge: payment.stripeChargeId! }),
    amount: toCents(amount),
    metadata: { paymentId: payment.id },
  });

  const refund = await prisma.refund.create({
    data: {
      paymentId: payment.id,
      amount,
      currency: payment.currency,
      reason: input.reason?.trim() || null,
      status: stripeRefund.status === 'succeeded' ? 'SUCCEEDED' : stripeRefund.status === 'failed' ? 'FAILED' : 'PENDING',
      stripeRefundId: stripeRefund.id,
      requestedById: actorId,
    },
  });

  await writeAudit({
    userId: actorId,
    action: 'PAYMENT_REFUNDED',
    entityType: 'Payment',
    entityId: payment.id,
    newValue: { refundId: refund.id, amount: amount.toFixed(2), reason: input.reason ?? null },
    ...meta,
  });

  return refund;
}
