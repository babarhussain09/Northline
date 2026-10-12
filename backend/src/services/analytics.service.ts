import { prisma } from '../config/prisma';
import { money } from '../utils/pricing';

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function lastMonths(count: number) {
  const months: string[] = [];
  const now = new Date();
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    months.push(monthKey(date));
  }
  return months;
}

export async function analytics() {
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 11);
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [payments, monthPayments, activeClients, activeProjects, pendingPayments, servicesSold, newDemos, orders, clients, topGrouped, projectGroups] =
    await Promise.all([
      prisma.payment.findMany({
        where: { status: { in: ['SUCCEEDED', 'PARTIALLY_REFUNDED'] }, createdAt: { gte: since } },
        select: { amount: true, createdAt: true },
      }),
      prisma.payment.aggregate({
        where: { status: { in: ['SUCCEEDED', 'PARTIALLY_REFUNDED'] }, createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.user.count({ where: { role: 'CLIENT', status: 'ACTIVE', deletedAt: null } }),
      prisma.project.count({ where: { status: { in: ['PAID', 'IN_PROGRESS', 'ON_HOLD'] } } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.orderItem.count({ where: { order: { status: 'PAID' } } }),
      prisma.demoRequest.count({ where: { status: 'NEW' } }),
      prisma.order.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.user.findMany({
        where: { role: 'CLIENT', createdAt: { gte: since }, deletedAt: null },
        select: { createdAt: true },
      }),
      prisma.orderItem.groupBy({
        by: ['serviceId'],
        where: { order: { status: 'PAID' } },
        _sum: { totalPrice: true },
        _count: { _all: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 5,
      }),
      prisma.project.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

  const allTime = await prisma.payment.aggregate({
    where: { status: { in: ['SUCCEEDED', 'PARTIALLY_REFUNDED'] } },
    _sum: { amount: true },
  });
  const refunded = await prisma.refund.aggregate({
    where: { status: 'SUCCEEDED' },
    _sum: { amount: true },
  });

  const months = lastMonths(12);
  const revenueChart = months.map((month) => ({
    month,
    amount: payments
      .filter((payment) => monthKey(payment.createdAt) === month)
      .reduce((sum, payment) => sum.plus(payment.amount), money(0))
      .toFixed(2),
  }));
  const ordersChart = months.map((month) => ({
    month,
    count: orders.filter((order) => monthKey(order.createdAt) === month).length,
  }));
  const customerGrowth = months.map((month) => ({
    month,
    count: clients.filter((client) => monthKey(client.createdAt) === month).length,
  }));

  const services = await prisma.service.findMany({
    where: { id: { in: topGrouped.map((row) => row.serviceId) } },
    select: { id: true, name: true },
  });
  const names = new Map(services.map((service) => [service.id, service.name]));
  const topServices = topGrouped.map((row) => ({
    name: names.get(row.serviceId) ?? 'Service',
    count: row._count._all,
    revenue: money(row._sum.totalPrice ?? 0).toFixed(2),
  }));

  const totalRevenue = money(allTime._sum.amount ?? 0).minus(money(refunded._sum.amount ?? 0));

  return {
    totalRevenue: (totalRevenue.lessThan(0) ? money(0) : totalRevenue).toFixed(2),
    monthlyRevenue: money(monthPayments._sum.amount ?? 0).toFixed(2),
    activeClients,
    activeProjects,
    pendingPayments,
    servicesSold,
    demoRequests: newDemos,
    revenueChart,
    ordersChart,
    customerGrowth,
    topServices,
    projectStatus: projectGroups.map((row) => ({ status: row.status, count: row._count._all })),
  };
}

export async function listClients(query: { page: number; limit: number; search: string }) {
  const where = {
    role: 'CLIENT' as const,
    deletedAt: null,
    ...(query.search
      ? {
          OR: [
            { email: { contains: query.search, mode: 'insensitive' as const } },
            { firstName: { contains: query.search, mode: 'insensitive' as const } },
            { lastName: { contains: query.search, mode: 'insensitive' as const } },
            { clientProfile: { companyName: { contains: query.search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };
  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: { clientProfile: true },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  const clientIds = users.map((user) => user.clientProfile?.id).filter((id): id is string => Boolean(id));
  const [serviceCounts, projectCounts, orderCounts, spent] = await Promise.all([
    prisma.clientService.groupBy({ by: ['clientId'], where: { clientId: { in: clientIds } }, _count: { _all: true } }),
    prisma.project.groupBy({ by: ['clientId'], where: { clientId: { in: clientIds } }, _count: { _all: true } }),
    prisma.order.groupBy({ by: ['clientId'], where: { clientId: { in: clientIds } }, _count: { _all: true } }),
    prisma.payment.groupBy({
      by: ['clientId'],
      where: { clientId: { in: clientIds }, status: { in: ['SUCCEEDED', 'PARTIALLY_REFUNDED'] } },
      _sum: { amount: true },
    }),
  ]);
  const countMap = (rows: Array<{ clientId: string; _count: { _all: number } }>) => new Map(rows.map((row) => [row.clientId, row._count._all]));
  const services = countMap(serviceCounts);
  const projects = countMap(projectCounts);
  const orders = countMap(orderCounts);
  const totals = new Map(spent.map((row) => [row.clientId, money(row._sum.amount ?? 0).toFixed(2)]));

  return {
    data: users.map((user) => ({
      id: user.id,
      clientId: user.clientProfile?.id ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      companyName: user.clientProfile?.companyName ?? null,
      status: user.status,
      createdAt: user.createdAt,
      services: user.clientProfile ? services.get(user.clientProfile.id) ?? 0 : 0,
      projects: user.clientProfile ? projects.get(user.clientProfile.id) ?? 0 : 0,
      orders: user.clientProfile ? orders.get(user.clientProfile.id) ?? 0 : 0,
      totalSpent: user.clientProfile ? totals.get(user.clientProfile.id) ?? '0.00' : '0.00',
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getClientDetail(id: string) {
  const profile = await prisma.clientProfile.findFirst({
    where: { OR: [{ id }, { userId: id }] },
    include: { user: true },
  });
  if (!profile || profile.user.deletedAt) {
    const { AppError } = await import('../utils/errors');
    throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found');
  }
  const clientId = profile.id;
  const [projects, services, orders, payments, invoices, activity] = await Promise.all([
    prisma.project.findMany({ where: { clientId }, include: { service: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.clientService.findMany({ where: { clientId }, include: { service: { select: { name: true } }, project: { select: { projectNumber: true } } } }),
    prisma.order.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' } }),
    prisma.payment.findMany({ where: { clientId }, include: { order: { select: { orderNumber: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.invoice.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' } }),
    prisma.notification.findMany({ where: { userId: profile.userId, channel: 'IN_APP' }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);
  const { passwordHash: _password, ...user } = profile.user;
  return { user, profile: { ...profile, user: undefined }, projects, services, orders, payments, invoices, activity };
}

export async function updateClient(
  id: string,
  input: { status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'; companyName?: string | null; phone?: string | null },
  actorId: string,
  meta: { ipAddress?: string; userAgent?: string },
) {
  const profile = await prisma.clientProfile.findFirst({ where: { OR: [{ id }, { userId: id }] }, include: { user: true } });
  if (!profile) {
    const { AppError } = await import('../utils/errors');
    throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found');
  }
  if (input.status) {
    await prisma.user.update({ where: { id: profile.userId }, data: { status: input.status, ...(input.phone !== undefined ? { phone: input.phone } : {}) } });
  } else if (input.phone !== undefined) {
    await prisma.user.update({ where: { id: profile.userId }, data: { phone: input.phone } });
  }
  if (input.companyName !== undefined) {
    await prisma.clientProfile.update({ where: { id: profile.id }, data: { companyName: input.companyName } });
  }
  const { writeAudit } = await import('./audit.service');
  await writeAudit({
    userId: actorId,
    action: 'CLIENT_UPDATED',
    entityType: 'Client',
    entityId: profile.id,
    oldValue: { status: profile.user.status, companyName: profile.companyName },
    newValue: input,
    ...meta,
  });
  return getClientDetail(profile.id);
}
