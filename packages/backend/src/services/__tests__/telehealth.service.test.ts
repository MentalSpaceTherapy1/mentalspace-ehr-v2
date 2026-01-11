// Mock uuid first (must be before other mocks that depend on it)
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-12345678'),
}));

// Create mock functions first
const mockSessionFindFirst = jest.fn();
const mockSessionFindUnique = jest.fn();
const mockSessionCreate = jest.fn();
const mockSessionUpdate = jest.fn();
const mockAppointmentFindUnique = jest.fn();
const mockConsentFindFirst = jest.fn();
const mockRatingCreate = jest.fn();
const mockRatingFindUnique = jest.fn();
const mockRatingFindMany = jest.fn();
const mockRatingCount = jest.fn();
const mockRatingAggregate = jest.fn();
const mockRatingGroupBy = jest.fn();

// Mock the database module
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    telehealthSession: {
      findFirst: mockSessionFindFirst,
      findUnique: mockSessionFindUnique,
      create: mockSessionCreate,
      update: mockSessionUpdate,
    },
    appointment: {
      findUnique: mockAppointmentFindUnique,
    },
    telehealthConsent: {
      findFirst: mockConsentFindFirst,
    },
    sessionRating: {
      create: mockRatingCreate,
      findUnique: mockRatingFindUnique,
      findMany: mockRatingFindMany,
      count: mockRatingCount,
      aggregate: mockRatingAggregate,
      groupBy: mockRatingGroupBy,
    },
  },
}));

// Mock twilio service
const mockCreateTwilioRoom = jest.fn();
const mockGenerateTwilioAccessToken = jest.fn();
const mockEndTwilioRoom = jest.fn();
const mockGetTwilioConfigStatus = jest.fn();

jest.mock('../twilio.service', () => ({
  createTwilioRoom: mockCreateTwilioRoom,
  generateTwilioAccessToken: mockGenerateTwilioAccessToken,
  endTwilioRoom: mockEndTwilioRoom,
  getTwilioConfigStatus: mockGetTwilioConfigStatus,
}));

