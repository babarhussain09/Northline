import type { CookieOptions, Response } from 'express';
import { cookieSecure, env } from '../config/env';

export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, refreshCookieOptions());
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
}
