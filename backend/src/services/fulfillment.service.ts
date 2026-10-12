import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { formatMoney } from '../utils/money';
import { money } from '../utils/pricing';
import {
  invoiceEmail,
  paymentFailedEmail,
  paymentSuccessEmail,
  projectCreatedEmail,
  refundEmail,
} from '../integrations/email/templates';
import { nextNumber } from './numbering.service';
import { notifyUser } from './notification.service';

const MILESTONES = [
  { title: 'Kickoff', description: 'Confirm scope, access, and what success looks like.' },
  { title: 'Discovery', description: 'Map the workflow, systems, and constraints.' },
  { title: 'Build', description: 'Implement the agent, automation, or software.' },
  { title: 'Review', description: 'Walk through the result and make adjustments.' },
  { title: 'Handover', description: 'Deliver access, notes, and the next operating steps.' },
];

type FulfillInput = {
  orderId: string;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeInvoiceId?: string | null;
};

export async function fulfillPaidOrder(input: FulfillInput) {
  const existing = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      items: { include: { service: true } },
      client: { include: { user: true } },
      payments: true,
    },
  });
  if (!existing) {
    logger.warn({ orderId: input.orderId }, 'webhook referenced a missing order');
    return;
  }
  if (existing.status === 'PAID' || existing.status === 'REFUNDED') return;

  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: input.orderId, status: 'PENDING_PAYMENT' },
      data: { status: 'PAID' },
    });
    if (claimed.count === 0) return null;

    await tx.payment.updateMany({
      where: { orderId: input.orderId, status: 'PENDING' },
      data: {
        status: 'SUCCEEDED',
        stripePaymentIntentId: input.stripePaymentIntentId || undefined,
        stripeChargeId: input.stripeChargeId || undefined,
        stripeCustomerId: input.stripeCustomerId || undefined,
      },
    });

    if (input.stripeCustomerId) {
      await tx.clientProfile.update({
        where: { id: existing.clientId },
        data: { stripeCustomerId: input.stripeCustomerId },
      });
    }

    const projects = [];
    for (const item of existing.items) {
      const projectNumber = await nextNumber(tx, 'project', 'PRJ');
      const expected = new Date();
      expected.setUTCDate(expected.getUTCDate() + 21);
      const project = await tx.project.create({
        data: {
          projectNumber,
          clientId: existing.clientId,
          serviceId: item.serviceId,
          orderId: existing.id,
          name: item.name,
          description: item.service.shortDescription,
          status: 'PAID',
          startDate: new Date(),
          expectedCompletionDate: expected,
          totalAmount: item.totalPrice,
          currency: existing.currency,
          milestones: {
            create: MILESTONES.map((milestone, index) => ({
              title: milestone.title,
              description: milestone.description,
              sortOrder: index,
            })),
          },
          activities: {
            create: { message: 'Payment received. The project is ready to start.' },
          },
        },
      });
      await tx.clientService.create({
        data: {
          clientId: existing.clientId,
          serviceId: item.serviceId,
          projectId: project.id,
          status: 'ACTIVE',
          activatedAt: new Date(),
          stripeSubscriptionId: item.service.billingType === 'RECURRING' ? input.stripeSubscriptionId : null,
        },
      });
      projects.push(project);
    }

    const invoiceNumber = await nextNumber(tx, 'invoice', 'INV');
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        clientId: existing.clientId,
        orderId: existing.id,
        invoiceDate: new Date(),
        dueDate: new Date(),
        subtotal: existing.subtotal,
        tax: existing.tax,
        discount: existing.discount,
        total: existing.total,
        currency: existing.currency,
        status: 'PAID',
        stripeInvoiceId: input.stripeInvoiceId,
        items: {
          create: existing.items.map((item) => ({
            description: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
    });

    const serviceIds = existing.items.map((item) => item.serviceId);
    await tx.cartItem.deleteMany({
      where: { serviceId: { in: serviceIds }, cart: { clientId: existing.clientId } },
    });

    return { projects, invoice };
  });

  if (!result) return;

  const user = existing.client.user;
  const total = formatMoney(existing.total, existing.currency);
  await notifyUser({
    userId: user.id,
    type: 'PAYMENT_SUCCESS',
    title: 'Payment received',
    message: `Payment for ${existing.orderNumber} was received.`,
    metadata: { orderId: existing.id },
    email: { to: user.email, ...paymentSuccessEmail(user.firstName, existing.orderNumber, total) },
  });
  await notifyUser({
    userId: user.id,
    type: 'INVOICE_CREATED',
    title: 'Invoice ready',
    message: `Invoice ${result.invoice.invoiceNumber} is ready to download.`,
    metadata: { invoiceId: result.invoice.id },
    email: { to: user.email, ...invoiceEmail(user.firstName, result.invoice.invoiceNumber, total) },
  });
  for (const project of result.projects) {
    await notifyUser({
      userId: user.id,
      type: 'PROJECT_CREATED',
      title: 'Project created',
      message: `${project.name} is now ${project.projectNumber}.`,
      metadata: { projectId: project.id },
      email: { to: user.email, ...projectCreatedEmail(user.firstName, project.projectNumber, project.name) },
    });
  }
}

