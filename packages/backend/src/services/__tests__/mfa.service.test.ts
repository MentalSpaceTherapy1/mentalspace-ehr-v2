import { MFAService } from '../mfa.service';
import prisma from '../database';
import bcrypt from 'bcryptjs';

// Mock dependencies
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs');
jest.mock('speakeasy', () => ({
  generateSecret: jest.fn(() => ({
    base32: 'JBSWY3DPEHPK3PXP',
    otpauth_url: 'otpauth://totp/MentalSpace:user@example.com?secret=JBSWY3DPEHPK3PXP',
  })),
  totp: {
    verify: jest.fn(),
  },
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn((url) => Promise.resolve(`data:image/png;base64,fake-qr-code-${url}`)),
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
        id: mockUserId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await mfaService.generateMFASecret(mockUserId);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result).toHaveProperty('backupCodes');
      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.backupCodes).toHaveLength(8);
      expect(speakeasy.generateSecret).toHaveBeenCalled();
      expect(qrcode.toDataURL).toHaveBeenCalled();
    });

    it('should generate 8 unique backup codes', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await mfaService.generateMFASecret(mockUserId);

      expect(result.backupCodes).toHaveLength(8);
      const uniqueCodes = new Set(result.backupCodes);
      expect(uniqueCodes.size).toBe(8); // All codes are unique
      result.backupCodes.forEach((code) => {
        expect(code).toMatch(/^[A-Z0-9]{8}$/); // 8 alphanumeric characters
      });
    });

    it('should include user email in QR code URL', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await mfaService.generateMFASecret(mockUserId);

      expect(qrcode.toDataURL).toHaveBeenCalledWith(
        expect.stringContaining('test@example.com')
      );
    });
  });

  describe('verifyTOTP', () => {
    it('should verify valid TOTP code', async () => {
      const mockUser = {
        id: mockUserId,
        mfaSecret: 'encrypted-secret',
        mfaEnabled: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = await mfaService.verifyTOTP(mockUserId, '123456');

      expect(result).toBe(true);
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: expect.any(String),
        encoding: 'base32',
        token: '123456',
        window: 2,
      });
    });

    it('should reject invalid TOTP code', async () => {
      const mockUser = {
        id: mockUserId,
        mfaSecret: 'encrypted-secret',
        mfaEnabled: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      const result = await mfaService.verifyTOTP(mockUserId, '000000');

      expect(result).toBe(false);
    });

    it('should reject verification if MFA not enabled', async () => {
      const mockUser = {
        id: mockUserId,
        mfaSecret: null,
        mfaEnabled: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(mfaService.verifyTOTP(mockUserId, '123456')).rejects.toThrow(
        'MFA is not enabled for this user'
      );
    });

    it('should use time window for TOTP verification', async () => {
      const mockUser = {
        id: mockUserId,
        mfaSecret: 'encrypted-secret',
        mfaEnabled: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      await mfaService.verifyTOTP(mockUserId, '123456');

      expect(speakeasy.totp.verify).toHaveBeenCalledWith(
        expect.objectContaining({
          window: 2, // Allow 1 time step before and after
        })
      );
    });
  });

  describe('enableMFA', () => {
    it('should enable MFA with valid verification code', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        mfaEnabled: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-backup-code');
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
      });

      await mfaService.enableMFA(mockUserId, 'JBSWY3DPEHPK3PXP', '123456');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          mfaSecret: expect.any(String),
          mfaBackupCodes: expect.any(Array),
          mfaMethod: 'TOTP',
          mfaEnabled: true,
          mfaEnabledAt: expect.any(Date),
        },
      });
    });

    it('should reject MFA enable with invalid verification code', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        mfaEnabled: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(
        mfaService.enableMFA(mockUserId, 'JBSWY3DPEHPK3PXP', '000000')
      ).rejects.toThrow('Invalid verification code');
    });

    it('should hash and store backup codes', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        mfaEnabled: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-code');
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      await mfaService.enableMFA(mockUserId, 'JBSWY3DPEHPK3PXP', '123456');

      const updateCall = (prisma.user.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.mfaBackupCodes).toBeDefined();
      expect(Array.isArray(updateCall.data.mfaBackupCodes)).toBe(true);
    });
  });

  describe('disableMFA', () => {
    it('should disable MFA with valid verification code', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        mfaSecret: 'encrypted-secret',
        mfaEnabled: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        mfaEnabled: false,
      });

      await mfaService.disableMFA(mockUserId, '123456');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          mfaSecret: null,
          mfaBackupCodes: [],
          mfaMethod: null,
          mfaEnabled: false,
          mfaEnabledAt: null,
        },
      });
    });

    it('should reject MFA disable with invalid verification code', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        mfaSecret: 'encrypted-secret',
        mfaEnabled: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(mfaService.disableMFA(mockUserId, '000000')).rejects.toThrow(
        'Invalid verification code'
      );
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify valid backup code (one-time use)', async () => {
      const backupCode = 'ABC12345';
      const hashedCode = await bcrypt.hash(backupCode, 10);

      const mockUser = {
        id: mockUserId,
        mfaBackupCodes: [hashedCode, 'other-hashed-code'],
        mfaEnabled: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValue(false);
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
        id: mockUserId,
        mfaBackupCodes: ['hashed-code-1', 'hashed-code-2'],
        mfaEnabled: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await mfaService.verifyBackupCode(mockUserId, 'INVALID');

      expect(result).toBe(false);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should remove backup code after single use', async () => {
      const backupCode = 'ABC12345';
      const hashedCode = 'hashed-abc12345';

      const mockUser = {
        id: mockUserId,
        mfaBackupCodes: [hashedCode, 'code2', 'code3'],
        mfaEnabled: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValue(false);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      await mfaService.verifyBackupCode(mockUserId, backupCode);

      const updateCall = (prisma.user.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.mfaBackupCodes).toEqual(['code2', 'code3']);
      expect(updateCall.data.mfaBackupCodes).not.toContain(hashedCode);
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should generate new set of backup codes', async () => {
      const mockUser = {
        id: mockUserId,
        mfaEnabled: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-code');
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await mfaService.regenerateBackupCodes(mockUserId);

      expect(result).toHaveLength(8);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          mfaBackupCodes: expect.any(Array),
        },
      });
    });

    it('should replace old backup codes with new ones', async () => {
      const mockUser = {
        id: mockUserId,
        mfaBackupCodes: ['old1', 'old2'],
        mfaEnabled: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-code');
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      await mfaService.regenerateBackupCodes(mockUserId);

      const updateCall = (prisma.user.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.mfaBackupCodes).toHaveLength(8);
      expect(updateCall.data.mfaBackupCodes).not.toContain('old1');
      expect(updateCall.data.mfaBackupCodes).not.toContain('old2');
    });

    it('should require MFA to be enabled', async () => {
      const mockUser = {
        id: mockUserId,
        mfaEnabled: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(mfaService.regenerateBackupCodes(mockUserId)).rejects.toThrow(
        'MFA is not enabled for this user'
      );
    });
  });

  describe('completeMFALogin', () => {
    it('should create session after successful MFA verification', async () => {
      const tempToken = 'temp-token-123';
      const totpCode = '123456';

      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        mfaSecret: 'encrypted-secret',
        mfaEnabled: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      // Mock session creation would be tested here
      const result = await mfaService.completeMFALogin(tempToken, totpCode);

      expect(result).toBeDefined();
    });
  });

  describe('getMFAStatus', () => {
    it('should return MFA status for user', async () => {
      const mockUser = {
        id: mockUserId,
        mfaEnabled: true,
        mfaMethod: 'TOTP',
        mfaEnabledAt: new Date('2024-01-01'),
        mfaBackupCodes: ['code1', 'code2', 'code3'],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await mfaService.getMFAStatus(mockUserId);

      expect(result).toEqual({
        enabled: true,
        method: 'TOTP',
        enabledAt: mockUser.mfaEnabledAt,
        backupCodesRemaining: 3,
      });
    });

    it('should return disabled status when MFA not enabled', async () => {
      const mockUser = {
        id: mockUserId,
        mfaEnabled: false,
        mfaMethod: null,
        mfaEnabledAt: null,
        mfaBackupCodes: [],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await mfaService.getMFAStatus(mockUserId);

      expect(result).toEqual({
        enabled: false,
        method: null,
        enabledAt: null,
        backupCodesRemaining: 0,
      });
    });
  });
});
