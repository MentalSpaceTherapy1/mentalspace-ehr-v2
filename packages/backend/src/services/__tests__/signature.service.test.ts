// Create mock functions first
const mockUserFindUnique = jest.fn();
const mockSignatureAttestationFindFirst = jest.fn();
const mockSignatureEventCreate = jest.fn();
const mockSignatureEventFindMany = jest.fn();
const mockSignatureEventUpdate = jest.fn();
const mockClinicalNoteFindUnique = jest.fn();
const mockClinicalNoteUpdate = jest.fn();
const mockUserUpdate = jest.fn();

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Mock the database module
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
    signatureAttestation: {
      findFirst: mockSignatureAttestationFindFirst,
    },
    signatureEvent: {
      create: mockSignatureEventCreate,
      findMany: mockSignatureEventFindMany,
      update: mockSignatureEventUpdate,
    },
    clinicalNote: {
      findUnique: mockClinicalNoteFindUnique,
      update: mockClinicalNoteUpdate,
    },
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Import after mocking
import {
  getApplicableAttestation,
  verifySignatureAuth,
  createSignatureEvent,
  getSignatureEvents,
  revokeSignature,
  signNote,
  setSignaturePin,
  setSignaturePassword,
} from '../signature.service';
import bcrypt from 'bcryptjs';