// Mock config
jest.mock('../../config', () => ({
  __esModule: true,
  default: {
    nodeEnv: 'test',
    frontendUrl: 'http://localhost:3000',
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import after mocking
import {
  createTelehealthSession,
  joinTelehealthSession,
  endTelehealthSession,
  getTelehealthSession,
  updateSessionStatus,
  enableRecording,
  stopRecording,
  getTwilioStatus,
  getClientEmergencyContact,
  activateEmergency,
  verifyClientConsent,
  createSessionRating,
  getAllSessionRatings,
  getSessionRatingStats,
  getSessionRating,
} from '../telehealth.service';

describe('Telehealth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set environment variable for mock mode
    process.env.TWILIO_MOCK_MODE = 'true';
  });

  afterEach(() => {
    delete process.env.TWILIO_MOCK_MODE;
  });

  describe('createTelehealthSession', () => {
    const mockAppointment = {
      id: 'appt-123',
      client: {
        id: 'client-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
      clinician: {
        id: 'clinician-123',
        firstName: 'Dr. Jane',
        lastName: 'Smith',
        title: 'MD',
      },
    };

    it('should create a new telehealth session in mock mode', async () => {
      mockAppointmentFindUnique.mockResolvedValue(mockAppointment);
      mockSessionFindUnique.mockResolvedValue(null); // No existing session
      mockSessionCreate.mockResolvedValue({
        id: 'session-123',
        appointmentId: 'appt-123',
        chimeMeetingId: 'MOCK-room-sid',
        chimeExternalMeetingId: 'telehealth-appt-123-12345678',
        status: 'SCHEDULED',
      });

      const result = await createTelehealthSession({
        appointmentId: 'appt-123',
        createdBy: 'user-123',
      });

      expect(mockAppointmentFindUnique).toHaveBeenCalledWith({
        where: { id: 'appt-123' },
        include: expect.any(Object),
      });
      expect(mockSessionCreate).toHaveBeenCalled();
      expect(result.appointmentId).toBe('appt-123');
    });

    it('should return existing session if already exists', async () => {
      mockAppointmentFindUnique.mockResolvedValue(mockAppointment);
      const existingSession = {
        id: 'existing-session',
        appointmentId: 'appt-123',
        status: 'SCHEDULED',
      };
      mockSessionFindUnique.mockResolvedValue(existingSession);

      const result = await createTelehealthSession({
        appointmentId: 'appt-123',
        createdBy: 'user-123',
      });

      expect(result).toEqual(existingSession);
      expect(mockSessionCreate).not.toHaveBeenCalled();
    });

    it('should throw error if appointment not found', async () => {
      mockAppointmentFindUnique.mockResolvedValue(null);

      await expect(
        createTelehealthSession({
          appointmentId: 'nonexistent',
          createdBy: 'user-123',
        })
      ).rejects.toThrow('Appointment not found');
    });
  });

  describe('joinTelehealthSession', () => {
    const mockSession = {
      id: 'session-123',
      appointmentId: 'appt-123',
      chimeMeetingId: 'MOCK-room-sid',
      chimeExternalMeetingId: 'room-name',
      status: 'SCHEDULED',
      appointment: {
        id: 'appt-123',
        client: { id: 'client-123' },
        clinician: { id: 'clinician-123' },
      },
    };

    it('should generate mock token for clinician joining', async () => {
      mockSessionFindFirst.mockResolvedValue(mockSession);
      mockSessionUpdate.mockResolvedValue({
        ...mockSession,
        status: 'IN_PROGRESS',
        clinicianAttendeeId: expect.any(String),
      });

      const result = await joinTelehealthSession({
        sessionId: 'appt-123',
        userId: 'clinician-123',
        userRole: 'clinician',
        userName: 'Dr. Smith',
      });

      expect(result.twilioToken).toContain('MOCK_TOKEN_');
      expect(result.twilioRoomName).toBe('room-name');
      expect(mockSessionUpdate).toHaveBeenCalled();
    });

    it('should update status to WAITING_ROOM for client joining', async () => {
      mockSessionFindFirst.mockResolvedValue(mockSession);
      mockSessionUpdate.mockResolvedValue({
        ...mockSession,
        status: 'WAITING_ROOM',
        clientInWaitingRoom: true,
      });

      const result = await joinTelehealthSession({
        sessionId: 'appt-123',
        userId: 'client-123',
        userRole: 'client',
        userName: 'John Doe',
      });

      expect(result.session.status).toBe('WAITING_ROOM');
    });

    it('should throw error if client tries to join non-existent session', async () => {
      mockSessionFindFirst.mockResolvedValue(null);

      await expect(
        joinTelehealthSession({
          sessionId: 'nonexistent',
          userId: 'client-123',
          userRole: 'client',
          userName: 'John Doe',
        })
      ).rejects.toThrow('Telehealth session not started yet');
    });
  });

  describe('endTelehealthSession', () => {
    it('should end session and calculate duration', async () => {
      const startTime = new Date(Date.now() - 30 * 60000); // 30 minutes ago
      const mockSession = {
        id: 'session-123',
        chimeMeetingId: 'MOCK-room-sid',
        sessionStartedAt: startTime,
      };
      mockSessionFindUnique.mockResolvedValue(mockSession);
      mockSessionUpdate.mockResolvedValue({
        ...mockSession,
        status: 'COMPLETED',
        actualDuration: 30,
      });

      const result = await endTelehealthSession('session-123', 'user-123');

      expect(result.status).toBe('COMPLETED');
      expect(result.actualDuration).toBe(30);
    });

    it('should throw error if session not found', async () => {
      mockSessionFindUnique.mockResolvedValue(null);

      await expect(
        endTelehealthSession('nonexistent', 'user-123')
      ).rejects.toThrow('Telehealth session not found');
    });

    it('should handle session without start time', async () => {
      mockSessionFindUnique.mockResolvedValue({
        id: 'session-123',
        chimeMeetingId: 'MOCK-room-sid',
        sessionStartedAt: null,
      });
      mockSessionUpdate.mockResolvedValue({
        status: 'COMPLETED',
        actualDuration: null,
      });

      const result = await endTelehealthSession('session-123', 'user-123');
      expect(result.actualDuration).toBeNull();
    });
  });

  describe('getTelehealthSession', () => {
    it('should return session with appointment details', async () => {
      const mockSession = {
        id: 'session-123',
        appointmentId: 'appt-123',
        appointment: {
          client: { id: 'client-123', firstName: 'John', lastName: 'Doe' },
          clinician: { id: 'clinician-123', firstName: 'Jane', lastName: 'Smith' },
        },
      };
      mockSessionFindUnique.mockResolvedValue(mockSession);

      const result = await getTelehealthSession('appt-123');

      expect(mockSessionFindUnique).toHaveBeenCalledWith({
        where: { appointmentId: 'appt-123' },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockSession);
    });

    it('should return null if session not found', async () => {
      mockSessionFindUnique.mockResolvedValue(null);

      const result = await getTelehealthSession('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updateSessionStatus', () => {
    it('should update session status', async () => {
      mockSessionUpdate.mockResolvedValue({
        id: 'session-123',
        status: 'IN_PROGRESS',
      });

      const result = await updateSessionStatus('session-123', 'IN_PROGRESS', 'user-123');

      expect(mockSessionUpdate).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: {
          status: 'IN_PROGRESS',
          statusUpdatedDate: expect.any(Date),
          lastModifiedBy: 'user-123',
        },
      });
      expect(result.status).toBe('IN_PROGRESS');
    });
  });

  describe('enableRecording', () => {
    it('should enable recording with consent', async () => {
      mockSessionUpdate.mockResolvedValue({
        id: 'session-123',
        recordingEnabled: true,
        recordingConsent: true,
        recordingStartedAt: expect.any(Date),
      });

      const result = await enableRecording('session-123', 'user-123', true);

      expect(mockSessionUpdate).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: {
          recordingEnabled: true,
          recordingConsent: true,
          recordingStartedAt: expect.any(Date),
          lastModifiedBy: 'user-123',
        },
      });
      expect(result.recordingEnabled).toBe(true);
    });

    it('should enable recording without consent', async () => {
      mockSessionUpdate.mockResolvedValue({
        id: 'session-123',
        recordingEnabled: true,
        recordingConsent: false,
      });

      const result = await enableRecording('session-123', 'user-123', false);
      expect(result.recordingConsent).toBe(false);
    });
  });

  describe('stopRecording', () => {
    it('should stop recording', async () => {
      mockSessionUpdate.mockResolvedValue({
        id: 'session-123',
        recordingStoppedAt: new Date(),
      });

      const result = await stopRecording('session-123', 'user-123');

      expect(mockSessionUpdate).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: {
          recordingStoppedAt: expect.any(Date),
          lastModifiedBy: 'user-123',
        },
      });
      expect(result.recordingStoppedAt).toBeDefined();
    });
  });

  describe('getTwilioStatus', () => {
    it('should return Twilio config status', () => {
      mockGetTwilioConfigStatus.mockReturnValue({ configured: true });

      const result = getTwilioStatus();

      expect(mockGetTwilioConfigStatus).toHaveBeenCalled();
      expect(result).toEqual({ configured: true });
    });
  });

  describe('getClientEmergencyContact', () => {
    it('should return primary emergency contact', async () => {
      mockSessionFindUnique.mockResolvedValue({
        id: 'session-123',
        appointment: {
          client: {
            id: 'client-123',
            emergencyContacts: [
              { name: 'Jane Doe', phone: '555-1234', relationship: 'Spouse', isPrimary: true },
            ],
          },
        },
      });

      const result = await getClientEmergencyContact('session-123');

      expect(result).toEqual({
        name: 'Jane Doe',
        phone: '555-1234',
        relationship: 'Spouse',
      });
    });

    it('should return null if no emergency contact', async () => {
      mockSessionFindUnique.mockResolvedValue({
        id: 'session-123',
        appointment: {
          client: {
            id: 'client-123',
            emergencyContacts: [],
          },
        },
      });

      const result = await getClientEmergencyContact('session-123');
      expect(result).toBeNull();
    });

    it('should throw error if session not found', async () => {
      mockSessionFindUnique.mockResolvedValue(null);

      await expect(
        getClientEmergencyContact('nonexistent')
      ).rejects.toThrow('Telehealth session not found');
    });
  });

  describe('activateEmergency', () => {
    it('should activate emergency protocol', async () => {
      mockSessionFindUnique.mockResolvedValue({
        id: 'session-123',
        hipaaAuditLog: { events: [] },
        appointment: {
          client: { id: 'client-123' },
          clinician: { id: 'clinician-123' },
        },
      });
      mockSessionUpdate.mockResolvedValue({
        id: 'session-123',
        emergencyActivated: true,
        emergencyResolution: 'CONTINUED',
      });

      const result = await activateEmergency({
        sessionId: 'session-123',
        emergencyNotes: 'Client expressed suicidal ideation',
        emergencyResolution: 'CONTINUED',
        emergencyContactNotified: true,
        userId: 'clinician-123',
      });

      expect(mockSessionUpdate).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: expect.objectContaining({
          emergencyActivated: true,
          emergencyResolution: 'CONTINUED',
          emergencyContactNotified: true,
        }),
      });
      expect(result.emergencyActivated).toBe(true);
    });

    it('should end session immediately when resolution is ENDED_IMMEDIATELY', async () => {
      mockSessionFindUnique.mockResolvedValue({
        id: 'session-123',
        hipaaAuditLog: null,
        appointment: {
          client: { id: 'client-123' },
          clinician: { id: 'clinician-123' },
        },
      });
      mockSessionUpdate
        .mockResolvedValueOnce({ id: 'session-123', emergencyActivated: true })
        .mockResolvedValueOnce({ id: 'session-123', status: 'COMPLETED' });

      await activateEmergency({
        sessionId: 'session-123',
        emergencyNotes: 'Emergency situation',
        emergencyResolution: 'ENDED_IMMEDIATELY',
        emergencyContactNotified: true,
        userId: 'clinician-123',
      });

      // Should have been called twice - once for emergency activation, once for ending session
      expect(mockSessionUpdate).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyClientConsent', () => {
    it('should return valid consent status', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);

      mockConsentFindFirst.mockResolvedValue({
        id: 'consent-123',
        clientId: 'client-123',
        consentGiven: true,
        expirationDate: futureDate,
      });

      const result = await verifyClientConsent('client-123');

      expect(result.isValid).toBe(true);
      expect(result.requiresRenewal).toBe(false);
    });

    it('should return invalid when no consent found', async () => {
      mockConsentFindFirst.mockResolvedValue(null);

      const result = await verifyClientConsent('client-123');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('No telehealth consent found');
    });

    it('should return invalid when consent not signed', async () => {
      mockConsentFindFirst.mockResolvedValue({
        id: 'consent-123',
        consentGiven: false,
        expirationDate: new Date(),
      });

      const result = await verifyClientConsent('client-123');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('not been signed');
    });

    it('should return invalid when consent expired', async () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);

      mockConsentFindFirst.mockResolvedValue({
        id: 'consent-123',
        consentGiven: true,
        expirationDate: pastDate,
      });

      const result = await verifyClientConsent('client-123');

      expect(result.isValid).toBe(false);
      expect(result.requiresRenewal).toBe(true);
      expect(result.message).toContain('expired');
    });

    it('should flag renewal required when expiring within 30 days', async () => {
      const nearExpirationDate = new Date();
      nearExpirationDate.setDate(nearExpirationDate.getDate() + 15);

      mockConsentFindFirst.mockResolvedValue({
        id: 'consent-123',
        consentGiven: true,
        expirationDate: nearExpirationDate,
      });

      const result = await verifyClientConsent('client-123');

      expect(result.isValid).toBe(true);
      expect(result.requiresRenewal).toBe(true);
      expect(result.daysTillExpiration).toBeLessThanOrEqual(30);
    });
  });

  describe('createSessionRating', () => {
    it('should create a session rating', async () => {
      mockSessionFindUnique.mockResolvedValue({
        id: 'session-123',
        appointment: {
          client: { id: 'client-123' },
        },
      });
      mockRatingFindUnique.mockResolvedValue(null);
      mockRatingCreate.mockResolvedValue({
        id: 'rating-123',
        sessionId: 'session-123',
        rating: 5,
        comments: 'Great session!',
      });

      const result = await createSessionRating({
        sessionId: 'session-123',
        userId: 'client-123',
        rating: 5,
        comments: 'Great session!',
        ipAddress: '127.0.0.1',
      });

      expect(result.rating).toBe(5);
      expect(mockRatingCreate).toHaveBeenCalled();
    });

    it('should throw error if session not found', async () => {
      mockSessionFindUnique.mockResolvedValue(null);

      await expect(
        createSessionRating({
          sessionId: 'nonexistent',
          userId: 'client-123',
          rating: 5,
          comments: null,
          ipAddress: '127.0.0.1',
        })
      ).rejects.toThrow('Session not found');
    });

    it('should throw error if user is not the session client', async () => {
      mockSessionFindUnique.mockResolvedValue({
        id: 'session-123',
        appointment: {
          client: { id: 'other-client' },
        },
      });

      await expect(
        createSessionRating({
          sessionId: 'session-123',
          userId: 'client-123',
          rating: 5,
          comments: null,
          ipAddress: '127.0.0.1',
        })
      ).rejects.toThrow('Only the session client can rate');
    });

    it('should throw error if rating already exists', async () => {
      mockSessionFindUnique.mockResolvedValue({
        id: 'session-123',
        appointment: {
          client: { id: 'client-123' },
        },
      });
      mockRatingFindUnique.mockResolvedValue({ id: 'existing-rating' });

      await expect(
        createSessionRating({
          sessionId: 'session-123',
          userId: 'client-123',
          rating: 5,
          comments: null,
          ipAddress: '127.0.0.1',
        })
      ).rejects.toThrow('already been rated');
    });
  });

  describe('getAllSessionRatings', () => {
    it('should return paginated ratings for admin', async () => {
      const mockRatings = [
        { id: 'rating-1', rating: 5, shareWithAdmin: true },
        { id: 'rating-2', rating: 4, shareWithAdmin: true },
      ];
      mockRatingFindMany.mockResolvedValue(mockRatings);
      mockRatingCount.mockResolvedValue(2);

      const result = await getAllSessionRatings({
        page: 1,
        limit: 10,
        viewerRole: 'admin',
      });

      expect(result.ratings).toHaveLength(2);
      expect(result.pagination.totalCount).toBe(2);
    });

    it('should filter by rating range', async () => {
      mockRatingFindMany.mockResolvedValue([]);
      mockRatingCount.mockResolvedValue(0);

      await getAllSessionRatings({
        page: 1,
        limit: 10,
        minRating: 4,
        maxRating: 5,
      });

      expect(mockRatingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            rating: { gte: 4, lte: 5 },
          }),
        })
      );
    });

    it('should filter by date range', async () => {
      mockRatingFindMany.mockResolvedValue([]);
      mockRatingCount.mockResolvedValue(0);

      await getAllSessionRatings({
        page: 1,
        limit: 10,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(mockRatingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            submittedAt: expect.any(Object),
          }),
        })
      );
    });

    it('should filter for clinician with shareWithTherapist', async () => {
      mockRatingFindMany.mockResolvedValue([]);
      mockRatingCount.mockResolvedValue(0);

      await getAllSessionRatings({
        page: 1,
        limit: 10,
        viewerRole: 'clinician',
        viewerId: 'clinician-123',
      });

      expect(mockRatingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            shareWithTherapist: true,
            session: {
              appointment: {
                clinicianId: 'clinician-123',
              },
            },
          }),
        })
      );
    });
  });

  describe('getSessionRatingStats', () => {
    it('should return rating statistics', async () => {
      mockRatingCount.mockResolvedValue(100);
      mockRatingAggregate.mockResolvedValue({ _avg: { rating: 4.5 } });
      mockRatingGroupBy.mockResolvedValue([
        { rating: 5, _count: { rating: 60 } },
        { rating: 4, _count: { rating: 30 } },
        { rating: 3, _count: { rating: 10 } },
      ]);

      const result = await getSessionRatingStats();

      expect(result.totalRatings).toBe(100);
      expect(result.averageRating).toBe(4.5);
      expect(result.distribution).toHaveLength(5); // All 5 star ratings
    });

    it('should handle empty statistics', async () => {
      mockRatingCount.mockResolvedValue(0);
      mockRatingAggregate.mockResolvedValue({ _avg: { rating: null } });
      mockRatingGroupBy.mockResolvedValue([]);

      const result = await getSessionRatingStats();

      expect(result.totalRatings).toBe(0);
      expect(result.averageRating).toBe(0);
    });
  });

  describe('getSessionRating', () => {
    const mockRating = {
      id: 'rating-123',
      sessionId: 'session-123',
      rating: 5,
      shareWithAdmin: true,
      shareWithTherapist: true,
      session: {
        appointment: {
          clinicianId: 'clinician-123',
          clinician: { id: 'clinician-123' },
        },
      },
    };

    it('should return rating for admin when shareWithAdmin is true', async () => {
      mockRatingFindUnique.mockResolvedValue(mockRating);

      const result = await getSessionRating('session-123', 'admin', 'admin-123');

      expect(result).toEqual(mockRating);
    });

    it('should return null for admin when shareWithAdmin is false', async () => {
      mockRatingFindUnique.mockResolvedValue({
        ...mockRating,
        shareWithAdmin: false,
      });

      const result = await getSessionRating('session-123', 'admin', 'admin-123');

      expect(result).toBeNull();
    });

    it('should return rating for clinician when shareWithTherapist is true', async () => {
      mockRatingFindUnique.mockResolvedValue(mockRating);

      const result = await getSessionRating('session-123', 'clinician', 'clinician-123');

      expect(result).toEqual(mockRating);
    });

    it('should return null for clinician when they are not the session clinician', async () => {
      mockRatingFindUnique.mockResolvedValue(mockRating);

      const result = await getSessionRating('session-123', 'clinician', 'other-clinician');

      expect(result).toBeNull();
    });

    it('should return null when rating not found', async () => {
      mockRatingFindUnique.mockResolvedValue(null);

      const result = await getSessionRating('nonexistent', 'admin', 'admin-123');

      expect(result).toBeNull();
    });
  });
});
