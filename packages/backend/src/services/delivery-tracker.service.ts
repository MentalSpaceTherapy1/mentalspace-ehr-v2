import { PrismaClient } from '@mentalspace/database';
import { sendReportEmail } from './email-distribution.service';

const prisma = new PrismaClient();

interface DeliveryData {
  scheduleId: string;
  reportId: string;
  recipients: any;
  format: string;
  status: string;
  errorMessage?: string;
  metadata?: any;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [60000, 300000, 900000]; // 1 min, 5 min, 15 min (exponential backoff)

export async function trackDelivery(data: DeliveryData) {
  return await prisma.deliveryLog.create({
    data: {
      scheduleId: data.scheduleId,
      reportId: data.reportId,
      recipients: data.recipients,
      format: data.format,
      status: data.status,
      attemptCount: 1,
      errorMessage: data.errorMessage,
      metadata: data.metadata
    }
  });
}

export async function updateDeliveryStatus(
  deliveryId: string,
  status: string,
  errorMessage?: string,
  sentAt?: Date
) {
  return await prisma.deliveryLog.update({
    where: { id: deliveryId },
    data: {
      status,
      errorMessage,
      sentAt,
      ...(status === 'FAILED' && {
        attemptCount: {
          increment: 1
        }
      })
    }
  });
}

export async function retryFailedDelivery(deliveryId: string) {
  const delivery = await prisma.deliveryLog.findUnique({
    where: { id: deliveryId },
    include: {
      schedule: {
        include: {
          user: true
        }
      }
    }
  });

  if (!delivery) {
    throw new Error(`Delivery ${deliveryId} not found`);
  }

  if (delivery.attemptCount >= MAX_RETRY_ATTEMPTS) {
    console.log(`[Delivery Tracker] Max retry attempts reached for delivery ${deliveryId}`);
    await updateDeliveryStatus(
      deliveryId,
      'PERMANENTLY_FAILED',
      `Max retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded`
    );
    return false;
  }

  console.log(`[Delivery Tracker] Retrying delivery ${deliveryId} (attempt ${delivery.attemptCount + 1})`);

  try {
    const recipients = delivery.recipients as any;

    await sendReportEmail({
      reportId: delivery.reportId,
      reportType: delivery.schedule.reportType,
      recipients: recipients.to || [],
      cc: recipients.cc || [],
      bcc: recipients.bcc || [],
      format: delivery.format as any,
      scheduleName: `Scheduled Report - ${delivery.schedule.reportType}`,
      user: delivery.schedule.user
    });

    await updateDeliveryStatus(deliveryId, 'SENT', undefined, new Date());
    console.log(`[Delivery Tracker] Retry successful for delivery ${deliveryId}`);
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await updateDeliveryStatus(deliveryId, 'FAILED', errorMsg);
    console.error(`[Delivery Tracker] Retry failed for delivery ${deliveryId}:`, error);

    // Schedule next retry if attempts remaining
    if (delivery.attemptCount + 1 < MAX_RETRY_ATTEMPTS) {
      const delay = RETRY_DELAYS[delivery.attemptCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      setTimeout(() => {
        retryFailedDelivery(deliveryId).catch(console.error);
      }, delay);
    }

    return false;
  }
}

export async function processFailedDeliveries() {
  const failedDeliveries = await prisma.deliveryLog.findMany({
    where: {
      status: 'FAILED',
      attemptCount: {
        lt: MAX_RETRY_ATTEMPTS
      }
    },
    include: {
      schedule: true
    }
  });

  console.log(`[Delivery Tracker] Found ${failedDeliveries.length} failed deliveries to retry`);

  for (const delivery of failedDeliveries) {
    try {
      await retryFailedDelivery(delivery.id);
    } catch (error) {
      console.error(`[Delivery Tracker] Error processing failed delivery ${delivery.id}:`, error);
    }
  }
}

export async function getDeliveryHistory(scheduleId: string, limit = 50) {
  return await prisma.deliveryLog.findMany({
    where: { scheduleId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

export async function getDeliveryStats(scheduleId: string) {
  const logs = await prisma.deliveryLog.findMany({
    where: { scheduleId }
  });

  const total = logs.length;
  const sent = logs.filter(log => log.status === 'SENT').length;
  const failed = logs.filter(log => log.status === 'FAILED' || log.status === 'PERMANENTLY_FAILED').length;
  const pending = logs.filter(log => log.status === 'PENDING').length;
  const skipped = logs.filter(log => log.status === 'SKIPPED').length;

  const successRate = total > 0 ? (sent / total) * 100 : 0;

  return {
    total,
    sent,
    failed,
    pending,
    skipped,
    successRate: Math.round(successRate * 100) / 100
  };
}

export async function handleBounce(deliveryId: string, bounceType: string, bounceMessage: string) {
  console.log(`[Delivery Tracker] Handling bounce for delivery ${deliveryId}: ${bounceType}`);

  const delivery = await prisma.deliveryLog.findUnique({
    where: { id: deliveryId }
  });

  if (!delivery) {
    return;
  }

  // Update delivery status
  await updateDeliveryStatus(
    deliveryId,
    'BOUNCED',
    `Bounce: ${bounceType} - ${bounceMessage}`
  );

  // If hard bounce, mark recipient as invalid in metadata
  if (bounceType === 'HARD') {
    const recipients = delivery.recipients as any;
    const metadata = delivery.metadata as any || {};

    await prisma.deliveryLog.update({
      where: { id: deliveryId },
      data: {
        metadata: {
          ...metadata,
          bounceType: 'HARD',
          invalidRecipients: recipients.to || []
        }
      }
    });

    // TODO: Could also update a recipient blacklist or notification preferences
  }
}

export async function cleanupOldDeliveryLogs(daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await prisma.deliveryLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate
      }
    }
  });

  console.log(`[Delivery Tracker] Cleaned up ${result.count} old delivery logs`);
  return result.count;
}

export async function getRecentDeliveries(limit = 100) {
  return await prisma.deliveryLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      schedule: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }
    }
  });
}

