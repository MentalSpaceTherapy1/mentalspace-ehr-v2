import twilio from 'twilio';
import config from '../config';
import logger from '../utils/logger';

// Initialize Twilio client
const accountSid = config.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
const authToken = config.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
const apiKeySid = config.twilioApiKeySid || process.env.TWILIO_API_KEY_SID;
const apiKeySecret = config.twilioApiKeySecret || process.env.TWILIO_API_KEY_SECRET;

let twilioClient: twilio.Twilio | null = null;

// Only initialize if credentials are available
if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
}

/**
 * Create a new Twilio Video room for a telehealth session
 */
export async function createTwilioRoom(uniqueName: string, recordingEnabled = false) {
  try {
    if (!twilioClient) {
      throw new Error('Twilio client not initialized. Please configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    }

    const room = await twilioClient.video.v1.rooms.create({
      uniqueName,
      type: 'group', // 'group' allows up to 50 participants, 'peer-to-peer' for 2 participants
      recordParticipantsOnConnect: recordingEnabled,
      statusCallback: `${config.backendUrl}/api/v1/telehealth/webhook/room-status`,
      maxParticipants: 10, // Limit to prevent abuse
    });

    logger.info('Twilio video room created', {
      roomSid: room.sid,
      uniqueName,
      roomName: room.uniqueName,
    });

    return {
      roomSid: room.sid,
      roomName: room.uniqueName,
      status: room.status,
      dateCreated: room.dateCreated,
      maxParticipants: room.maxParticipants,
    };
  } catch (error: unknown) {
    logger.error('Failed to create Twilio room', {
      error: error.message,
      uniqueName,
    });
    throw new Error(`Failed to create video room: ${error.message}`);
  }
}

/**
 * Generate an access token for a participant to join a Twilio room
 */
export async function generateTwilioAccessToken(
  roomName: string,
  identity: string // User's unique identifier (name or ID)
) {
  try {
    if (!accountSid || !apiKeySid || !apiKeySecret) {
      throw new Error(
        'Twilio credentials incomplete. Need TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, and TWILIO_API_KEY_SECRET.'
      );
    }

    const AccessToken = twilio.jwt.AccessToken;
    const VideoGrant = AccessToken.VideoGrant;

    // Create an access token
    const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
      identity,
      ttl: 14400, // Token valid for 4 hours (14400 seconds)
    });

    // Grant access to Video
    const videoGrant = new VideoGrant({
      room: roomName,
    });

    token.addGrant(videoGrant);

    const jwt = token.toJwt();

    logger.info('Twilio access token generated', {
      roomName,
      identity,
    });

    return {
      token: jwt,
      identity,
      roomName,
    };
  } catch (error: unknown) {
    logger.error('Failed to generate Twilio access token', {
      error: error.message,
      roomName,
      identity,
    });
    throw new Error(`Failed to generate access token: ${error.message}`);
  }
}

/**
 * End a Twilio Video room (disconnect all participants)
 */
export async function endTwilioRoom(roomSid: string) {
  try {
    if (!twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    // Complete the room (this will disconnect all participants)
    const room = await twilioClient.video.v1.rooms(roomSid).update({
      status: 'completed',
    });

    logger.info('Twilio room ended', {
      roomSid,
      status: room.status,
    });

    return {
      roomSid: room.sid,
      status: room.status,
      duration: room.duration,
    };
  } catch (error: unknown) {
    logger.error('Failed to end Twilio room', {
      error: error.message,
      roomSid,
    });
    throw new Error(`Failed to end video room: ${error.message}`);
  }
}

/**
 * Get room information
 */
export async function getTwilioRoom(roomSid: string) {
  try {
    if (!twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    const room = await twilioClient.video.v1.rooms(roomSid).fetch();

    return {
      roomSid: room.sid,
      roomName: room.uniqueName,
      status: room.status,
      dateCreated: room.dateCreated,
      dateUpdated: room.dateUpdated,
      duration: room.duration,
      maxParticipants: room.maxParticipants,
    };
  } catch (error: unknown) {
    logger.error('Failed to get Twilio room', {
      error: error.message,
      roomSid,
    });
    throw new Error(`Failed to get room information: ${error.message}`);
  }
}

/**
 * Get list of participants in a room
 */
export async function getRoomParticipants(roomSid: string) {
  try {
    if (!twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    const participants = await twilioClient.video.v1.rooms(roomSid).participants.list();

    return participants.map((p) => ({
      participantSid: p.sid,
      identity: p.identity,
      status: p.status,
      dateCreated: p.dateCreated,
      duration: p.duration,
    }));
  } catch (error: unknown) {
    logger.error('Failed to get room participants', {
      error: error.message,
      roomSid,
    });
    throw new Error(`Failed to get participants: ${error.message}`);
  }
}

/**
 * Check if Twilio is properly configured
 */
export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && apiKeySid && apiKeySecret);
}

/**
 * Get configuration status (for debugging)
 */
export function getTwilioConfigStatus() {
  return {
    configured: isTwilioConfigured(),
    hasAccountSid: !!accountSid,
    hasAuthToken: !!authToken,
    hasApiKeySid: !!apiKeySid,
    hasApiKeySecret: !!apiKeySecret,
  };
}
