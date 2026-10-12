import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function transport() {
  if (!env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
}

export async function sendEmail(message: EmailMessage) {
  const smtp = transport();
  if (!smtp) {
    if (env.NODE_ENV === 'development') {
      logger.info({ to: message.to, subject: message.subject, text: message.text }, 'email skipped, SMTP not configured');
    } else {
      logger.warn({ to: message.to, subject: message.subject }, 'email skipped, SMTP not configured');
    }
    return false;
  }

  await smtp.sendMail({
    from: env.SMTP_FROM,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
  return true;
}
