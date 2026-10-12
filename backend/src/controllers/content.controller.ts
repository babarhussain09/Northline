import { asyncHandler } from '../utils/asyncHandler';
import { created, ok, paginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import { clientIdFromRequest } from '../middleware/authenticate';
import * as content from '../services/content.service';
import { contactSchema, demoSchema, demoStatusSchema, contactStatusSchema, faqSchema, faqUpdateSchema, reviewSchema, publishSchema } from '../validators/schemas';
import type { ContactStatus, DemoStatus } from '@prisma/client';

export const listReviews = asyncHandler(async (req, res) => {
  const result = await content.listReviews({
    ...parsePagination(req.query),
    serviceId: typeof req.query.serviceId === 'string' ? req.query.serviceId : undefined,
    publishedOnly: true,
  });
  return paginated(res, result.data, result.pagination);
});

export const createReview = asyncHandler(async (req, res) => {
  return created(res, await content.createReview(clientIdFromRequest(req), reviewSchema.parse(req.body)));
});

export const adminReviews = asyncHandler(async (req, res) => {
  const result = await content.listReviews({
    ...parsePagination(req.query),
    serviceId: typeof req.query.serviceId === 'string' ? req.query.serviceId : undefined,
    publishedOnly: false,
  });
  return paginated(res, result.data, result.pagination);
});

export const publishReview = asyncHandler(async (req, res) => {
  return ok(res, await content.setReviewPublished(String(req.params.id), publishSchema.parse(req.body).isPublished));
});

export const listFaqs = asyncHandler(async (req, res) => {
  return ok(
    res,
    await content.listFaqs({
      serviceId: typeof req.query.serviceId === 'string' ? req.query.serviceId : undefined,
      globalOnly: req.query.global === 'true',
    }),
  );
});

export const adminFaqs = asyncHandler(async (req, res) => {
  return ok(
    res,
    await content.listFaqs({
      serviceId: typeof req.query.serviceId === 'string' ? req.query.serviceId : undefined,
      includeUnpublished: true,
    }),
  );
});

export const createFaq = asyncHandler(async (req, res) => created(res, await content.createFaq(faqSchema.parse(req.body))));
export const updateFaq = asyncHandler(async (req, res) => ok(res, await content.updateFaq(String(req.params.id), faqUpdateSchema.parse(req.body))));
export const deleteFaq = asyncHandler(async (req, res) => {
  await content.deleteFaq(String(req.params.id));
  return ok(res, { deleted: true });
});

export const createDemo = asyncHandler(async (req, res) => created(res, await content.createDemoRequest(demoSchema.parse(req.body))));
export const listDemos = asyncHandler(async (req, res) => {
  const result = await content.listDemoRequests({
    ...parsePagination(req.query),
    status: typeof req.query.status === 'string' && req.query.status ? (req.query.status as DemoStatus) : undefined,
  });
  return paginated(res, result.data, result.pagination);
});
export const updateDemo = asyncHandler(async (req, res) => ok(res, await content.updateDemoRequest(String(req.params.id), demoStatusSchema.parse(req.body).status)));

export const createContact = asyncHandler(async (req, res) => created(res, await content.createContactRequest(contactSchema.parse(req.body))));
export const listContacts = asyncHandler(async (req, res) => {
  const result = await content.listContactRequests({
    ...parsePagination(req.query),
    status: typeof req.query.status === 'string' && req.query.status ? (req.query.status as ContactStatus) : undefined,
  });
  return paginated(res, result.data, result.pagination);
});
export const updateContact = asyncHandler(async (req, res) =>
  ok(res, await content.updateContactRequest(String(req.params.id), contactStatusSchema.parse(req.body).status)),
);
