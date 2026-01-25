import { generateAccessToken, generateRefreshToken, verifyToken, JwtPayload } from '../jwt';
import jwt from 'jsonwebtoken';
import config from '../../config';

describe('JWT Utilities', () => {
  const mockPayload: JwtPayload = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: 'CLINICIAN',
  };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include correct payload in token', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it('should include issuer and audience', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.iss).toBe('mentalspace-ehr');
      expect(decoded.aud).toBe('mentalspace-api');
    });

    it('should have expiration time set', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should have longer expiration than access token', () => {
      const accessToken = generateAccessToken(mockPayload);
      const refreshToken = generateRefreshToken(mockPayload);

      const accessDecoded = jwt.decode(accessToken) as any;
      const refreshDecoded = jwt.decode(refreshToken) as any;

      const accessDuration = accessDecoded.exp - accessDecoded.iat;
      const refreshDuration = refreshDecoded.exp - refreshDecoded.iat;

      expect(refreshDuration).toBeGreaterThan(accessDuration);
    });
  });

  describe('verifyToken', () => {
    it('should verify and return payload for valid token', () => {
      const token = generateAccessToken(mockPayload);
      const verified = verifyToken(token);

      expect(verified.userId).toBe(mockPayload.userId);
      expect(verified.email).toBe(mockPayload.email);
      expect(verified.role).toBe(mockPayload.role);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyToken(invalidToken)).toThrow('Invalid token');
    });

    it('should throw error for expired token', async () => {
      // Create a token that expires immediately
      const expiredToken = jwt.sign(
        mockPayload,
        config.jwtSecret,
        {
          expiresIn: '0s',
          issuer: 'mentalspace-ehr',
          audience: 'mentalspace-api',
        }
      );

      // Wait a bit to ensure expiration
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(() => verifyToken(expiredToken)).toThrow('Token has expired');
    });

    it('should throw error for token with wrong issuer', () => {
      const token = jwt.sign(
        mockPayload,
        config.jwtSecret,
        {
          expiresIn: '1h',
          issuer: 'wrong-issuer',
          audience: 'mentalspace-api',
        }
      );

      expect(() => verifyToken(token)).toThrow();
    });

    it('should throw error for token with wrong audience', () => {
      const token = jwt.sign(
        mockPayload,
        config.jwtSecret,
        {
          expiresIn: '1h',
          issuer: 'mentalspace-ehr',
          audience: 'wrong-audience',
        }
      );

      expect(() => verifyToken(token)).toThrow();
    });
  });

  describe('Session timeout integration', () => {
    it('should include iat (issued at) in token', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.iat).toBeDefined();
      expect(typeof decoded.iat).toBe('number');
    });

    it('should allow tracking last activity in payload', () => {
      const payloadWithActivity: JwtPayload = {
        ...mockPayload,
        lastActivity: Date.now(),
      };

      const token = generateAccessToken(payloadWithActivity);
      const decoded = jwt.decode(token) as any;

      expect(decoded.lastActivity).toBeDefined();
    });
  });
});
