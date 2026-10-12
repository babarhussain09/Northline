import type { InvoiceStatus, OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { pageMeta, safeSort, type PaginationQuery } from '../utils/pagination';
import { money } from '../utils/pricing';

async function paged<T>(count: number, rows: T[], query: PaginationQuery) {
  return { data: rows, pagination: pageMeta(query.page, query.limit, count) };
}

export async function listOrders(query: PaginationQuery & { clientId?: string; status?: OrderStatus }) {
  const where: Prisma.OrderWhereInput = {
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? { orderNumber: { contains: query.search, mode: 'insensitive' } } : {}),
  };
  const sort = safeSort(query.sort, ['createdAt', 'total', 'status'], 'createdAt');
  const [total, data] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        items: true,
        client: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      },
      orderBy: { [sort]: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return paged(total, data, query);
}

export async function getOrder(id: string, clientId?: string) {
  const order = await prisma.order.findFirst({
    where: { id, ...(clientId ? { clientId } : {}) },
    include: {
      items: { include: { service: { select: { slug: true, name: true } } } },
      payments: true,
      invoice: true,
      client: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
    },
  });
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  return order;
}

export async function listPayments(query: PaginationQuery & { clientId?: string; status?: PaymentStatus }) {
  const where: Prisma.PaymentWhereInput = {
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  const sort = safeSort(query.sort, ['createdAt', 'amount', 'status'], 'createdAt');
  const [total, data] = await prisma.$transaction([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: {
        order: { select: { id: true, orderNumber: true } },
        client: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      },
      orderBy: { [sort]: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return paged(total, data, query);
}

export async function getPayment(id: string, clientId?: string) {
  const payment = await prisma.payment.findFirst({
    where: { id, ...(clientId ? { clientId } : {}) },
    include: { order: true, refunds: true },
  });
  if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
  return payment;
}

export async function listInvoices(query: PaginationQuery & { clientId?: string; status?: InvoiceStatus }) {
  const where: Prisma.InvoiceWhereInput = {
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? { invoiceNumber: { contains: query.search, mode: 'insensitive' } } : {}),
  };
  const sort = safeSort(query.sort, ['createdAt', 'total', 'invoiceDate', 'status'], 'createdAt');
  const [total, data] = await prisma.$transaction([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: {
        client: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        order: { select: { orderNumber: true } },
      },
      orderBy: { [sort]: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return paged(total, data, query);
}

export async function getInvoice(id: string, clientId?: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, ...(clientId ? { clientId } : {}) },
    include: {
      items: true,
      client: { include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } } },
      order: { select: { orderNumber: true } },
    },
  });
  if (!invoice) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
  return invoice;
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
  return prisma.invoice.update({ where: { id }, data: { status }, include: { items: true } });
}

export async function listClientServices(query: PaginationQuery & { clientId?: string }) {
  const where: Prisma.ClientServiceWhereInput = {
    ...(query.clientId ? { clientId: query.clientId } : {}),
  };
  const [total, data] = await prisma.$transaction([
    prisma.clientService.count({ where }),
    prisma.clientService.findMany({
      where,
      include: {
        service: { select: { id: true, name: true, slug: true, billingType: true } },
        project: { select: { id: true, projectNumber: true, name: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return paged(total, data, query);
}

export async function clientSummary(clientId: string) {
  const [activeServices, activeProjects, pendingPayments, spent, refunded] = await Promise.all([
    prisma.clientService.count({ where: { clientId, status: 'ACTIVE' } }),
    prisma.project.count({ where: { clientId, status: { in: ['PAID', 'IN_PROGRESS', 'ON_HOLD'] } } }),
    prisma.payment.count({ where: { clientId, status: 'PENDING' } }),
    prisma.payment.aggregate({
      where: { clientId, status: { in: ['SUCCEEDED', 'PARTIALLY_REFUNDED'] } },
      _sum: { amount: true },
    }),
    prisma.refund.aggregate({
      where: { status: 'SUCCEEDED', payment: { clientId } },
      _sum: { amount: true },
    }),
  ]);
  const totalSpent = money(spent._sum.amount ?? 0).minus(money(refunded._sum.amount ?? 0));
  return {
    activeServices,
    activeProjects,
    pendingPayments,
    totalSpent: totalSpent.lessThan(0) ? money(0) : totalSpent,
  };
}

export async function listNotifications(userId: string, query: PaginationQuery) {
  const where = { userId, channel: 'IN_APP' as const };
  const [total, data] = await prisma.$transaction([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  const unread = await prisma.notification.count({ where: { ...where, isRead: false } });
  return { data, pagination: pageMeta(query.page, query.limit, total), unread };
}

export async function markNotificationRead(userId: string, id: string) {
  const notification = await prisma.notification.findFirst({ where: { id, userId, channel: 'IN_APP' } });
  if (!notification) throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, channel: 'IN_APP', isRead: false }, data: { isRead: true } });
}
