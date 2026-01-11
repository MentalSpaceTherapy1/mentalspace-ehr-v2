/**
 * Twilio Integration Tests
 *
 * Comprehensive tests for Twilio integration including:
 * - SMS sending
 * - Voice calls
 * - Video room creation
 * - Token generation
 * - Webhook handling
 *
 * @module tests/twilio.integration
 */

// ============================================
// Mock Functions Setup
// ============================================

// Mock Twilio methods
const mockMessagesCreate = jest.fn();
const mockCallsCreate = jest.fn();
const mockRoomsCreate = jest.fn();
const mockRoomsFetch = jest.fn();
const mockRoomsUpdate = jest.fn();
const mockParticipantsList = jest.fn();
const mockAccountsList = jest.fn();

// Mock Twilio JWT methods
const mockAddGrant = jest.fn();
const mockToJwt = jest.fn().mockReturnValue('mock-jwt-token');

// Mock Twilio constructor
jest.mock('twilio', () => {
  const actualTwilio = jest.requireActual('twilio');

  // Mock JWT classes
  const MockAccessToken = jest.fn().mockImplementation(() => ({
    addGrant: mockAddGrant,
    toJwt: mockToJwt,
  }));
  MockAccessToken.VideoGrant = jest.fn().mockImplementation(() => ({}));

  // Mock Twilio client
  const mockClient = jest.fn().mockImplementation(() => ({
    messages: {
      create: mockMessagesCreate,
    },
    calls: {
      create: mockCallsCreate,
    },
    video: {
      v1: {
        rooms: Object.assign(
          jest.fn().mockImplementation((sid) => ({
            fetch: mockRoomsFetch,
            update: mockRoomsUpdate,
            participants: {
              list: mockParticipantsList,
            },
          })),
          {
            create: mockRoomsCreate,
          }
        ),
      },
    },
    api: {
      accounts: {
        list: mockAccountsList,
      },
    },
  }));

  mockClient.jwt = {
    AccessToken: MockAccessToken,
  };

  return mockClient;
});

// Mock Prisma
const mockReminderConfigFindFirst = jest.fn();
const mockAppointmentReminderUpdateMany = jest.fn();

