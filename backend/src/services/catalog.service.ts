import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { pageMeta, safeSort, type PaginationQuery } from '../utils/pagination';
import { slugify } from '../utils/slug';
import { writeAudit } from './audit.service';

const serviceInclude = {
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ServiceInclude;

export async function listPublicServices(query: PaginationQuery & { category?: string; featured?: boolean }) {
  const where: Prisma.ServiceWhereInput = {
    isPublished: true,
    isActive: true,
    ...(query.featured ? { isFeatured: true } : {}),
    ...(query.category ? { category: { slug: query.category, isActive: true } } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { shortDescription: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const sort = safeSort(query.sort, ['name', 'createdAt', 'price'], 'createdAt');
  const [total, data] = await prisma.$transaction([
    prisma.service.count({ where }),
    prisma.service.findMany({
      where,
      include: serviceInclude,
      orderBy: { [sort]: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return { data, pagination: pageMeta(query.page, query.limit, total) };
}

export async function getPublicService(slug: string) {
  const service = await prisma.service.findFirst({
    where: { slug, isPublished: true, isActive: true },
    include: {
      ...serviceInclude,
      faqs: { where: { isPublished: true }, orderBy: { sortOrder: 'asc' } },
      reviews: {
        where: { isPublished: true },
        orderBy: { createdAt: 'desc' },
        include: { client: { include: { user: { select: { firstName: true, lastName: true } } } } },
      },
    },
  });
  if (!service) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found');
  return service;
}

export async function listCategories(activeOnly = false) {
  return prisma.serviceCategory.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: 'asc' },
  });
}

export async function getAdminService(id: string) {
  const service = await prisma.service.findUnique({ where: { id }, include: serviceInclude });
  if (!service) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found');
  return service;
}

export async function listAdminServices(query: PaginationQuery & { categoryId?: string; isPublished?: boolean }) {
  const where: Prisma.ServiceWhereInput = {
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.isPublished !== undefined ? { isPublished: query.isPublished } : {}),
    ...(query.search
      ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { slug: { contains: query.search, mode: 'insensitive' } }] }
      : {}),
  };
  const sort = safeSort(query.sort, ['name', 'createdAt', 'updatedAt', 'price'], 'updatedAt');
  const [total, data] = await prisma.$transaction([
    prisma.service.count({ where }),
    prisma.service.findMany({
      where,
      include: serviceInclude,
      orderBy: { [sort]: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return { data, pagination: pageMeta(query.page, query.limit, total) };
}

type ServiceInput = {
  name: string;
  slug?: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  billingType: 'ONE_TIME' | 'RECURRING' | 'PROJECT' | 'CUSTOM';
  price: number;
  setupFee?: number;
  monthlyPrice?: number | null;
  currency?: string;
  features?: unknown;
  benefits?: unknown;
  useCases?: unknown;
  isFeatured?: boolean;
  isActive?: boolean;
  isPublished?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

async function ensureCategory(categoryId: string) {
  const category = await prisma.serviceCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
}

function serviceData(input: ServiceInput): Prisma.ServiceCreateInput {
  return {
    name: input.name.trim(),
    slug: slugify(input.slug || input.name),
    shortDescription: input.shortDescription.trim(),
    description: input.description.trim(),
    category: { connect: { id: input.categoryId } },
    billingType: input.billingType,
    price: input.price,
    setupFee: input.setupFee ?? 0,
    monthlyPrice: input.monthlyPrice ?? null,
    currency: (input.currency || 'USD').toUpperCase(),
    features: (input.features ?? []) as Prisma.InputJsonValue,
    benefits: (input.benefits ?? []) as Prisma.InputJsonValue,
    useCases: (input.useCases ?? []) as Prisma.InputJsonValue,
    isFeatured: input.isFeatured ?? false,
    isActive: input.isActive ?? true,
    isPublished: input.isPublished ?? false,
    seoTitle: input.seoTitle?.trim() || null,
    seoDescription: input.seoDescription?.trim() || null,
  };
}

export async function createService(input: ServiceInput, actorId: string, meta: { ipAddress?: string; userAgent?: string }) {
  await ensureCategory(input.categoryId);
  const data = serviceData(input);
  if (!data.slug) throw new AppError(400, 'INVALID_SLUG', 'A valid slug is required');
  const service = await prisma.service.create({ data, include: serviceInclude });
  await writeAudit({
    userId: actorId,
    action: 'SERVICE_CREATED',
    entityType: 'Service',
    entityId: service.id,
    newValue: { name: service.name, slug: service.slug },
    ...meta,
  });
  return service;
}

export async function updateService(
  id: string,
  input: Partial<ServiceInput>,
  actorId: string,
  meta: { ipAddress?: string; userAgent?: string },
) {
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found');
  if (input.categoryId) await ensureCategory(input.categoryId);

  const service = await prisma.service.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.slug !== undefined ? { slug: slugify(input.slug) } : {}),
      ...(input.shortDescription !== undefined ? { shortDescription: input.shortDescription.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.categoryId !== undefined ? { category: { connect: { id: input.categoryId } } } : {}),
      ...(input.billingType !== undefined ? { billingType: input.billingType } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.setupFee !== undefined ? { setupFee: input.setupFee } : {}),
      ...(input.monthlyPrice !== undefined ? { monthlyPrice: input.monthlyPrice } : {}),
      ...(input.currency !== undefined ? { currency: input.currency.toUpperCase() } : {}),
      ...(input.features !== undefined ? { features: input.features as Prisma.InputJsonValue } : {}),
      ...(input.benefits !== undefined ? { benefits: input.benefits as Prisma.InputJsonValue } : {}),
      ...(input.useCases !== undefined ? { useCases: input.useCases as Prisma.InputJsonValue } : {}),
      ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
      ...(input.seoTitle !== undefined ? { seoTitle: input.seoTitle?.trim() || null } : {}),
      ...(input.seoDescription !== undefined ? { seoDescription: input.seoDescription?.trim() || null } : {}),
    },
    include: serviceInclude,
  });

  await writeAudit({
    userId: actorId,
    action: 'SERVICE_UPDATED',
    entityType: 'Service',
    entityId: id,
    oldValue: { name: existing.name, isPublished: existing.isPublished, isActive: existing.isActive },
    newValue: { name: service.name, isPublished: service.isPublished, isActive: service.isActive },
    ...meta,
  });
  return service;
}

export async function setPublished(id: string, isPublished: boolean, actorId: string, meta: { ipAddress?: string; userAgent?: string }) {
  return updateService(id, { isPublished }, actorId, meta);
}

export async function archiveService(id: string, actorId: string, meta: { ipAddress?: string; userAgent?: string }) {
  return updateService(id, { isActive: false, isPublished: false }, actorId, meta);
}

export async function deleteService(id: string, actorId: string, meta: { ipAddress?: string; userAgent?: string }) {
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found');
  const [orders, projects] = await prisma.$transaction([
    prisma.orderItem.count({ where: { serviceId: id } }),
    prisma.project.count({ where: { serviceId: id } }),
  ]);
  if (orders > 0 || projects > 0) {
    throw new AppError(409, 'SERVICE_IN_USE', 'This service has orders or projects. Archive it instead of deleting it.');
  }
  await prisma.service.delete({ where: { id } });
  await writeAudit({
    userId: actorId,
    action: 'SERVICE_DELETED',
    entityType: 'Service',
    entityId: id,
    oldValue: { name: existing.name, slug: existing.slug },
    ...meta,
  });
}

export async function createCategory(input: { name: string; slug?: string; description?: string; isActive?: boolean }) {
  return prisma.serviceCategory.create({
    data: {
      name: input.name.trim(),
      slug: slugify(input.slug || input.name),
      description: input.description?.trim() || null,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateCategory(
  id: string,
  input: { name?: string; slug?: string; description?: string | null; isActive?: boolean },
) {
  const existing = await prisma.serviceCategory.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
  return prisma.serviceCategory.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.slug !== undefined ? { slug: slugify(input.slug) } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function deleteCategory(id: string) {
  const inUse = await prisma.service.count({ where: { categoryId: id } });
  if (inUse > 0) throw new AppError(409, 'CATEGORY_IN_USE', 'Move services out of this category before deleting it.');
  await prisma.serviceCategory.delete({ where: { id } });
}
