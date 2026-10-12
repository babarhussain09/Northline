import { asyncHandler } from '../utils/asyncHandler';
import { created, ok, paginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import { requestMeta } from '../services/audit.service';
import * as catalog from '../services/catalog.service';
import { categorySchema, categoryUpdateSchema, serviceSchema, serviceUpdateSchema } from '../validators/schemas';

export const listPublic = asyncHandler(async (req, res) => {
  const query = parsePagination(req.query);
  const result = await catalog.listPublicServices({
    ...query,
    category: typeof req.query.category === 'string' ? req.query.category : undefined,
    featured: req.query.featured === 'true',
  });
  return paginated(res, result.data, result.pagination);
});

export const getPublic = asyncHandler(async (req, res) => {
  return ok(res, await catalog.getPublicService(String(req.params.slug)));
});

export const listCategories = asyncHandler(async (_req, res) => {
  return ok(res, await catalog.listCategories(true));
});

export const adminList = asyncHandler(async (req, res) => {
  const query = parsePagination(req.query);
  const result = await catalog.listAdminServices({
    ...query,
    categoryId: typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined,
    isPublished: req.query.isPublished === 'true' ? true : req.query.isPublished === 'false' ? false : undefined,
  });
  return paginated(res, result.data, result.pagination);
});

export const adminGet = asyncHandler(async (req, res) => ok(res, await catalog.getAdminService(String(req.params.id))));

export const adminCreate = asyncHandler(async (req, res) => {
  const service = await catalog.createService(serviceSchema.parse(req.body), req.user!.id, requestMeta(req));
  return created(res, service);
});

export const adminUpdate = asyncHandler(async (req, res) => {
  const service = await catalog.updateService(String(req.params.id), serviceUpdateSchema.parse(req.body), req.user!.id, requestMeta(req));
  return ok(res, service);
});

export const adminPublish = asyncHandler(async (req, res) => {
  return ok(res, await catalog.setPublished(String(req.params.id), true, req.user!.id, requestMeta(req)));
});

export const adminUnpublish = asyncHandler(async (req, res) => {
  return ok(res, await catalog.setPublished(String(req.params.id), false, req.user!.id, requestMeta(req)));
});

export const adminArchive = asyncHandler(async (req, res) => {
  return ok(res, await catalog.archiveService(String(req.params.id), req.user!.id, requestMeta(req)));
});

export const adminDelete = asyncHandler(async (req, res) => {
  await catalog.deleteService(String(req.params.id), req.user!.id, requestMeta(req));
  return ok(res, { deleted: true });
});

export const adminCategories = asyncHandler(async (_req, res) => {
  return ok(res, await catalog.listCategories(false));
});

export const createCategory = asyncHandler(async (req, res) => {
  return created(res, await catalog.createCategory(categorySchema.parse(req.body)));
});

export const updateCategory = asyncHandler(async (req, res) => {
  return ok(res, await catalog.updateCategory(String(req.params.id), categoryUpdateSchema.parse(req.body)));
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await catalog.deleteCategory(String(req.params.id));
  return ok(res, { deleted: true });
});
