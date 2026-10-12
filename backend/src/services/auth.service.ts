import type { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { hashPassword, verifyPassword } from '../utils/password';
import { hashToken, randomToken, signAccessToken } from '../utils/tokens';
import { publicUser } from '../utils/user';
import { sendEmail, type EmailMessage } from '../integrations/email/mailer';
import { logger } from '../config/logger';
import { passwordResetEmail, verificationEmail, welcomeEmail } from '../integrations/email/templates';

const ACCESS_COOKIE = 'refreshToken';

async function deliver(message: EmailMessage) {
  try {
    await sendEmail(message);
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : 'email failed', to: message.to }, 'email delivery failed');
  }
}

export function refreshCookieName() {
  return ACCESS_COOKIE;
}

function refreshExpiry() {
  return new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
}

async function issueRefreshToken(userId: string, meta: { ipAddress?: string; userAgent?: string }) {
  const token = randomToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: refreshExpiry(),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent?.slice(0, 255),
    },
  });
  return token;
}

async function issueAuthToken(userId: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET', hours: number) {
  const token = randomToken();
  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
    },
  });
  return token;
}

export async function register(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  companyName?: string;
}) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, 'EMAIL_IN_USE', 'An account with this email already exists');
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(input.password),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone?.trim() || null,
      role: 'CLIENT',
      clientProfile: {
        create: {
          companyName: input.companyName?.trim() || null,
        },
      },
    },
  });

  const token = await issueAuthToken(user.id, 'EMAIL_VERIFICATION', 24);
  const link = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  const welcome = welcomeEmail(user.firstName);
  const verification = verificationEmail(user.firstName, link);
  await deliver({ to: user.email, ...welcome });
  await deliver({ to: user.email, ...verification });

  return publicUser(user);
}

export async function login(
  input: { email: string; password: string },
  meta: { ipAddress?: string; userAgent?: string },
) {
  const email = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user ? await verifyPassword(user.passwordHash, input.password) : false;

  if (!user || !valid || user.deletedAt) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }
  if (user.status === 'SUSPENDED') {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended');
  }
  if (user.status !== 'ACTIVE') {
    throw new AppError(403, 'ACCOUNT_INACTIVE', 'This account is inactive');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const refreshToken = await issueRefreshToken(user.id, meta);
  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  return { accessToken, refreshToken, user: publicUser(user) };
}

export async function logout(rawToken: string | undefined) {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function refresh(rawToken: string | undefined, meta: { ipAddress?: string; userAgent?: string }) {
  if (!rawToken) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Session expired');
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });

  if (!stored || stored.user.deletedAt || stored.user.status !== 'ACTIVE') {
    throw new AppError(401, 'UNAUTHENTICATED', 'Session expired');
  }

  if (stored.revokedAt || stored.expiresAt < new Date()) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new AppError(401, 'UNAUTHENTICATED', 'Session expired');
  }

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  const refreshToken = await issueRefreshToken(stored.userId, meta);
  const accessToken = signAccessToken({
    sub: stored.user.id,
    role: stored.user.role as Role,
    email: stored.user.email,
  });
  return { accessToken, refreshToken, user: publicUser(stored.user) };
}

export async function forgotPassword(emailInput: string) {
  const email = emailInput.toLowerCase().trim();
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null, status: 'ACTIVE' } });
  if (!user) return;

  await prisma.authToken.updateMany({
    where: { userId: user.id, type: 'PASSWORD_RESET', usedAt: null },
    data: { usedAt: new Date() },
  });
  const token = await issueAuthToken(user.id, 'PASSWORD_RESET', 1);
  const link = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  const message = passwordResetEmail(user.firstName, link);
  await deliver({ to: user.email, ...message });
}

export async function resetPassword(token: string, password: string) {
  const stored = await prisma.authToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!stored || stored.type !== 'PASSWORD_RESET' || stored.usedAt || stored.expiresAt < new Date()) {
    throw new AppError(400, 'INVALID_TOKEN', 'This reset link is invalid or has expired');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    prisma.authToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function verifyEmail(token: string) {
  const stored = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!stored || stored.type !== 'EMAIL_VERIFICATION' || stored.usedAt || stored.expiresAt < new Date()) {
    throw new AppError(400, 'INVALID_TOKEN', 'This verification link is invalid or has expired');
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { emailVerified: true } }),
    prisma.authToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
  ]);
}

export async function resendVerification(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  if (user.emailVerified) return;
  const token = await issueAuthToken(user.id, 'EMAIL_VERIFICATION', 24);
  const link = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  const message = verificationEmail(user.firstName, link);
  await deliver({ to: user.email, ...message });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { clientProfile: true },
  });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  const { passwordHash: _password, ...safe } = user;
  return safe;
}

export async function updateProfile(
  userId: string,
  input: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    companyName?: string | null;
    companyWebsite?: string | null;
    country?: string | null;
    address?: string | null;
    taxId?: string | null;
  },
) {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null }, include: { clientProfile: true } });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');

  const data: Prisma.UserUpdateInput = {};
  if (input.firstName !== undefined) data.firstName = input.firstName.trim();
  if (input.lastName !== undefined) data.lastName = input.lastName.trim();
  if (input.phone !== undefined) data.phone = input.phone?.trim() || null;

  const profileData = {
    companyName: input.companyName,
    companyWebsite: input.companyWebsite,
    country: input.country,
    address: input.address,
    taxId: input.taxId,
  };
  const hasProfileUpdate = Object.values(profileData).some((value) => value !== undefined);

  await prisma.user.update({ where: { id: userId }, data });
  if (hasProfileUpdate && user.clientProfile) {
    await prisma.clientProfile.update({
      where: { userId },
      data: {
        ...(input.companyName !== undefined ? { companyName: input.companyName?.trim() || null } : {}),
        ...(input.companyWebsite !== undefined ? { companyWebsite: input.companyWebsite?.trim() || null } : {}),
        ...(input.country !== undefined ? { country: input.country?.trim() || null } : {}),
        ...(input.address !== undefined ? { address: input.address?.trim() || null } : {}),
        ...(input.taxId !== undefined ? { taxId: input.taxId?.trim() || null } : {}),
      },
    });
  }

  return getMe(userId);
}
