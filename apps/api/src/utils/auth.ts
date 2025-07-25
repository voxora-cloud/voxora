import jwt from 'jsonwebtoken';
import config from '../config';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

export const generateTokens = (payload: Omit<JWTPayload, 'type'>) => {
  const accessToken = jwt.sign(
    { ...payload, type: 'access' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

export const verifyToken = (token: string, type: 'access' | 'refresh' = 'access'): JWTPayload => {
  const secret = type === 'access' ? config.jwt.secret : config.jwt.refreshSecret;
  return jwt.verify(token, secret) as JWTPayload;
};

export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};
