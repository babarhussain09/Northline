import { prisma } from '../config/prisma';

export async function cleanupExpiredTokens() {
  const now = new Date();
  await prisma.authToken.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] } });
  await prisma.refreshToken.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }] } });
}
