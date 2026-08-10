import type { Response } from 'express';
import { env } from '../config/env';

// Cookie lifetimes mirror the default JWT TTLs (15m access / 7d refresh).
const ACCESS_MAX_AGE = 15 * 60 * 1000;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * Auth tokens live exclusively in httpOnly cookies — never exposed to client JS
 * and never returned in response bodies, so they can't leak into localStorage.
 *
 * - access_token: sent on every API request (path "/").
 * - refresh_token: scoped to /api/auth so it's only sent to the refresh/logout
 *   endpoints, limiting its exposure surface.
 */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_MAX_AGE,
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_MAX_AGE,
  });
}

export function setAccessTokenCookie(res: Response, accessToken: string): void {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_MAX_AGE,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/auth' });
}
