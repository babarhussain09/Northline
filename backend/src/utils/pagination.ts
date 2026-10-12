import { z } from 'zod';

const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional().default(''),
  sort: z.string().trim().optional().default('createdAt'),
  sortOrder: sortOrderSchema,
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export function parsePagination(input: unknown): PaginationQuery {
  return paginationSchema.parse(input);
}

export function pageMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

const allowedSort = /^[a-zA-Z][a-zA-Z0-9]*$/;

export function safeSort(sort: string, allowed: string[], fallback = 'createdAt') {
  if (allowed.includes(sort) && allowedSort.test(sort)) return sort;
  return fallback;
}
