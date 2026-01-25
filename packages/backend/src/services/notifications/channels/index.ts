/**
 * Notification Channels
 * Phase 3.1: Export all notification channel implementations
 */

export { EmailChannel, emailChannel } from './email.channel';
export { SmsChannel, smsChannel } from './sms.channel';

// Push channel placeholder for future implementation
export class PushChannel {
  readonly name = 'push' as const;

  async isAvailable(): Promise<boolean> {
    // Push notifications not yet implemented
    return false;
  }

  async send(): Promise<{
    channel: 'push';
    success: boolean;
    error: string;
    status: 'failed';
  }> {
    return {
      channel: 'push',
      success: false,
      error: 'Push notifications not yet implemented',
      status: 'failed',
    };
  }
}

export const pushChannel = new PushChannel();
