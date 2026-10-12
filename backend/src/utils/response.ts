import type { Response } from 'express';

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function ok(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function created(res: Response, data: unknown) {
  return ok(res, data, 201);
}

export function paginated(res: Response, data: unknown, pagination: Pagination) {
  return res.status(200).json({ success: true, data, pagination });
}