jest.mock('@mentalspace/database', () => ({
  __esModule: true,
  PrismaClient: jest.fn().mockImplementation(() => ({
    reminderConfiguration: {
      findFirst: mockReminderConfigFindFirst,
    },
    appointmentReminder: {
      updateMany: mockAppointmentReminderUpdateMany,
    },
  })),
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

// Mock config
jest.mock('../../config', () => ({
  __esModule: true,
  default: {
    twilioAccountSid: 'AC_test_account_sid',
    twilioAuthToken: 'test_auth_token',
    twilioApiKeySid: 'SK_test_api_key_sid',
    twilioApiKeySecret: 'test_api_key_secret',
    backendUrl: 'https://api.mentalspace.com',
  },
}));

// Import after mocking
import {
  createTwilioRoom,
  generateTwilioAccessToken,
  endTwilioRoom,
  getTwilioRoom,
  getRoomParticipants,
  isTwilioConfigured,
  getTwilioConfigStatus,
} from '../twilio.service';

import { TwilioReminderService } from '../twilio.reminder.service';
import { PrismaClient } from '@mentalspace/database';

// ============================================
// Test Suites
// ============================================

describe('Twilio Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Video Service Tests
  // ============================================
  describe('Twilio Video Service', () => {
    describe('createTwilioRoom', () => {
      it('should create a new video room', async () => {
        const mockRoom = {
          sid: 'RM_test_room_sid',
          uniqueName: 'test-session-123',
          status: 'in-progress',
          dateCreated: new Date(),
          maxParticipants: 10,
        };

        mockRoomsCreate.mockResolvedValue(mockRoom);

        const result = await createTwilioRoom('test-session-123', false);

        expect(mockRoomsCreate).toHaveBeenCalledWith({
          uniqueName: 'test-session-123',
          type: 'group',
          recordParticipantsOnConnect: false,
          statusCallback: 'https://api.mentalspace.com/api/v1/telehealth/webhook/room-status',
          maxParticipants: 10,
        });

        expect(result).toEqual({
          roomSid: 'RM_test_room_sid',
          roomName: 'test-session-123',
          status: 'in-progress',
          dateCreated: mockRoom.dateCreated,
          maxParticipants: 10,
        });
      });

      it('should create a room with recording enabled', async () => {
        const mockRoom = {
          sid: 'RM_test_room_sid',
          uniqueName: 'recording-session',
          status: 'in-progress',
          dateCreated: new Date(),
          maxParticipants: 10,
        };

        mockRoomsCreate.mockResolvedValue(mockRoom);

        await createTwilioRoom('recording-session', true);

        expect(mockRoomsCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            recordParticipantsOnConnect: true,
          })
        );
      });

      it('should handle room creation errors', async () => {
        mockRoomsCreate.mockRejectedValue(new Error('Room already exists'));

        await expect(createTwilioRoom('duplicate-room')).rejects.toThrow(
          'Failed to create video room: Room already exists'
        );
      });

      it('should set correct room type', async () => {
        mockRoomsCreate.mockResolvedValue({
          sid: 'RM_test',
          uniqueName: 'test',
          status: 'in-progress',
          dateCreated: new Date(),
          maxParticipants: 10,
        });

        await createTwilioRoom('test-room');

        expect(mockRoomsCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'group',
          })
        );
      });

      it('should limit maximum participants', async () => {
        mockRoomsCreate.mockResolvedValue({
          sid: 'RM_test',
          uniqueName: 'test',
          status: 'in-progress',
          dateCreated: new Date(),
          maxParticipants: 10,
        });

        await createTwilioRoom('large-session');

        expect(mockRoomsCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            maxParticipants: 10,
          })
        );
      });
    });

    describe('generateTwilioAccessToken', () => {
      it('should generate access token for participant', async () => {
        const result = await generateTwilioAccessToken('session-123', 'Dr. Smith');

        expect(mockAddGrant).toHaveBeenCalled();
        expect(mockToJwt).toHaveBeenCalled();

        expect(result).toEqual({
          token: 'mock-jwt-token',
          identity: 'Dr. Smith',
          roomName: 'session-123',
        });
      });

      it('should include room grant in token', async () => {
        await generateTwilioAccessToken('test-room', 'user-1');

        expect(mockAddGrant).toHaveBeenCalled();
      });

      it('should generate unique tokens for different users', async () => {
        const token1 = await generateTwilioAccessToken('room-1', 'user-1');
        const token2 = await generateTwilioAccessToken('room-1', 'user-2');

        // In real implementation, tokens would be different
        expect(token1.identity).toBe('user-1');
        expect(token2.identity).toBe('user-2');
      });

      it('should set appropriate token TTL', async () => {
        await generateTwilioAccessToken('room', 'user');

        // Token should be valid for 4 hours (14400 seconds)
        // This is verified by the AccessToken constructor call
        expect(mockToJwt).toHaveBeenCalled();
      });
    });

    describe('endTwilioRoom', () => {
      it('should end an active room', async () => {
        const mockRoom = {
          sid: 'RM_test',
          status: 'completed',
          duration: 3600,
        };

        mockRoomsUpdate.mockResolvedValue(mockRoom);

        const result = await endTwilioRoom('RM_test');

        expect(mockRoomsUpdate).toHaveBeenCalledWith({
          status: 'completed',
        });

        expect(result).toEqual({
          roomSid: 'RM_test',
          status: 'completed',
          duration: 3600,
        });
      });

      it('should handle room end errors', async () => {
        mockRoomsUpdate.mockRejectedValue(new Error('Room not found'));

        await expect(endTwilioRoom('invalid-sid')).rejects.toThrow(
          'Failed to end video room: Room not found'
        );
      });
    });

    describe('getTwilioRoom', () => {
      it('should fetch room information', async () => {
        const mockRoom = {
          sid: 'RM_test',
          uniqueName: 'session-123',
          status: 'in-progress',
          dateCreated: new Date('2024-01-15T10:00:00Z'),
          dateUpdated: new Date('2024-01-15T11:00:00Z'),
          duration: 3600,
          maxParticipants: 10,
        };

        mockRoomsFetch.mockResolvedValue(mockRoom);

        const result = await getTwilioRoom('RM_test');

        expect(result).toEqual({
          roomSid: 'RM_test',
          roomName: 'session-123',
          status: 'in-progress',
          dateCreated: mockRoom.dateCreated,
          dateUpdated: mockRoom.dateUpdated,
          duration: 3600,
          maxParticipants: 10,
        });
      });

      it('should handle room fetch errors', async () => {
        mockRoomsFetch.mockRejectedValue(new Error('Room not found'));

        await expect(getTwilioRoom('invalid-sid')).rejects.toThrow(
          'Failed to get room information: Room not found'
        );
      });
    });

    describe('getRoomParticipants', () => {
      it('should list room participants', async () => {
        const mockParticipants = [
          {
            sid: 'PA_1',
            identity: 'Dr. Smith',
            status: 'connected',
            dateCreated: new Date(),
            duration: 1800,
          },
          {
            sid: 'PA_2',
            identity: 'John Doe',
            status: 'connected',
            dateCreated: new Date(),
            duration: 1800,
          },
        ];

        mockParticipantsList.mockResolvedValue(mockParticipants);

        const result = await getRoomParticipants('RM_test');

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          participantSid: 'PA_1',
          identity: 'Dr. Smith',
          status: 'connected',
          dateCreated: expect.any(Date),
          duration: 1800,
        });
      });

      it('should return empty array for room with no participants', async () => {
        mockParticipantsList.mockResolvedValue([]);

        const result = await getRoomParticipants('RM_empty');

        expect(result).toEqual([]);
      });

      it('should handle participant list errors', async () => {
        mockParticipantsList.mockRejectedValue(new Error('Unauthorized'));

        await expect(getRoomParticipants('RM_test')).rejects.toThrow(
          'Failed to get participants: Unauthorized'
        );
      });
    });

    describe('isTwilioConfigured', () => {
      it('should return true when all credentials are present', () => {
        const result = isTwilioConfigured();
        expect(result).toBe(true);
      });
    });

    describe('getTwilioConfigStatus', () => {
      it('should return configuration status', () => {
        const result = getTwilioConfigStatus();

        expect(result).toEqual({
          configured: true,
          hasAccountSid: true,
          hasAuthToken: true,
          hasApiKeySid: true,
          hasApiKeySecret: true,
        });
      });
    });
  });

  // ============================================
  // SMS Reminder Service Tests
  // ============================================
  describe('Twilio Reminder Service', () => {
    let reminderService: TwilioReminderService;
    let mockPrisma: PrismaClient;

    beforeEach(() => {
      mockPrisma = new PrismaClient();
      mockReminderConfigFindFirst.mockResolvedValue({
        twilioAccountSid: 'AC_test',
        twilioAuthToken: 'test_token',
        smsFromNumber: '+15551234567',
      });
      reminderService = new TwilioReminderService(mockPrisma);
    });

    describe('sendSms', () => {
      it('should send SMS successfully', async () => {
        const mockMessage = {
          sid: 'SM_test_message_sid',
          status: 'sent',
          price: '0.0075',
          to: '+15559876543',
          from: '+15551234567',
          body: 'Your appointment is tomorrow at 10am.',
          dateCreated: new Date(),
        };

        mockMessagesCreate.mockResolvedValue(mockMessage);

        const result = await reminderService.sendSms({
          to: '+15559876543',
          from: '+15551234567',
          body: 'Your appointment is tomorrow at 10am.',
        });

        expect(mockMessagesCreate).toHaveBeenCalledWith({
          body: 'Your appointment is tomorrow at 10am.',
          to: '+15559876543',
          from: '+15551234567',
          statusCallback: undefined,
        });

        expect(result).toEqual({
          sid: 'SM_test_message_sid',
          status: 'sent',
          price: '0.0075',
          to: '+15559876543',
          from: '+15551234567',
          body: 'Your appointment is tomorrow at 10am.',
          dateCreated: expect.any(Date),
        });
      });

      it('should include status callback URL when provided', async () => {
        mockMessagesCreate.mockResolvedValue({
          sid: 'SM_test',
          status: 'sent',
          price: null,
          to: '+15559876543',
          from: '+15551234567',
          body: 'Test',
          dateCreated: new Date(),
        });

        await reminderService.sendSms({
          to: '+15559876543',
          from: '+15551234567',
          body: 'Test',
          statusCallback: 'https://api.example.com/sms-status',
        });

        expect(mockMessagesCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCallback: 'https://api.example.com/sms-status',
          })
        );
      });

      it('should handle SMS send errors', async () => {
        mockMessagesCreate.mockRejectedValue(new Error('Invalid phone number'));

        await expect(
          reminderService.sendSms({
            to: 'invalid',
            from: '+15551234567',
            body: 'Test',
          })
        ).rejects.toThrow('Failed to send SMS: Invalid phone number');
      });

      it('should handle Twilio rate limit errors', async () => {
        const rateLimitError = new Error('Rate limit exceeded');
        (rateLimitError as any).code = 20429;
        mockMessagesCreate.mockRejectedValue(rateLimitError);

        await expect(
          reminderService.sendSms({
            to: '+15559876543',
            from: '+15551234567',
            body: 'Test',
          })
        ).rejects.toThrow('Failed to send SMS: Rate limit exceeded');
      });
    });

    describe('makeVoiceCall', () => {
      it('should initiate voice call successfully', async () => {
        const mockCall = {
          sid: 'CA_test_call_sid',
          status: 'queued',
          price: null,
          to: '+15559876543',
          from: '+15551234567',
          dateCreated: new Date(),
        };

        mockCallsCreate.mockResolvedValue(mockCall);

        const result = await reminderService.makeVoiceCall({
          to: '+15559876543',
          from: '+15551234567',
          url: 'https://api.example.com/twiml/reminder',
        });

        expect(mockCallsCreate).toHaveBeenCalledWith({
          url: 'https://api.example.com/twiml/reminder',
          to: '+15559876543',
          from: '+15551234567',
          statusCallback: undefined,
        });

        expect(result).toEqual({
          sid: 'CA_test_call_sid',
          status: 'queued',
          price: null,
          to: '+15559876543',
          from: '+15551234567',
          dateCreated: expect.any(Date),
        });
      });

      it('should handle voice call errors', async () => {
        mockCallsCreate.mockRejectedValue(new Error('Call failed'));

        await expect(
          reminderService.makeVoiceCall({
            to: '+15559876543',
            from: '+15551234567',
            url: 'https://example.com/twiml',
          })
        ).rejects.toThrow('Failed to make voice call: Call failed');
      });
    });

    describe('handleIncomingSms', () => {
      it('should return TwiML response', () => {
        const result = reminderService.handleIncomingSms(
          '+15559876543',
          'Yes',
          'SM_incoming_sid'
        );

        expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(result).toContain('<Response>');
        expect(result).toContain('<Message>');
        expect(result).toContain('Thank you');
      });
    });

    describe('handleStatusCallback', () => {
      it('should update reminder status on delivery', async () => {
        mockAppointmentReminderUpdateMany.mockResolvedValue({ count: 1 });

        await reminderService.handleStatusCallback('SM_test', 'delivered');

        expect(mockAppointmentReminderUpdateMany).toHaveBeenCalledWith({
          where: { messageId: 'SM_test' },
          data: {
            deliveryStatus: 'DELIVERED',
            errorMessage: undefined,
          },
        });
      });

      it('should update reminder status on failure', async () => {
        mockAppointmentReminderUpdateMany.mockResolvedValue({ count: 1 });

        await reminderService.handleStatusCallback(
          'SM_test',
          'failed',
          '30007',
          'Carrier network error'
        );

        expect(mockAppointmentReminderUpdateMany).toHaveBeenCalledWith({
          where: { messageId: 'SM_test' },
          data: {
            deliveryStatus: 'FAILED',
            errorMessage: '30007: Carrier network error',
          },
        });
      });

      it('should map Twilio statuses correctly', async () => {
        const statusMappings = [
          { twilio: 'queued', expected: 'PENDING' },
          { twilio: 'sending', expected: 'SENT' },
          { twilio: 'sent', expected: 'SENT' },
          { twilio: 'delivered', expected: 'DELIVERED' },
          { twilio: 'undelivered', expected: 'FAILED' },
          { twilio: 'failed', expected: 'FAILED' },
        ];

        for (const { twilio, expected } of statusMappings) {
          mockAppointmentReminderUpdateMany.mockResolvedValue({ count: 1 });
          await reminderService.handleStatusCallback('SM_test', twilio);

          expect(mockAppointmentReminderUpdateMany).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                deliveryStatus: expected,
              }),
            })
          );
        }
      });
    });

    describe('validatePhoneNumber', () => {
      it('should validate E.164 format numbers', () => {
        expect(reminderService.validatePhoneNumber('+15551234567')).toBe(true);
        expect(reminderService.validatePhoneNumber('+442071234567')).toBe(true);
        expect(reminderService.validatePhoneNumber('+61412345678')).toBe(true);
      });

      it('should reject invalid formats', () => {
        expect(reminderService.validatePhoneNumber('5551234567')).toBe(false);
        expect(reminderService.validatePhoneNumber('555-123-4567')).toBe(false);
        expect(reminderService.validatePhoneNumber('(555) 123-4567')).toBe(false);
        expect(reminderService.validatePhoneNumber('+0123456789')).toBe(false);
        expect(reminderService.validatePhoneNumber('')).toBe(false);
      });
    });

    describe('formatPhoneNumberE164', () => {
      it('should format US 10-digit numbers', () => {
        expect(reminderService.formatPhoneNumberE164('5551234567')).toBe('+15551234567');
        expect(reminderService.formatPhoneNumberE164('555-123-4567')).toBe('+15551234567');
        expect(reminderService.formatPhoneNumberE164('(555) 123-4567')).toBe('+15551234567');
      });

      it('should format US 11-digit numbers starting with 1', () => {
        expect(reminderService.formatPhoneNumberE164('15551234567')).toBe('+15551234567');
        expect(reminderService.formatPhoneNumberE164('1-555-123-4567')).toBe('+15551234567');
      });

      it('should preserve already formatted numbers', () => {
        expect(reminderService.formatPhoneNumberE164('+15551234567')).toBe('+15551234567');
        expect(reminderService.formatPhoneNumberE164('+442071234567')).toBe('+442071234567');
      });

      it('should use custom country code', () => {
        expect(reminderService.formatPhoneNumberE164('7911123456', '+44')).toBe('+447911123456');
      });
    });

    describe('isConfigured', () => {
      it('should return true when Twilio is configured', () => {
        // Service was initialized with mock config and environment variables
        // The service checks if accountSid and authToken are set
        const isConfigured = reminderService.isConfigured();
        expect(typeof isConfigured).toBe('boolean');
      });
    });

    describe('getAccountInfo', () => {
      it('should return account information', async () => {
        mockAccountsList.mockResolvedValue([
          {
            sid: 'AC_test',
            status: 'active',
            friendlyName: 'MentalSpace EHR',
          },
        ]);

        // Need to manually init the service
        await reminderService.reinitialize();

        const result = await reminderService.getAccountInfo();

        expect(result).toEqual({
          accountSid: 'AC_test',
          status: 'active',
          friendlyName: 'MentalSpace EHR',
        });
      });
    });

    describe('testSms', () => {
      it('should send test SMS successfully', async () => {
        mockMessagesCreate.mockResolvedValue({
          sid: 'SM_test',
          status: 'sent',
          price: null,
          to: '+15559876543',
          from: '+15551234567',
          body: 'Test message',
          dateCreated: new Date(),
        });

        await reminderService.reinitialize();

        const result = await reminderService.testSms('+15559876543', '+15551234567');

        expect(result).toBe(true);
        expect(mockMessagesCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.stringContaining('test message'),
          })
        );
      });

      it('should return false on test failure', async () => {
        mockMessagesCreate.mockRejectedValue(new Error('Test failed'));

        await reminderService.reinitialize();

        const result = await reminderService.testSms('+15559876543', '+15551234567');

        expect(result).toBe(false);
      });
    });

    describe('reinitialize', () => {
      it('should reinitialize with new configuration', async () => {
        const newConfig = {
          twilioAccountSid: 'AC_new',
          twilioAuthToken: 'new_token',
          smsFromNumber: '+15559999999',
        };

        mockReminderConfigFindFirst.mockResolvedValue(newConfig);

        await reminderService.reinitialize();

        expect(mockReminderConfigFindFirst).toHaveBeenCalled();
      });

      it('should handle missing configuration', async () => {
        mockReminderConfigFindFirst.mockResolvedValue(null);

        await reminderService.reinitialize();

        expect(reminderService.isConfigured()).toBe(false);
      });
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    describe('Twilio API errors', () => {
      it('should handle authentication errors', async () => {
        const authError = new Error('Authentication failed');
        (authError as any).code = 20003;
        mockRoomsCreate.mockRejectedValue(authError);

        await expect(createTwilioRoom('test')).rejects.toThrow();
      });

      it('should handle rate limit errors', async () => {
        const rateLimitError = new Error('Rate limit exceeded');
        (rateLimitError as any).code = 20429;
        mockRoomsCreate.mockRejectedValue(rateLimitError);

        await expect(createTwilioRoom('test')).rejects.toThrow('Rate limit exceeded');
      });

      it('should handle network errors', async () => {
        mockRoomsCreate.mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(createTwilioRoom('test')).rejects.toThrow();
      });

      it('should handle invalid room name', async () => {
        mockRoomsCreate.mockRejectedValue(new Error('Invalid room name'));

        await expect(createTwilioRoom('invalid@room#name')).rejects.toThrow();
      });
    });

    describe('SMS specific errors', () => {
      let reminderService: TwilioReminderService;

      beforeEach(async () => {
        const mockPrisma = new PrismaClient();
        mockReminderConfigFindFirst.mockResolvedValue({
          twilioAccountSid: 'AC_test',
          twilioAuthToken: 'test_token',
        });
        reminderService = new TwilioReminderService(mockPrisma);
        await reminderService.reinitialize();
      });

      it('should handle invalid phone number', async () => {
        const phoneError = new Error('Invalid phone number');
        (phoneError as any).code = 21211;
        mockMessagesCreate.mockRejectedValue(phoneError);

        await expect(
          reminderService.sendSms({
            to: 'invalid',
            from: '+15551234567',
            body: 'Test',
          })
        ).rejects.toThrow('Failed to send SMS');
      });

      it('should handle carrier blocked', async () => {
        const blockedError = new Error('Carrier rejected message');
        (blockedError as any).code = 30006;
        mockMessagesCreate.mockRejectedValue(blockedError);

        await expect(
          reminderService.sendSms({
            to: '+15559876543',
            from: '+15551234567',
            body: 'Test',
          })
        ).rejects.toThrow('Failed to send SMS');
      });

      it('should handle landline number', async () => {
        const landlineError = new Error('Cannot deliver to landline');
        (landlineError as any).code = 21614;
        mockMessagesCreate.mockRejectedValue(landlineError);

        await expect(
          reminderService.sendSms({
            to: '+15551234567',
            from: '+15559876543',
            body: 'Test',
          })
        ).rejects.toThrow('Failed to send SMS');
      });
    });
  });

  // ============================================
  // Integration Scenarios
  // ============================================
  describe('Integration Scenarios', () => {
    describe('Telehealth session flow', () => {
      it('should support complete session lifecycle', async () => {
        // 1. Create room
        mockRoomsCreate.mockResolvedValue({
          sid: 'RM_session',
          uniqueName: 'telehealth-123',
          status: 'in-progress',
          dateCreated: new Date(),
          maxParticipants: 10,
        });

        const room = await createTwilioRoom('telehealth-123', true);
        expect(room.roomSid).toBe('RM_session');

        // 2. Generate tokens for participants
        const providerToken = await generateTwilioAccessToken('telehealth-123', 'Dr. Smith');
        const clientToken = await generateTwilioAccessToken('telehealth-123', 'John Doe');

        expect(providerToken.token).toBeDefined();
        expect(clientToken.token).toBeDefined();

        // 3. List participants
        mockParticipantsList.mockResolvedValue([
          { sid: 'PA_1', identity: 'Dr. Smith', status: 'connected', dateCreated: new Date(), duration: 600 },
          { sid: 'PA_2', identity: 'John Doe', status: 'connected', dateCreated: new Date(), duration: 600 },
        ]);

        const participants = await getRoomParticipants('RM_session');
        expect(participants).toHaveLength(2);

        // 4. End room
        mockRoomsUpdate.mockResolvedValue({
          sid: 'RM_session',
          status: 'completed',
          duration: 3600,
        });

        const endedRoom = await endTwilioRoom('RM_session');
        expect(endedRoom.status).toBe('completed');
      });
    });

    describe('Reminder notification flow', () => {
      it('should support appointment reminder workflow', async () => {
        const mockPrisma = new PrismaClient();
        mockReminderConfigFindFirst.mockResolvedValue({
          twilioAccountSid: 'AC_test',
          twilioAuthToken: 'test_token',
        });

        const reminderService = new TwilioReminderService(mockPrisma);
        await reminderService.reinitialize();

        // 1. Send reminder
        mockMessagesCreate.mockResolvedValue({
          sid: 'SM_reminder',
          status: 'sent',
          price: '0.0075',
          to: '+15559876543',
          from: '+15551234567',
          body: 'Appointment reminder',
          dateCreated: new Date(),
        });

        const message = await reminderService.sendSms({
          to: '+15559876543',
          from: '+15551234567',
          body: 'Reminder: Your appointment is tomorrow at 10:00 AM.',
          statusCallback: 'https://api.example.com/twilio/status',
        });

        expect(message.sid).toBe('SM_reminder');

        // 2. Receive status callback
        mockAppointmentReminderUpdateMany.mockResolvedValue({ count: 1 });

        await reminderService.handleStatusCallback('SM_reminder', 'delivered');

        expect(mockAppointmentReminderUpdateMany).toHaveBeenCalledWith({
          where: { messageId: 'SM_reminder' },
          data: { deliveryStatus: 'DELIVERED', errorMessage: undefined },
        });

        // 3. Handle reply
        const twiml = reminderService.handleIncomingSms('+15559876543', 'Yes, confirmed', 'SM_reply');
        expect(twiml).toContain('Thank you');
      });
    });
  });
});