export async function markOrderPaymentFailed(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { client: { include: { user: true } } },
  });
  if (!order || order.status !== 'PENDING_PAYMENT') return;

  await prisma.order.update({ where: { id: orderId }, data: { status: 'FAILED' } });
  await prisma.payment.updateMany({ where: { orderId, status: 'PENDING' }, data: { status: 'FAILED' } });
  const user = order.client.user;
  await notifyUser({
    userId: user.id,
    type: 'PAYMENT_FAILED',
    title: 'Payment failed',
    message: `Payment for ${order.orderNumber} did not go through.`,
    metadata: { orderId },
    email: { to: user.email, ...paymentFailedEmail(user.firstName, order.orderNumber) },
  });
}

export async function recordSubscriptionInvoice(input: {
  stripeInvoiceId: string;
  stripeSubscriptionId: string;
  amountPaid: number;
  currency: string;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
}) {
  const duplicate = await prisma.invoice.findUnique({ where: { stripeInvoiceId: input.stripeInvoiceId } });
  if (duplicate) return;

  const clientService = await prisma.clientService.findFirst({
    where: { stripeSubscriptionId: input.stripeSubscriptionId },
    include: { service: true, client: { include: { user: true } } },
  });
  if (!clientService) {
    logger.warn({ subscriptionId: input.stripeSubscriptionId }, 'subscription invoice has no client service');
    return;
  }

  const amount = money(input.amountPaid / 100);
  const currency = input.currency.toUpperCase();
  const created = await prisma.$transaction(async (tx) => {
    const orderNumber = await nextNumber(tx, 'order', 'ORD');
    const invoiceNumber = await nextNumber(tx, 'invoice', 'INV');
    const order = await tx.order.create({
      data: {
        orderNumber,
        clientId: clientService.clientId,
        status: 'PAID',
        subtotal: amount,
        discount: 0,
        tax: 0,
        total: amount,
        currency,
        items: {
          create: {
            serviceId: clientService.serviceId,
            quantity: 1,
            unitPrice: amount,
            setupFee: 0,
            totalPrice: amount,
            name: `${clientService.service.name} renewal`,
          },
        },
        payments: {
          create: {
            clientId: clientService.clientId,
            amount,
            currency,
            status: 'SUCCEEDED',
            stripePaymentIntentId: input.stripePaymentIntentId || undefined,
            stripeChargeId: input.stripeChargeId || undefined,
          },
        },
      },
    });
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        clientId: clientService.clientId,
        orderId: order.id,
        invoiceDate: new Date(),
        dueDate: new Date(),
        subtotal: amount,
        tax: 0,
        discount: 0,
        total: amount,
        currency,
        status: 'PAID',
        stripeInvoiceId: input.stripeInvoiceId,
        items: {
          create: {
            description: `${clientService.service.name} renewal`,
            quantity: 1,
            unitPrice: amount,
            totalPrice: amount,
          },
        },
      },
    });
    return { order, invoice };
  });

  const user = clientService.client.user;
  const total = formatMoney(amount, currency);
  await notifyUser({
    userId: user.id,
    type: 'PAYMENT_SUCCESS',
    title: 'Subscription payment received',
    message: `Renewal ${created.order.orderNumber} was paid.`,
    email: { to: user.email, ...paymentSuccessEmail(user.firstName, created.order.orderNumber, total) },
  });
  await notifyUser({
    userId: user.id,
    type: 'INVOICE_CREATED',
    title: 'Invoice ready',
    message: `Invoice ${created.invoice.invoiceNumber} is ready to download.`,
    email: { to: user.email, ...invoiceEmail(user.firstName, created.invoice.invoiceNumber, total) },
  });
}

