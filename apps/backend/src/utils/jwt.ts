import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string; // user id
  storeId: string;
  role: string;
  email: string;
}

export interface RefreshTokenPayload {
  sub: string; // user id
}

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessTtl });

export const signRefreshToken = (payload: RefreshTokenPayload): string =>
  jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshTtl });

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;

export const verifyRefreshToken = (token: string): RefreshTokenPayload =>
  jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
