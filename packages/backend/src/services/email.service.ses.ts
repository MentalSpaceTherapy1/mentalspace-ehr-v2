import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import logger from '../utils/logger';

// Initialize SES client
const sesClient = new SESClient({
  region: process.env.AWS_SES_REGION || 'us-east-1',
});

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

/**
 * Send email using AWS SES
 */
export async function sendEmailViaSES(options: EmailOptions): Promise<boolean> {
  try {
    // In development, log emails instead of sending
    if (process.env.NODE_ENV === 'development' && process.env.FORCE_SES !== 'true') {
      logger.info('📧 [EMAIL] (Development Mode - Would send via SES)');
      logger.info('From:', options.from || process.env.FROM_EMAIL);
      logger.info('To:', options.to);
      logger.info('Subject:', options.subject);
      logger.info('---');
      logger.info(options.html.replace(/<[^>]*>/g, '')); // Strip HTML tags
      logger.info('---');
      return true;
    }

    // Prepare email addresses
    const toAddresses = Array.isArray(options.to) ? options.to : [options.to];
    const ccAddresses = options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined;
    const bccAddresses = options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined;

    // Prepare source address
    const fromEmail = process.env.FROM_EMAIL || 'noreply@mentalspaceehr.com';
    const fromName = process.env.FROM_NAME || 'MentalSpace EHR';
    const source = options.from || `${fromName} <${fromEmail}>`;

    // Create SES command
    const command = new SendEmailCommand({
      Source: source,
      Destination: {
        ToAddresses: toAddresses,
        CcAddresses: ccAddresses,
        BccAddresses: bccAddresses,
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: options.html,
            Charset: 'UTF-8',
          },
          Text: {
            Data: options.text || stripHtml(options.html),
            Charset: 'UTF-8',
          },
        },
      },
      ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
      ConfigurationSetName: process.env.SES_CONFIGURATION_SET,
    });

    // Send email
    const response = await sesClient.send(command);

    logger.info('✅ Email sent via SES', {
      messageId: response.MessageId,
      to: toAddresses,
      subject: options.subject,
    });

    return true;
  } catch (error) {
    logger.error('❌ Error sending email via SES', {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      to: options.to,
      subject: options.subject,
    });

    // In development, don't fail on email errors
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️  Email failed but continuing (development mode)');
      return false;
    }

    throw error;
  }
}

/**
 * Strip HTML tags from string
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Send email to multiple recipients (bulk)
 */
export async function sendBulkEmailViaSES(recipients: string[], subject: string, html: string): Promise<number> {
  let successCount = 0;

  for (const recipient of recipients) {
    try {
      const success = await sendEmailViaSES({ to: recipient, subject, html });
      if (success) successCount++;
    } catch (error) {
      logger.error('Bulk email failed for recipient', { recipient, error });
    }
  }

  logger.info(`📧 Bulk email complete: ${successCount}/${recipients.length} sent successfully`);
  return successCount;
}

/**
 * Verify SES configuration
 */
export async function verifySESConfig(): Promise<boolean> {
  try {
    // Try to get account sending statistics
    const { GetAccountSendingEnabledCommand } = await import('@aws-sdk/client-ses');
    const command = new GetAccountSendingEnabledCommand({});
    await sesClient.send(command);

    logger.info('✅ SES configuration verified');
    return true;
  } catch (error) {
    logger.error('❌ SES configuration verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Check if domain is verified
 */
export async function checkDomainVerification(domain: string): Promise<boolean> {
  try {
    const { GetIdentityVerificationAttributesCommand } = await import('@aws-sdk/client-ses');
    const command = new GetIdentityVerificationAttributesCommand({
      Identities: [domain],
    });

    const response = await sesClient.send(command);
    const status = response.VerificationAttributes?.[domain]?.VerificationStatus;

    logger.info('Domain verification status', { domain, status });
    return status === 'Success';
  } catch (error) {
    logger.error('Error checking domain verification', { domain, error });
    return false;
  }
}

/**
 * Get SES sending statistics
 */
export async function getSendingStats(): Promise<any> {
  try {
    const { GetSendStatisticsCommand } = await import('@aws-sdk/client-ses');
    const command = new GetSendStatisticsCommand({});
    const response = await sesClient.send(command);

    return response.SendDataPoints;
  } catch (error) {
    logger.error('Error getting sending statistics', { error });
    return null;
  }
}
