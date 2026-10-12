import type { Prisma } from '@prisma/client';
import type { AuditAction } from '@prisma/client';
import { prisma } from '../config/prisma';
import { sanitizeForLog } from '../utils/sanitize';

type AuditInput = {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
};

export async function writeAudit(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValue: sanitizeForLog(input.oldValue) as Prisma.InputJsonValue | undefined,
      newValue: sanitizeForLog(input.newValue) as Prisma.InputJsonValue | undefined,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent?.slice(0, 255),
    },
  });
}

export function requestMeta(req: { ip?: string; headers: { 'user-agent'?: string } }) {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };
}
