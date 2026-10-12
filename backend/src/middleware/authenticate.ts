import type { Request, RequestHandler } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { verifyAccessToken } from '../utils/tokens';

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const payload = verifyAccessToken(header.slice(7));
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      include: { clientProfile: { select: { id: true } } },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      clientId: user.clientProfile?.id,
    };
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
  }
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
    return;
  }
  if (req.user.role !== 'ADMIN') {
    next(new AppError(403, 'FORBIDDEN', 'Admin access required'));
    return;
  }
  next();
};

export const requireClient: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
    return;
  }
  if (req.user.role !== 'CLIENT' || !req.user.clientId) {
    next(new AppError(403, 'FORBIDDEN', 'Client access required'));
    return;
  }
  next();
};

export function clientIdFromRequest(req: Request) {
  if (!req.user?.clientId) {
    throw new AppError(403, 'FORBIDDEN', 'Client access required');
  }
  return req.user.clientId;
}
