import jwt, { SignOptions } from 'jsonwebtoken';
import config from '../config';
import { UnauthorizedError } from './errors';

export interface JwtPayload {
  id: string; // User ID (alias for userId for backward compatibility)
  userId: string;
  email: string;
  roles: string[]; // Support multiple roles
  iat?: number; // Issued at (added by JWT automatically)
  exp?: number; // Expiration (added by JWT automatically)
  lastActivity?: number; // Track last activity for session timeout
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate JWT access token
 */
export const generateAccessToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as any,
    issuer: 'mentalspace-ehr',
    audience: 'mentalspace-api',
  };
  return jwt.sign(payload, config.jwtSecret, options);
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: config.jwtRefreshExpiresIn as any,
    issuer: 'mentalspace-ehr',
    audience: 'mentalspace-api',
  };
  return jwt.sign(payload, config.jwtSecret, options);
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (payload: JwtPayload): TokenPair => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

/**
 * Verify JWT token and return payload
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: 'mentalspace-ehr',
      audience: 'mentalspace-api',
    }) as JwtPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw new UnauthorizedError('Token verification failed');
  }
};

/**
 * Decode token without verification (useful for debugging)
 */
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
};
