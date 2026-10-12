import type { Prisma } from '@prisma/client';

export async function nextNumber(tx: Prisma.TransactionClient, key: string, prefix: string) {
  const year = new Date().getUTCFullYear();
  const counterKey = `${key}-${year}`;
  const counter = await tx.counter.upsert({
    where: { key: counterKey },
    create: { key: counterKey, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${prefix}-${year}-${String(counter.value).padStart(4, '0')}`;
}
