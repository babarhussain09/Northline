import type { ContactStatus, DemoStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { pageMeta, type PaginationQuery } from '../utils/pagination';
import { sendEmail } from '../integrations/email/mailer';
import { contactRequestEmail, demoRequestEmail } from '../integrations/email/templates';
import { notifyAddress } from './settings.service';
import { logger } from '../config/logger';

export async function listReviews(query: PaginationQuery & { serviceId?: string; publishedOnly?: boolean }) {
  const where: Prisma.ReviewWhereInput = {
    ...(query.publishedOnly ? { isPublished: true } : {}),
    ...(query.serviceId ? { serviceId: query.serviceId } : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      include: {
        service: { select: { name: true, slug: true } },
        client: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  const data = rows.map((review) => ({
    id: review.id,
    rating: review.rating,
    title: review.title,
    content: review.content,
    isPublished: review.isPublished,
    createdAt: review.createdAt,
    service: review.service,
    author: `${review.client.user.firstName} ${review.client.user.lastName.charAt(0)}.`,
  }));
  return { data, pagination: pageMeta(query.page, query.limit, total) };
}

export async function createReview(clientId: string, input: { serviceId: string; rating: number; title: string; content: string }) {
  const owned = await prisma.clientService.findFirst({ where: { clientId, serviceId: input.serviceId } });
  const purchased = await prisma.orderItem.findFirst({
    where: { serviceId: input.serviceId, order: { clientId, status: 'PAID' } },
  });
  if (!owned && !purchased) {
    throw new AppError(403, 'REVIEW_NOT_ALLOWED', 'You can review a service after you purchase it');
  }
  return prisma.review.create({
    data: {
      clientId,
      serviceId: input.serviceId,
      rating: input.rating,
      title: input.title.trim(),
      content: input.content.trim(),
      isPublished: false,
    },
  });
}

export async function setReviewPublished(id: string, isPublished: boolean) {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new AppError(404, 'REVIEW_NOT_FOUND', 'Review not found');
  return prisma.review.update({ where: { id }, data: { isPublished } });
}

export async function listFaqs(query: { serviceId?: string; globalOnly?: boolean; includeUnpublished?: boolean }) {
  return prisma.faq.findMany({
    where: {
      ...(query.includeUnpublished ? {} : { isPublished: true }),
      ...(query.globalOnly ? { serviceId: null } : {}),
      ...(query.serviceId ? { serviceId: query.serviceId } : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { service: { select: { name: true, slug: true } } },
  });
}

export async function createFaq(input: { serviceId?: string | null; question: string; answer: string; sortOrder?: number; isPublished?: boolean }) {
  if (input.serviceId) {
    const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
    if (!service) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found');
  }
  return prisma.faq.create({
    data: {
      serviceId: input.serviceId || null,
      question: input.question.trim(),
      answer: input.answer.trim(),
      sortOrder: input.sortOrder ?? 0,
      isPublished: input.isPublished ?? true,
    },
  });
}

export async function updateFaq(
  id: string,
  input: { serviceId?: string | null; question?: string; answer?: string; sortOrder?: number; isPublished?: boolean },
) {
  const faq = await prisma.faq.findUnique({ where: { id } });
  if (!faq) throw new AppError(404, 'FAQ_NOT_FOUND', 'FAQ not found');
  return prisma.faq.update({
    where: { id },
    data: {
      ...(input.serviceId !== undefined ? { serviceId: input.serviceId } : {}),
      ...(input.question !== undefined ? { question: input.question.trim() } : {}),
      ...(input.answer !== undefined ? { answer: input.answer.trim() } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
    },
  });
}

export async function deleteFaq(id: string) {
  const faq = await prisma.faq.findUnique({ where: { id } });
  if (!faq) throw new AppError(404, 'FAQ_NOT_FOUND', 'FAQ not found');
  await prisma.faq.delete({ where: { id } });
}

export async function createDemoRequest(input: {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  serviceId?: string;
  preferredDate?: string;
  preferredTime?: string;
  message?: string;
}) {
  if (input.serviceId) {
    const service = await prisma.service.findFirst({ where: { id: input.serviceId, isPublished: true, isActive: true } });
    if (!service) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found');
  }
  const request = await prisma.demoRequest.create({
    data: {
      name: input.name.trim(),
      email: input.email.toLowerCase().trim(),
      company: input.company?.trim() || null,
      phone: input.phone?.trim() || null,
      serviceId: input.serviceId || null,
      preferredDate: input.preferredDate ? new Date(input.preferredDate) : null,
      preferredTime: input.preferredTime?.trim() || null,
      message: input.message?.trim() || null,
    },
    include: { service: { select: { name: true } } },
  });
  const details = [
    `Name: ${request.name}`,
    `Email: ${request.email}`,
    `Company: ${request.company ?? '-'}`,
    `Phone: ${request.phone ?? '-'}`,
    `Service: ${request.service?.name ?? '-'}`,
    `Date: ${request.preferredDate?.toISOString().slice(0, 10) ?? '-'}`,
    `Time: ${request.preferredTime ?? '-'}`,
    `Message: ${request.message ?? '-'}`,
  ].join('\n');
  try {
    const message = demoRequestEmail(details);
    await sendEmail({ to: await notifyAddress(), ...message });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : 'email failed' }, 'demo notification failed');
  }
  return { id: request.id, status: request.status };
}

export async function listDemoRequests(query: PaginationQuery & { status?: DemoStatus }) {
  const where: Prisma.DemoRequestWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { company: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [total, data] = await prisma.$transaction([
    prisma.demoRequest.count({ where }),
    prisma.demoRequest.findMany({
      where,
      include: { service: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return { data, pagination: pageMeta(query.page, query.limit, total) };
}

export async function updateDemoRequest(id: string, status: DemoStatus) {
  const request = await prisma.demoRequest.findUnique({ where: { id } });
  if (!request) throw new AppError(404, 'DEMO_NOT_FOUND', 'Demo request not found');
  return prisma.demoRequest.update({ where: { id }, data: { status } });
}

export async function createContactRequest(input: { name: string; email: string; company?: string; subject: string; message: string }) {
  const request = await prisma.contactRequest.create({
    data: {
      name: input.name.trim(),
      email: input.email.toLowerCase().trim(),
      company: input.company?.trim() || null,
      subject: input.subject.trim(),
      message: input.message.trim(),
    },
  });
  const details = [`Name: ${request.name}`, `Email: ${request.email}`, `Company: ${request.company ?? '-'}`, `Subject: ${request.subject}`, '', request.message].join('\n');
  try {
    const message = contactRequestEmail(details);
    await sendEmail({ to: await notifyAddress(), ...message });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : 'email failed' }, 'contact notification failed');
  }
  return { id: request.id };
}

export async function listContactRequests(query: PaginationQuery & { status?: ContactStatus }) {
  const where: Prisma.ContactRequestWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { subject: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [total, data] = await prisma.$transaction([
    prisma.contactRequest.count({ where }),
    prisma.contactRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return { data, pagination: pageMeta(query.page, query.limit, total) };
}

export async function updateContactRequest(id: string, status: ContactStatus) {
  const request = await prisma.contactRequest.findUnique({ where: { id } });
  if (!request) throw new AppError(404, 'CONTACT_NOT_FOUND', 'Contact request not found');
  return prisma.contactRequest.update({ where: { id }, data: { status } });
}
