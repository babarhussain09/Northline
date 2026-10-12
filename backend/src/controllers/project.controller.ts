import type { ProjectStatus } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { created, ok, paginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import { clientIdFromRequest } from '../middleware/authenticate';
import { requestMeta } from '../services/audit.service';
import * as projects from '../services/project.service';
import { milestoneSchema, noteSchema, projectSchema, projectUpdateSchema } from '../validators/schemas';

export const listMine = asyncHandler(async (req, res) => {
  const query = parsePagination(req.query);
  const result = await projects.listProjects({
    ...query,
    clientId: clientIdFromRequest(req),
    status: typeof req.query.status === 'string' && req.query.status ? (req.query.status as ProjectStatus) : undefined,
  });
  return paginated(res, result.data, result.pagination);
});

export const getMine = asyncHandler(async (req, res) => ok(res, await projects.getProject(String(req.params.id), clientIdFromRequest(req))));

export const adminList = asyncHandler(async (req, res) => {
  const query = parsePagination(req.query);
  const result = await projects.listProjects({
    ...query,
    clientId: typeof req.query.clientId === 'string' ? req.query.clientId : undefined,
    status: typeof req.query.status === 'string' && req.query.status ? (req.query.status as ProjectStatus) : undefined,
  });
  return paginated(res, result.data, result.pagination);
});

export const adminGet = asyncHandler(async (req, res) => ok(res, await projects.getProject(String(req.params.id))));

export const adminCreate = asyncHandler(async (req, res) => {
  return created(res, await projects.createProject(projectSchema.parse(req.body), req.user!.id, requestMeta(req)));
});

export const adminUpdate = asyncHandler(async (req, res) => {
  return ok(res, await projects.updateProject(String(req.params.id), projectUpdateSchema.parse(req.body), req.user!.id, requestMeta(req)));
});

export const adminMilestone = asyncHandler(async (req, res) => {
  return ok(res, await projects.updateMilestone(String(req.params.id), String(req.params.milestoneId), milestoneSchema.parse(req.body)));
});

export const adminNote = asyncHandler(async (req, res) => {
  return created(res, await projects.addProjectNote(String(req.params.id), req.user!.id, noteSchema.parse(req.body).content));
});
