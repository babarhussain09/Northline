import type { MilestoneStatus, Prisma, ProjectStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { pageMeta, safeSort, type PaginationQuery } from '../utils/pagination';
import { writeAudit } from './audit.service';
import { nextNumber } from './numbering.service';
import { notifyUser } from './notification.service';
import { projectCompletedEmail } from '../integrations/email/templates';

const projectInclude = {
  service: { select: { id: true, name: true, slug: true, billingType: true } },
  client: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
  milestones: { orderBy: { sortOrder: 'asc' as const } },
  notes: { include: { author: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' as const } },
  activities: { orderBy: { createdAt: 'desc' as const } },
  order: { select: { id: true, orderNumber: true, status: true, total: true, currency: true } },
} satisfies Prisma.ProjectInclude;

function listWhere(query: PaginationQuery & { status?: ProjectStatus; clientId?: string }): Prisma.ProjectWhereInput {
  return {
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { projectNumber: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}

export async function listProjects(query: PaginationQuery & { status?: ProjectStatus; clientId?: string }) {
  const where = listWhere(query);
  const sort = safeSort(query.sort, ['createdAt', 'name', 'status', 'expectedCompletionDate'], 'createdAt');
  const [total, data] = await prisma.$transaction([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      include: {
        service: { select: { id: true, name: true, slug: true } },
        client: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      },
      orderBy: { [sort]: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return { data, pagination: pageMeta(query.page, query.limit, total) };
}

export async function getProject(id: string, clientId?: string) {
  const project = await prisma.project.findFirst({
    where: { id, ...(clientId ? { clientId } : {}) },
    include: projectInclude,
  });
  if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  return project;
}

const DEFAULT_MILESTONES = [
  { title: 'Kickoff', description: 'Confirm scope, access, and what success looks like.' },
  { title: 'Discovery', description: 'Map the workflow, systems, and constraints.' },
  { title: 'Build', description: 'Implement the agent, automation, or software.' },
  { title: 'Review', description: 'Walk through the result and make adjustments.' },
  { title: 'Handover', description: 'Deliver access, notes, and the next operating steps.' },
];

export async function createProject(
  input: {
    clientId: string;
    serviceId: string;
    name: string;
    description?: string;
    status?: ProjectStatus;
    startDate?: string | null;
    expectedCompletionDate?: string | null;
    totalAmount: number;
    currency?: string;
  },
  actorId: string,
  meta: { ipAddress?: string; userAgent?: string },
) {
  const client = await prisma.clientProfile.findUnique({ where: { id: input.clientId }, include: { user: true } });
  if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found');
  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found');

  const project = await prisma.$transaction(async (tx) => {
    const projectNumber = await nextNumber(tx, 'project', 'PRJ');
    return tx.project.create({
      data: {
        projectNumber,
        clientId: input.clientId,
        serviceId: input.serviceId,
        name: input.name.trim(),
        description: input.description?.trim() || service.shortDescription,
        status: input.status ?? 'PAID',
        startDate: input.startDate ? new Date(input.startDate) : new Date(),
        expectedCompletionDate: input.expectedCompletionDate ? new Date(input.expectedCompletionDate) : null,
        totalAmount: input.totalAmount,
        currency: (input.currency || service.currency).toUpperCase(),
        milestones: { create: DEFAULT_MILESTONES.map((milestone, index) => ({ ...milestone, sortOrder: index })) },
        activities: { create: { message: 'Project created.' } },
      },
      include: projectInclude,
    });
  });

  await writeAudit({
    userId: actorId,
    action: 'PROJECT_UPDATED',
    entityType: 'Project',
    entityId: project.id,
    newValue: { projectNumber: project.projectNumber, status: project.status },
    ...meta,
  });
  return project;
}

export async function updateProject(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    status?: ProjectStatus;
    serviceId?: string;
    clientId?: string;
    startDate?: string | null;
    expectedCompletionDate?: string | null;
    actualCompletionDate?: string | null;
    totalAmount?: number;
  },
  actorId: string,
  meta: { ipAddress?: string; userAgent?: string },
) {
  const existing = await prisma.project.findUnique({ where: { id }, include: { client: { include: { user: true } } } });
  if (!existing) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  if (input.serviceId) {
    const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
    if (!service) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found');
  }
  if (input.clientId) {
    const client = await prisma.clientProfile.findUnique({ where: { id: input.clientId } });
    if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found');
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.serviceId !== undefined ? { serviceId: input.serviceId } : {}),
      ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate ? new Date(input.startDate) : null } : {}),
      ...(input.expectedCompletionDate !== undefined
        ? { expectedCompletionDate: input.expectedCompletionDate ? new Date(input.expectedCompletionDate) : null }
        : {}),
      ...(input.actualCompletionDate !== undefined
        ? { actualCompletionDate: input.actualCompletionDate ? new Date(input.actualCompletionDate) : null }
        : {}),
      ...(input.totalAmount !== undefined ? { totalAmount: input.totalAmount } : {}),
      ...(input.status === 'COMPLETED' && !input.actualCompletionDate ? { actualCompletionDate: new Date() } : {}),
    },
    include: projectInclude,
  });

  if (input.status && input.status !== existing.status) {
    await prisma.projectActivity.create({
      data: { projectId: id, message: `Status changed from ${existing.status} to ${input.status}.` },
    });
    const user = existing.client.user;
    const completed = input.status === 'COMPLETED';
    await notifyUser({
      userId: user.id,
      type: completed ? 'PROJECT_COMPLETED' : 'PROJECT_STATUS_CHANGED',
      title: completed ? 'Project completed' : 'Project updated',
      message: completed
        ? `${project.name} is complete.`
        : `${project.name} is now ${input.status.replaceAll('_', ' ').toLowerCase()}.`,
      metadata: { projectId: id, status: input.status },
      email: completed
        ? { to: user.email, ...projectCompletedEmail(user.firstName, project.projectNumber, project.name) }
        : undefined,
    });
  }

  await writeAudit({
    userId: actorId,
    action: 'PROJECT_UPDATED',
    entityType: 'Project',
    entityId: id,
    oldValue: { status: existing.status, name: existing.name },
    newValue: { status: project.status, name: project.name },
    ...meta,
  });
  return project;
}

export async function updateMilestone(
  projectId: string,
  milestoneId: string,
  input: { title?: string; description?: string | null; status?: MilestoneStatus; dueDate?: string | null; sortOrder?: number },
) {
  const milestone = await prisma.projectMilestone.findFirst({ where: { id: milestoneId, projectId } });
  if (!milestone) throw new AppError(404, 'MILESTONE_NOT_FOUND', 'Milestone not found');
  const updated = await prisma.projectMilestone.update({
    where: { id: milestoneId },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate ? new Date(input.dueDate) : null } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.status === 'COMPLETED' ? { completedAt: new Date() } : {}),
      ...(input.status && input.status !== 'COMPLETED' ? { completedAt: null } : {}),
    },
  });
  if (input.status && input.status !== milestone.status) {
    await prisma.projectActivity.create({
      data: { projectId, message: `Milestone "${updated.title}" is now ${input.status.replaceAll('_', ' ').toLowerCase()}.` },
    });
  }
  return updated;
}

export async function addProjectNote(projectId: string, authorId: string, content: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  const note = await prisma.projectNote.create({
    data: { projectId, authorId, content: content.trim() },
    include: { author: { select: { firstName: true, lastName: true } } },
  });
  await prisma.projectActivity.create({ data: { projectId, message: 'A note was added.' } });
  return note;
}
