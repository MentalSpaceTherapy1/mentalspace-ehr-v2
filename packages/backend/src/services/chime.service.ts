import {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  DeleteMeetingCommand,
  GetMeetingCommand,
} from '@aws-sdk/client-chime-sdk-meetings';
import config from '../config';
import logger, { logControllerError } from '../utils/logger';

// Initialize Chime SDK client
// If credentials are provided in config, use them; otherwise use default AWS credential chain
const chimeClientConfig: any = {
  region: config.awsRegion || 'us-east-1',
};

// Only add explicit credentials if they are defined in environment
if (config.awsAccessKeyId && config.awsSecretAccessKey) {
  chimeClientConfig.credentials = {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
  };
}

const chimeClient = new ChimeSDKMeetingsClient(chimeClientConfig);

/**
 * Create a new Amazon Chime meeting for a telehealth session
 */
export async function createChimeMeeting(externalMeetingId: string) {
  try {
    // Use only the UUID part (36 chars) to stay under the 64 char limit
    const meetingToken = externalMeetingId.substring(0, 36);

    const command = new CreateMeetingCommand({
      ClientRequestToken: meetingToken,
      ExternalMeetingId: meetingToken,
      MediaRegion: config.awsRegion || 'us-east-1',
      MeetingFeatures: {
        Audio: {
          EchoReduction: 'AVAILABLE',
        },
      },
    });

    const response = await chimeClient.send(command);

    logger.info('Chime meeting created', {
      meetingId: response.Meeting?.MeetingId,
      externalMeetingId,
    });

    return response.Meeting;
  } catch (error: unknown) {
    logger.error('Chime meeting creation failed', {
      errorName: error.name,
      errorMessage: error.message,
      errorCode: error.code,
      httpStatus: error.$metadata?.httpStatusCode,
      externalMeetingId,
    });
    throw error;
  }
}

/**
 * Create an attendee for a Chime meeting
 */
export async function createChimeAttendee(
  meetingId: string,
  externalUserId: string,
  capabilities?: {
    audio: 'SendReceive' | 'Send' | 'Receive' | 'None';
    video: 'SendReceive' | 'Send' | 'Receive' | 'None';
    content: 'SendReceive' | 'Send' | 'Receive' | 'None';
  }
) {
  try {
    const command = new CreateAttendeeCommand({
      MeetingId: meetingId,
      ExternalUserId: externalUserId,
      Capabilities: {
        Audio: capabilities?.audio || 'SendReceive',
        Video: capabilities?.video || 'SendReceive',
        Content: capabilities?.content || 'SendReceive',
      },
    });

    const response = await chimeClient.send(command);

    logger.info('Chime attendee created', {
      meetingId,
      attendeeId: response.Attendee?.AttendeeId,
      externalUserId,
    });

    return response.Attendee;
  } catch (error) {
    logger.error('Failed to create Chime attendee', {
      error,
      meetingId,
      externalUserId,
    });
    throw new Error('Failed to join video meeting');
  }
}

/**
 * Delete a Chime meeting (end session)
 */
export async function deleteChimeMeeting(meetingId: string) {
  try {
    const command = new DeleteMeetingCommand({
      MeetingId: meetingId,
    });

    await chimeClient.send(command);

    logger.info('Chime meeting deleted', { meetingId });

    return true;
  } catch (error) {
    logger.error('Failed to delete Chime meeting', {
      error,
      meetingId,
    });
    throw new Error('Failed to end video meeting');
  }
}

/**
 * Get meeting information
 */
export async function getChimeMeeting(meetingId: string) {
  try {
    const command = new GetMeetingCommand({
      MeetingId: meetingId,
    });

    const response = await chimeClient.send(command);

    return response.Meeting;
  } catch (error) {
    logger.error('Failed to get Chime meeting', {
      error,
      meetingId,
    });
    throw new Error('Failed to get video meeting information');
  }
}