export async function getDeliveryById(deliveryId: string) {
  return await prisma.deliveryLog.findUnique({
    where: { id: deliveryId },
    include: {
      schedule: {
        include: {
          report: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }
    }
  });
}

export async function markDeliveryAsRead(deliveryId: string) {
  const delivery = await prisma.deliveryLog.findUnique({
    where: { id: deliveryId }
  });

  if (!delivery) {
    return null;
  }

  const metadata = delivery.metadata as any || {};

  return await prisma.deliveryLog.update({
    where: { id: deliveryId },
    data: {
      metadata: {
        ...metadata,
        readAt: new Date().toISOString()
      }
    }
  });
}

export async function getDeliveryStatusSummary() {
  const allDeliveries = await prisma.deliveryLog.findMany();

  const summary = {
    total: allDeliveries.length,
    byStatus: {
      PENDING: 0,
      SENT: 0,
      FAILED: 0,
      PERMANENTLY_FAILED: 0,
      BOUNCED: 0,
      SKIPPED: 0
    },
    last24Hours: {
      total: 0,
      sent: 0,
      failed: 0
    }
  };

  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 24);

  allDeliveries.forEach(delivery => {
    // Count by status
    if (summary.byStatus.hasOwnProperty(delivery.status)) {
      summary.byStatus[delivery.status as keyof typeof summary.byStatus]++;
    }

    // Count last 24 hours
    if (delivery.createdAt > yesterday) {
      summary.last24Hours.total++;
      if (delivery.status === 'SENT') {
        summary.last24Hours.sent++;
      } else if (delivery.status === 'FAILED' || delivery.status === 'PERMANENTLY_FAILED') {
        summary.last24Hours.failed++;
      }
    }
  });

  return summary;
}

// Auto-retry processor - should be called periodically
export function startDeliveryRetryProcessor() {
  // Check for failed deliveries every 5 minutes
  setInterval(async () => {
    try {
      await processFailedDeliveries();
    } catch (error) {
      console.error('[Delivery Tracker] Error in retry processor:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes

  console.log('[Delivery Tracker] Retry processor started');
}