describe('Signature Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getApplicableAttestation', () => {
    it('should find attestation for clinician role', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user-123',
        roles: ['CLINICIAN'],
        licenseState: 'GA',
      });

      mockSignatureAttestationFindFirst.mockResolvedValue({
        id: 'attest-123',
        role: 'CLINICIAN',
        noteType: 'Progress Note',
        jurisdiction: 'GA',
        attestationText: 'I attest...',
      });

      const result = await getApplicableAttestation('user-123', 'Progress Note', 'AUTHOR');

      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: expect.any(Object),
      });
      expect(result.role).toBe('CLINICIAN');
    });

    it('should find supervisor attestation for cosign', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user-123',
        roles: ['SUPERVISOR'],
        licenseState: 'GA',
      });

      mockSignatureAttestationFindFirst.mockResolvedValue({
        id: 'attest-124',
        role: 'SUPERVISOR',
        noteType: 'ALL',
        jurisdiction: 'GA',
      });

      const result = await getApplicableAttestation('user-123', 'Progress Note', 'COSIGN');

      expect(mockSignatureAttestationFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'SUPERVISOR',
          }),
        })
      );
      expect(result.role).toBe('SUPERVISOR');
    });

    it('should fallback to US jurisdiction if no state-specific attestation', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user-123',
        roles: ['CLINICIAN'],
        licenseState: 'XX',
      });

      // First two calls return null (no state-specific)
      mockSignatureAttestationFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'attest-us',
          role: 'CLINICIAN',
          noteType: 'ALL',
          jurisdiction: 'US',
        });

      const result = await getApplicableAttestation('user-123', 'Progress Note', 'AUTHOR');

      expect(result.jurisdiction).toBe('US');
    });

    it('should throw error when user not found', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      await expect(getApplicableAttestation('nonexistent', 'Progress Note', 'AUTHOR')).rejects.toThrow(
        /User not found/i
      );
    });

    it('should throw error when no attestation found', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user-123',
        roles: ['CLINICIAN'],
        licenseState: 'GA',
      });

      mockSignatureAttestationFindFirst.mockResolvedValue(null);

      await expect(getApplicableAttestation('user-123', 'Progress Note', 'AUTHOR')).rejects.toThrow(
        /No applicable attestation found/i
      );
    });
  });

  describe('verifySignatureAuth', () => {
    it('should verify PIN successfully', async () => {
      mockUserFindUnique.mockResolvedValue({
        password: 'hashed-password',
        signaturePin: 'hashed-pin',
        signaturePassword: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await verifySignatureAuth({ userId: 'user-123', pin: '1234' });

      expect(bcrypt.compare).toHaveBeenCalledWith('1234', 'hashed-pin');
      expect(result).toBe(true);
    });

    it('should return false when PIN does not match', async () => {
      mockUserFindUnique.mockResolvedValue({
        signaturePin: 'hashed-pin',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await verifySignatureAuth({ userId: 'user-123', pin: 'wrong-pin' });

      expect(result).toBe(false);
    });

    it('should throw error when PIN not configured', async () => {
      mockUserFindUnique.mockResolvedValue({
        signaturePin: null,
      });

      await expect(verifySignatureAuth({ userId: 'user-123', pin: '1234' })).rejects.toThrow(
        /Signature PIN not configured/i
      );
    });

    it('should verify signature password if configured', async () => {
      mockUserFindUnique.mockResolvedValue({
        password: 'hashed-login-password',
        signaturePassword: 'hashed-sig-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await verifySignatureAuth({ userId: 'user-123', password: 'my-sig-password' });

      expect(bcrypt.compare).toHaveBeenCalledWith('my-sig-password', 'hashed-sig-password');
      expect(result).toBe(true);
    });

    it('should fallback to login password if no signature password', async () => {
      mockUserFindUnique.mockResolvedValue({
        password: 'hashed-login-password',
        signaturePassword: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await verifySignatureAuth({ userId: 'user-123', password: 'login-password' });

      expect(bcrypt.compare).toHaveBeenCalledWith('login-password', 'hashed-login-password');
      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const result = await verifySignatureAuth({ userId: 'nonexistent', pin: '1234' });

      expect(result).toBe(false);
    });
  });

  describe('getSignatureEvents', () => {
    it('should return signature events for a note', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          signatureType: 'AUTHOR',
          signedAt: new Date('2024-01-15T10:00:00Z'),
          user: {
            firstName: 'John',
            lastName: 'Doe',
            credentials: 'LPC',
          },
        },
        {
          id: 'event-2',
          signatureType: 'COSIGN',
          signedAt: new Date('2024-01-15T11:00:00Z'),
          user: {
            firstName: 'Jane',
            lastName: 'Smith',
            credentials: 'LCSW',
          },
        },
      ];

      mockSignatureEventFindMany.mockResolvedValue(mockEvents);

      const result = await getSignatureEvents('note-123');

      expect(mockSignatureEventFindMany).toHaveBeenCalledWith({
        where: { noteId: 'note-123' },
        include: expect.any(Object),
        orderBy: { signedAt: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].signatureType).toBe('AUTHOR');
    });
  });

  describe('revokeSignature', () => {
    it('should revoke a signature with reason', async () => {
      mockSignatureEventUpdate.mockResolvedValue({
        id: 'event-123',
        isValid: false,
        revokedAt: new Date(),
        revokedBy: 'admin-user',
        revokedReason: 'Documentation error',
      });

      const result = await revokeSignature('event-123', 'admin-user', 'Documentation error');

      expect(mockSignatureEventUpdate).toHaveBeenCalledWith({
        where: { id: 'event-123' },
        data: {
          isValid: false,
          revokedAt: expect.any(Date),
          revokedBy: 'admin-user',
          revokedReason: 'Documentation error',
        },
      });
      expect(result.isValid).toBe(false);
    });
  });

  describe('signNote', () => {
    const signRequest = {
      noteId: 'note-123',
      userId: 'user-456',
      signatureType: 'AUTHOR' as const,
      authMethod: 'PASSWORD' as const,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('should sign a note as author', async () => {
      mockClinicalNoteFindUnique.mockResolvedValue({
        id: 'note-123',
        noteType: 'Progress Note',
        clinicianId: 'user-456',
        cosignedBy: null,
        requiresCosign: false,
        status: 'DRAFT',
        signedBy: null,
        signedDate: null,
      });

      mockUserFindUnique.mockResolvedValue({
        id: 'user-456',
        roles: ['CLINICIAN'],
        licenseState: 'GA',
      });

      mockSignatureAttestationFindFirst.mockResolvedValue({
        id: 'attest-123',
        role: 'CLINICIAN',
      });

      mockSignatureEventCreate.mockResolvedValue({
        id: 'event-123',
        signatureType: 'AUTHOR',
      });

      mockClinicalNoteUpdate.mockResolvedValue({
        id: 'note-123',
        signedBy: 'user-456',
        status: 'SIGNED',
      });

      const result = await signNote(signRequest);

      expect(mockClinicalNoteUpdate).toHaveBeenCalledWith({
        where: { id: 'note-123' },
        data: {
          signedBy: 'user-456',
          signedDate: expect.any(Date),
          status: 'SIGNED',
        },
      });
      expect(result.signatureType).toBe('AUTHOR');
    });

    it('should set status to PENDING_COSIGN if cosigner required', async () => {
      mockClinicalNoteFindUnique.mockResolvedValue({
        id: 'note-123',
        noteType: 'Progress Note',
        clinicianId: 'user-456',
        cosignedBy: null,
        requiresCosign: true,
        status: 'DRAFT',
        signedBy: null,
        signedDate: null,
      });

      mockUserFindUnique.mockResolvedValue({
        id: 'user-456',
        roles: ['CLINICIAN'],
        licenseState: 'GA',
      });

      mockSignatureAttestationFindFirst.mockResolvedValue({
        id: 'attest-123',
      });

      mockSignatureEventCreate.mockResolvedValue({
        id: 'event-123',
        signatureType: 'AUTHOR',
      });

      mockClinicalNoteUpdate.mockResolvedValue({});

      await signNote(signRequest);

      expect(mockClinicalNoteUpdate).toHaveBeenCalledWith({
        where: { id: 'note-123' },
        data: {
          signedBy: 'user-456',
          signedDate: expect.any(Date),
          status: 'PENDING_COSIGN',
        },
      });
    });

    it('should throw error when note already signed', async () => {
      mockClinicalNoteFindUnique.mockResolvedValue({
        id: 'note-123',
        noteType: 'Progress Note',
        clinicianId: 'user-456',
        cosignedBy: null,
        requiresCosign: false,
        status: 'SIGNED',
        signedBy: 'user-456', // Note already signed
        signedDate: new Date(),
      });

      await expect(signNote(signRequest)).rejects.toThrow(/already signed/i);
    });

    it('should throw error when non-author tries to sign', async () => {
      mockClinicalNoteFindUnique.mockResolvedValue({
        id: 'note-123',
        noteType: 'Progress Note',
        clinicianId: 'different-user', // Different from request userId
        cosignedBy: null,
        requiresCosign: false,
        status: 'DRAFT',
        signedBy: null,
        signedDate: null,
      });

      await expect(signNote(signRequest)).rejects.toThrow(/Only the note author/i);
    });

    it('should sign note as cosigner', async () => {
      const cosignRequest = {
        ...signRequest,
        userId: 'supervisor-789',
        signatureType: 'COSIGN' as const,
      };

      mockClinicalNoteFindUnique.mockResolvedValue({
        id: 'note-123',
        noteType: 'Progress Note',
        clinicianId: 'user-456',
        cosignedBy: 'supervisor-789', // Must match userId in cosignRequest
        requiresCosign: true,
        status: 'PENDING_COSIGN',
        signedBy: 'user-456',
        signedDate: new Date(),
      });

      mockUserFindUnique.mockResolvedValue({
        id: 'supervisor-789',
        roles: ['SUPERVISOR'],
        licenseState: 'GA',
      });

      mockSignatureAttestationFindFirst.mockResolvedValue({
        id: 'attest-124',
        role: 'SUPERVISOR',
      });

      mockSignatureEventCreate.mockResolvedValue({
        id: 'event-124',
        signatureType: 'COSIGN',
      });

      mockClinicalNoteUpdate.mockResolvedValue({});

      await signNote(cosignRequest);

      expect(mockClinicalNoteUpdate).toHaveBeenCalledWith({
        where: { id: 'note-123' },
        data: {
          cosignedBy: 'supervisor-789',
          cosignedDate: expect.any(Date),
          status: 'COSIGNED',
        },
      });
    });

    it('should throw error when wrong supervisor tries to cosign', async () => {
      const cosignRequest = {
        ...signRequest,
        signatureType: 'COSIGN' as const,
      };

      mockClinicalNoteFindUnique.mockResolvedValue({
        id: 'note-123',
        noteType: 'Progress Note',
        clinicianId: 'user-456',
        cosignedBy: 'other-supervisor', // Different from request userId
        requiresCosign: true,
        status: 'PENDING_COSIGN',
        signedBy: 'user-456',
        signedDate: new Date(),
      });

      await expect(signNote(cosignRequest)).rejects.toThrow(/Only the assigned supervisor/i);
    });

    it('should throw error when note not found', async () => {
      mockClinicalNoteFindUnique.mockResolvedValue(null);

      await expect(signNote(signRequest)).rejects.toThrow(/not found/i);
    });
  });

  describe('setSignaturePin', () => {
    it('should set signature PIN with valid format', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pin');
      mockUserUpdate.mockResolvedValue({});

      await setSignaturePin('user-123', '1234');

      expect(bcrypt.hash).toHaveBeenCalledWith('1234', 10);
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { signaturePin: 'hashed-pin' },
      });
    });

    it('should accept 6-digit PIN', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pin');
      mockUserUpdate.mockResolvedValue({});

      await setSignaturePin('user-123', '123456');

      expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
    });

    it('should throw error for PIN less than 4 digits', async () => {
      await expect(setSignaturePin('user-123', '123')).rejects.toThrow(/4-6 digits/i);
    });

    it('should throw error for PIN more than 6 digits', async () => {
      await expect(setSignaturePin('user-123', '1234567')).rejects.toThrow(/4-6 digits/i);
    });

    it('should throw error for non-numeric PIN', async () => {
      await expect(setSignaturePin('user-123', 'abcd')).rejects.toThrow(/4-6 digits/i);
    });
  });

  describe('setSignaturePassword', () => {
    const validPassword = 'MySecure@Pass123!';

    it('should set signature password with valid format', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockUserUpdate.mockResolvedValue({});

      await setSignaturePassword('user-123', validPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(validPassword, 10);
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { signaturePassword: 'hashed-password' },
      });
    });

    it('should throw error for password less than 12 characters', async () => {
      await expect(setSignaturePassword('user-123', 'Short1!')).rejects.toThrow(
        /at least 12 characters/i
      );
    });

    it('should throw error for password without uppercase', async () => {
      await expect(setSignaturePassword('user-123', 'mysecure@pass123!')).rejects.toThrow(
        /uppercase/i
      );
    });

    it('should throw error for password without lowercase', async () => {
      await expect(setSignaturePassword('user-123', 'MYSECURE@PASS123!')).rejects.toThrow(
        /lowercase/i
      );
    });

    it('should throw error for password without number', async () => {
      await expect(setSignaturePassword('user-123', 'MySecure@Password!')).rejects.toThrow(
        /number/i
      );
    });

    it('should throw error for password without special character', async () => {
      await expect(setSignaturePassword('user-123', 'MySecurePass1234')).rejects.toThrow(
        /special character/i
      );
    });
  });
});
