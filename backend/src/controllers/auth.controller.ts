import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, ok } from '../utils/response';
import { clearRefreshCookie, setRefreshCookie } from '../utils/cookies';
import * as auth from '../services/auth.service';
import { forgotSchema, loginSchema, profileSchema, registerSchema, resetSchema, verifySchema } from '../validators/schemas';

function meta(req: Request) {
  return { ipAddress: req.ip, userAgent: req.get('user-agent') };
}

export const register = asyncHandler(async (req, res) => {
  const user = await auth.register(registerSchema.parse(req.body));
  return created(res, user);
});

export const login = asyncHandler(async (req, res) => {
  const result = await auth.login(loginSchema.parse(req.body), meta(req));
  setRefreshCookie(res, result.refreshToken);
  return ok(res, { accessToken: result.accessToken, user: result.user });
});

export const logout = asyncHandler(async (req, res) => {
  await auth.logout(req.cookies?.refreshToken);
  clearRefreshCookie(res);
  return ok(res, { loggedOut: true });
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await auth.refresh(req.cookies?.refreshToken, meta(req));
  setRefreshCookie(res, result.refreshToken);
  return ok(res, { accessToken: result.accessToken, user: result.user });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await auth.forgotPassword(forgotSchema.parse(req.body).email);
  return ok(res, { message: 'If an account exists for that email, a reset link is on the way.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const body = resetSchema.parse(req.body);
  await auth.resetPassword(body.token, body.password);
  return ok(res, { message: 'Password updated' });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  await auth.verifyEmail(verifySchema.parse(req.body).token);
  return ok(res, { verified: true });
});

export const resendVerification = asyncHandler(async (req, res) => {
  await auth.resendVerification(req.user!.id);
  return ok(res, { sent: true });
});

export const me = asyncHandler(async (req, res) => {
  return ok(res, await auth.getMe(req.user!.id));
});

export const updateProfile = asyncHandler(async (req, res) => {
  return ok(res, await auth.updateProfile(req.user!.id, profileSchema.parse(req.body)));
});

export function notFound(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
}