export async function syncSubscription(stripeSubscriptionId: string, stripeStatus: string, periodEnd?: number | null) {
  const status =
    stripeStatus === 'active' || stripeStatus === 'trialing'
      ? 'ACTIVE'
      : stripeStatus === 'canceled' || stripeStatus === 'incomplete_expired'
        ? 'CANCELLED'
        : stripeStatus === 'past_due' || stripeStatus === 'unpaid'
          ? 'SUSPENDED'
          : 'PENDING';

  await prisma.clientService.updateMany({
    where: { stripeSubscriptionId },
    data: {
      status,
      expiresAt: periodEnd ? new Date(periodEnd * 1000) : stripeStatus === 'canceled' ? new Date() : undefined,
    },
  });
}

export async function applyChargeRefund(input: {
  chargeId: string;
  paymentIntentId?: string | null;
  amountRefundedCents: number;
  refunds: Array<{ id: string; amount: number; status: string | null }>;
}) {
  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        { stripeChargeId: input.chargeId },
        ...(input.paymentIntentId ? [{ stripePaymentIntentId: input.paymentIntentId }] : []),
      ],
    },
    include: { order: true, client: { include: { user: true } } },
  });
  if (!payment) {
    logger.warn({ chargeId: input.chargeId }, 'refund webhook did not match a payment');
    return;
  }

  if (!payment.stripeChargeId) {
    await prisma.payment.update({ where: { id: payment.id }, data: { stripeChargeId: input.chargeId } });
  }

  for (const refund of input.refunds) {
    const status = refund.status === 'succeeded' ? 'SUCCEEDED' : refund.status === 'failed' ? 'FAILED' : 'PENDING';
    await prisma.refund.upsert({
      where: { stripeRefundId: refund.id },
      create: {
        paymentId: payment.id,
        amount: money(refund.amount / 100),
        currency: payment.currency,
        status,
        stripeRefundId: refund.id,
      },
      update: { status },
    });
  }

  const refunded = money(input.amountRefundedCents / 100);
  const fullyRefunded = refunded.greaterThanOrEqualTo(money(payment.amount));
  const nextStatus = fullyRefunded ? 'REFUNDED' : refunded.greaterThan(0) ? 'PARTIALLY_REFUNDED' : payment.status;

  await prisma.payment.update({ where: { id: payment.id }, data: { status: nextStatus } });

  if (fullyRefunded && payment.order.status !== 'REFUNDED') {
    await prisma.order.update({ where: { id: payment.orderId }, data: { status: 'REFUNDED' } });
    await prisma.project.updateMany({ where: { orderId: payment.orderId }, data: { status: 'REFUNDED' } });
    await prisma.clientService.updateMany({
      where: { project: { orderId: payment.orderId } },
      data: { status: 'CANCELLED' },
    });
    await prisma.invoice.updateMany({ where: { orderId: payment.orderId }, data: { status: 'REFUNDED' } });
    const refundedProjects = await prisma.project.findMany({ where: { orderId: payment.orderId }, select: { id: true } });
    if (refundedProjects.length > 0) {
      await prisma.projectActivity.createMany({
        data: refundedProjects.map((project) => ({
          projectId: project.id,
          message: 'The payment was refunded and the project was closed.',
        })),
      });
    }
  }

  if (refunded.greaterThan(0)) {
    const user = payment.client.user;
    await notifyUser({
      userId: user.id,
      type: 'REFUND_COMPLETED',
      title: 'Refund processed',
      message: `A refund of ${formatMoney(refunded, payment.currency)} was processed.`,
      metadata: { paymentId: payment.id },
      email: { to: user.email, ...refundEmail(user.firstName, formatMoney(refunded, payment.currency)) },
    });
  }
}

export async function notifyInvoicePaymentFailed(stripeSubscriptionId: string | null) {
  if (!stripeSubscriptionId) return;
  const clientService = await prisma.clientService.findFirst({
    where: { stripeSubscriptionId },
    include: { client: { include: { user: true } }, service: true },
  });
  if (!clientService) return;
  const user = clientService.client.user;
  await notifyUser({
    userId: user.id,
    type: 'PAYMENT_FAILED',
    title: 'Subscription payment failed',
    message: `A renewal payment for ${clientService.service.name} failed.`,
    email: {
      to: user.email,
      ...paymentFailedEmail(user.firstName, clientService.service.name),
    },
  });
}

