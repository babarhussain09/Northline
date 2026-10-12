import type { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { sendEmail, type EmailMessage } from '../integrations/email/mailer';

export async function notifyUser(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  email?: EmailMessage;
}) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      channel: 'IN_APP',
      title: input.title,
      message: input.message,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  if (!input.email) return;

  try {
    const sent = await sendEmail(input.email);
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        channel: 'EMAIL',
        title: input.title,
        message: input.message,
        isRead: true,
        metadata: { sent } as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : 'email failed', userId: input.userId }, 'notification email failed');
  }
}
