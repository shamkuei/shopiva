import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { authService } from '../services/auth.service';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import {
  setAuthCookies,
  setAccessTokenCookie,
  clearAuthCookies,
} from '../utils/authCookies';

/** Shape we return to clients — never includes the password hash. */
function publicUser(user: { id: string; email: string; role: string; storeId: string }) {
  return { id: user.id, email: user.email, role: user.role, storeId: user.storeId };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { storeName, subdomain, email, password } = req.body ?? {};

  if (!storeName || !subdomain || !email || !password) {
    throw ApiError.badRequest('storeName, subdomain, email and password are required');
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters');
  }

  const { store, user } = await authService.register({
    storeName,
    subdomain,
    email,
    password,
  });

  const accessToken = signAccessToken({
    sub: user.id,
    storeId: user.storeId,
    role: user.role,
    email: user.email,
  });
  const refreshToken = signRefreshToken({ sub: user.id });
  setAuthCookies(res, accessToken, refreshToken);

  res.status(201).json({ data: { user: publicUser(user), store } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) throw ApiError.badRequest('email and password are required');

  const { user, store } = await authService.login({ email, password });

  const accessToken = signAccessToken({
    sub: user.id,
    storeId: user.storeId,
    role: user.role,
    email: user.email,
  });
  const refreshToken = signRefreshToken({ sub: user.id });
  setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json({ data: { user: publicUser(user), store } });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refresh_token;
  if (!token) throw ApiError.unauthorized('Missing refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await authService.getById(payload.sub);
  if (!user) throw ApiError.unauthorized('User not found');

  const accessToken = signAccessToken({
    sub: user.id,
    storeId: user.storeId,
    role: user.role,
    email: user.email,
  });
  setAccessTokenCookie(res, accessToken);

  res.status(200).json({ data: { ok: true } });
});

export const logout = (req: Request, res: Response) => {
  clearAuthCookies(res);
  res.status(200).json({ data: { ok: true } });
};

export const me = (req: Request, res: Response) => {
  res.status(200).json({ data: { user: publicUser(req.user!) } });
};
