import { MFAService } from '../mfa.service';
import prisma from '../database';
import crypto from 'crypto';

// Mock dependencies
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../cache.service', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  auditLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../sms.service', () => ({
  sendSMS: jest.fn(() => Promise.resolve(true)),
  SMSTemplates: {
    twoFactorCode: jest.fn((code: string) => `Your code is ${code}`),
  },
  isValidPhoneNumber: jest.fn(() => true),
}));

jest.mock('speakeasy', () => ({
  generateSecret: jest.fn(() => ({
    base32: 'JBSWY3DPEHPK3PXP',
    otpauth_url: 'otpauth://totp/MentalSpace%20EHR%20(test@example.com)?secret=JBSWY3DPEHPK3PXP&issuer=MentalSpace%20EHR',
  })),
  totp: {
    verify: jest.fn(),
  },
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn((url: string) => Promise.resolve(`data:image/png;base64,fake-qr-code`)),
}));

describe('MFAService', () => {
  let mfaService: MFAService;
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const speakeasy = require('speakeasy');
  const qrcode = require('qrcode');

  beforeEach(() => {
    mfaService = new MFAService();
    jest.clearAllMocks();
  });

  describe('generateMFASecret', () => {
    it('should generate TOTP secret with QR code and backup codes', async () => {
      const mockUser = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await mfaService.generateMFASecret(mockUserId);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result).toHaveProperty('backupCodes');
      expect(result).toHaveProperty('manualEntryKey');
      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.backupCodes).toHaveLength(10); // Service generates 10 backup codes
      expect(speakeasy.generateSecret).toHaveBeenCalled();
      expect(qrcode.toDataURL).toHaveBeenCalled();
    });

    it('should generate 10 unique backup codes in XXXX-XXXX format', async () => {
      const mockUser = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await mfaService.generateMFASecret(mockUserId);

      expect(result.backupCodes).toHaveLength(10);
      const uniqueCodes = new Set(result.backupCodes);
      expect(uniqueCodes.size).toBe(10); // All codes are unique
      result.backupCodes.forEach((code) => {
        expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/); // XXXX-XXXX format
      });
    });

    it('should throw if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(mfaService.generateMFASecret(mockUserId)).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('verifyTOTP', () => {
    it('should return true for valid 6-digit code format', () => {
      // verifyTOTP is a sync method that validates format only
      const result = mfaService.verifyTOTP(mockUserId, '123456');
      expect(result).toBe(true);
    });

    it('should return false for invalid code format', () => {
      const result = mfaService.verifyTOTP(mockUserId, '12345'); // 5 digits
      expect(result).toBe(false);
    });

    it('should return false for non-numeric code', () => {
      const result = mfaService.verifyTOTP(mockUserId, 'abcdef');
      expect(result).toBe(false);
    });
  });

  describe('verifyTOTPForLogin', () => {
    it('should verify valid TOTP code against user secret', async () => {
      const mockUser = {
        mfaSecret: 'JBSWY3DPEHPK3PXP',
        mfaEnabled: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = await mfaService.verifyTOTPForLogin(mockUserId, '123456');

      expect(result).toBe(true);
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        encoding: 'base32',
        token: '123456',
        window: 1, // TOTP_WINDOW is 1
      });
    });

    it('should return false for invalid TOTP code', async () => {
      const mockUser = {
        mfaSecret: 'JBSWY3DPEHPK3PXP',
        mfaEnabled: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      const result = await mfaService.verifyTOTPForLogin(mockUserId, '000000');

      expect(result).toBe(false);
    });

    it('should return false if MFA not enabled', async () => {
      const mockUser = {
        mfaSecret: null,
        mfaEnabled: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await mfaService.verifyTOTPForLogin(mockUserId, '123456');

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await mfaService.verifyTOTPForLogin(mockUserId, '123456');

      expect(result).toBe(false);
    });
  });

  describe('enableMFA', () => {
    it('should enable MFA with valid verification code', async () => {
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        mfaEnabled: true,
      });

      const backupCodes = ['AAAA-BBBB', 'CCCC-DDDD'];

      await mfaService.enableMFA(mockUserId, 'JBSWY3DPEHPK3PXP', '123456', backupCodes);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          mfaEnabled: true,
          mfaSecret: 'JBSWY3DPEHPK3PXP',
          mfaBackupCodes: expect.any(Array),
        },
      });
    });

    it('should reject MFA enable with invalid verification code', async () => {
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(
        mfaService.enableMFA(mockUserId, 'JBSWY3DPEHPK3PXP', '000000', ['code1'])
      ).rejects.toThrow('Invalid verification code');
    });

    it('should hash backup codes before storing', async () => {
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const backupCodes = ['AAAA-BBBB', 'CCCC-DDDD'];
      await mfaService.enableMFA(mockUserId, 'JBSWY3DPEHPK3PXP', '123456', backupCodes);

      const updateCall = (prisma.user.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.mfaBackupCodes).toBeDefined();
      expect(Array.isArray(updateCall.data.mfaBackupCodes)).toBe(true);
      // Backup codes should be hashed (SHA256 produces 64-char hex strings)
      updateCall.data.mfaBackupCodes.forEach((hash: string) => {
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      });
    });
  });

  describe('disableMFA', () => {
    it('should disable MFA with valid verification code', async () => {
      const mockUser = {
        mfaSecret: 'JBSWY3DPEHPK3PXP',
        mfaEnabled: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        mfaEnabled: false,
      });

      await mfaService.disableMFA(mockUserId, '123456');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: [],
        },
      });
    });

    it('should reject MFA disable with invalid verification code', async () => {
      const mockUser = {
        mfaSecret: 'JBSWY3DPEHPK3PXP',
        mfaEnabled: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(mfaService.disableMFA(mockUserId, '000000')).rejects.toThrow(
        'Invalid verification code'
      );
    });

    it('should throw if MFA not enabled', async () => {
      const mockUser = {
        mfaSecret: null,
        mfaEnabled: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(mfaService.disableMFA(mockUserId, '123456')).rejects.toThrow(
        'MFA is not enabled for this user'
      );
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify valid backup code and remove it (one-time use)', async () => {
      const backupCode = 'AAAA-BBBB';
      const hashedCode = crypto.createHash('sha256').update(backupCode).digest('hex');

      const mockUser = {
        mfaBackupCodes: [hashedCode, 'other-hashed-code'],
        mfaEnabled: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await mfaService.verifyBackupCode(mockUserId, backupCode);

      expect(result).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          mfaBackupCodes: ['other-hashed-code'], // Used code removed
        },
      });
    });

    it('should reject invalid backup code', async () => {
      const mockUser = {
        mfaBackupCodes: ['hashed-code-1', 'hashed-code-2'],
        mfaEnabled: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await mfaService.verifyBackupCode(mockUserId, 'INVALID-CODE');

      expect(result).toBe(false);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should return false if MFA not enabled', async () => {
      const mockUser = {
        mfaBackupCodes: null,
        mfaEnabled: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await mfaService.verifyBackupCode(mockUserId, 'AAAA-BBBB');

      expect(result).toBe(false);
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should generate new set of backup codes with valid TOTP', async () => {
      const mockUser = {
        mfaEnabled: true,
        mfaSecret: 'JBSWY3DPEHPK3PXP',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await mfaService.regenerateBackupCodes(mockUserId, '123456');

      expect(result).toHaveLength(10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          mfaBackupCodes: expect.any(Array),
        },
      });
    });

    it('should reject with invalid verification code', async () => {
      const mockUser = {
        mfaEnabled: true,
        mfaSecret: 'JBSWY3DPEHPK3PXP',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(
        mfaService.regenerateBackupCodes(mockUserId, '000000')
      ).rejects.toThrow('Invalid verification code');
    });

    it('should require MFA to be enabled', async () => {
      const mockUser = {
        mfaEnabled: false,
        mfaSecret: null,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        mfaService.regenerateBackupCodes(mockUserId, '123456')
      ).rejects.toThrow('MFA is not enabled for this user');
    });
  });

  describe('isMFAEnabled', () => {
    it('should return true when MFA is enabled', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        mfaEnabled: true,
      });

      const result = await mfaService.isMFAEnabled(mockUserId);

      expect(result).toBe(true);
    });

    it('should return false when MFA is not enabled', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        mfaEnabled: false,
      });

      const result = await mfaService.isMFAEnabled(mockUserId);

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await mfaService.isMFAEnabled(mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('getMFAStatus', () => {
    it('should return MFA status for user with MFA enabled', async () => {
      const mockUser = {
        mfaEnabled: true,
        mfaMethod: 'TOTP',
        mfaBackupCodes: ['code1', 'code2', 'code3'],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await mfaService.getMFAStatus(mockUserId);

      expect(result).toEqual({
        enabled: true,
        method: 'TOTP',
        backupCodesCount: 3,
      });
    });

    it('should return disabled status when MFA not enabled', async () => {
      const mockUser = {
        mfaEnabled: false,
        mfaMethod: null,
        mfaBackupCodes: [],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await mfaService.getMFAStatus(mockUserId);

      expect(result).toEqual({
        enabled: false,
        method: undefined,
        backupCodesCount: undefined,
      });
    });

    it('should throw if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(mfaService.getMFAStatus(mockUserId)).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('adminResetMFA', () => {
    it('should reset MFA for user as admin', async () => {
      const cache = require('../cache.service');
      const mockUser = {
        email: 'user@example.com',
        mfaEnabled: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (cache.del as jest.Mock).mockResolvedValue(undefined);

      await mfaService.adminResetMFA(mockUserId, 'admin-123', 'User request');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: [],
          mfaMethod: null,
        },
      });
      expect(cache.del).toHaveBeenCalledTimes(2); // Clears both SMS codes and attempts
    });

    it('should throw if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        mfaService.adminResetMFA(mockUserId, 'admin-123', 'Test')
      ).rejects.toThrow('User not found');
    });

    it('should throw if MFA not enabled', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        email: 'user@example.com',
        mfaEnabled: false,
      });

      await expect(
        mfaService.adminResetMFA(mockUserId, 'admin-123', 'Test')
      ).rejects.toThrow('MFA is not enabled for this user');
    });
  });

  describe('cleanupExpiredSMSCodes', () => {
    it('should be a no-op since TTL handles cleanup', () => {
      // This method is a no-op in the current implementation
      // as DynamoDB cache handles TTL-based expiration automatically
      expect(() => mfaService.cleanupExpiredSMSCodes()).not.toThrow();
    });
  });
});
