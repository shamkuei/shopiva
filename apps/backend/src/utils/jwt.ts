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
  // @types/jsonwebtoken types `expiresIn` as `number | ms.StringValue` (branded),
  // which rejects a plain string. The string form ("15m", "7d") is valid at
  // runtime — jsonwebtoken parses it via `ms` — so we assert the options shape.
  jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessTtl,
  } as unknown as jwt.SignOptions);

export const signRefreshToken = (payload: RefreshTokenPayload): string =>
  jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshTtl,
  } as unknown as jwt.SignOptions);

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;

export const verifyRefreshToken = (token: string): RefreshTokenPayload =>
  jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
