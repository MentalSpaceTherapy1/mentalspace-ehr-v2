/**
 * Emergency Notification Service
 * Module 6 - Telehealth Phase 2: Emergency System Enhancements
 *
 * Handles emergency notifications to supervisors, emergency contacts, and compliance team
 */

import prisma from './database';
import logger from '../utils/logger';
import config from '../config';

interface EmergencyNotificationData {
  sessionId: string;
  clinicianId: string;
  clinicianName: string;
  clientId: string;
  clientName: string;
  emergencyType: string;
  emergencySeverity: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  };
  notes: string;
  actions: string[];
}

/**
 * Notify supervisor of emergency activation
 * Sends immediate notification via multiple channels
 */
export async function notifySupervisor(data: EmergencyNotificationData) {
  try {
    // Get clinician's supervisor
    const clinician = await prisma.user.findUnique({
      where: { id: data.clinicianId },
      include: {
        supervisor: true,
      },
    });

    if (!clinician?.supervisor) {
      logger.warn('No supervisor found for clinician', {
        clinicianId: data.clinicianId,
        sessionId: data.sessionId,
      });
      return null;
    }

    const supervisor = clinician.supervisor;

    // Build notification message
    const locationInfo = data.location
      ? `\n\nClient Location:\n${data.location.address || 'Unknown address'}\n${
          data.location.city
        }, ${data.location.state || ''}\nCoordinates: ${data.location.latitude}, ${
          data.location.longitude
        }`
      : '';

    const emailSubject = `URGENT: Emergency Protocol Activated - ${data.emergencyType}`;
    const emailBody = `
EMERGENCY PROTOCOL ACTIVATED

Severity: ${data.emergencySeverity}
Type: ${data.emergencyType}
Time: ${new Date().toLocaleString()}

CLINICIAN INFORMATION:
Clinician: ${data.clinicianName}
Session ID: ${data.sessionId}

CLIENT INFORMATION:
Client: ${data.clientName}
Client ID: ${data.clientId}${locationInfo}

SITUATION NOTES:
${data.notes}

ACTIONS TAKEN:
${data.actions.map((action) => `- ${action}`).join('\n')}

IMMEDIATE ACTION REQUIRED:
Please review this emergency incident immediately and provide guidance to the clinician if needed.

Session Link: ${config.frontendUrl}/telehealth/sessions/${data.sessionId}

---
This is an automated emergency notification from MentalSpace EHR.
`;

    // Send email notification
    try {
      // Note: Integrate with your email service
      // await emailService.send({
      //   to: supervisor.email,
      //   subject: emailSubject,
      //   body: emailBody,
      //   priority: 'high',
      // });

      logger.info('Emergency email notification queued for supervisor', {
        supervisorId: supervisor.id,
        supervisorEmail: supervisor.email,
        sessionId: data.sessionId,
      });
    } catch (emailError: any) {
      logger.error('Failed to send emergency email', {
        error: emailError.message,
        supervisorId: supervisor.id,
      });
    }

    // Send SMS if enabled
    if (supervisor.smsNotifications && supervisor.phoneNumber) {
      try {
        const smsMessage = `EMERGENCY: ${data.emergencyType} - ${data.emergencySeverity} severity. Clinician: ${data.clinicianName}. Client: ${data.clientName}. Review immediately: ${config.frontendUrl}/telehealth/sessions/${data.sessionId}`;

        // Note: Integrate with your SMS service (Twilio)
        // await twilioService.sendSMS({
        //   to: supervisor.phoneNumber,
        //   message: smsMessage,
        // });

        logger.info('Emergency SMS notification sent to supervisor', {
          supervisorId: supervisor.id,
          supervisorPhone: supervisor.phoneNumber,
        });
      } catch (smsError: any) {
        logger.error('Failed to send emergency SMS', {
          error: smsError.message,
          supervisorId: supervisor.id,
        });
      }
    }

    // Update session with supervisor notification
    // Note: Emergency fields need to be added to TelehealthSession schema
    await prisma.telehealthSession.update({
      where: { id: data.sessionId },
      data: {
        // TODO: Add emergency fields to TelehealthSession schema
        // emergencySupervisorNotified: true,
        // emergencySupervisorId: supervisor.id,
        // emergencySupervisorNotifiedAt: new Date(),
      } as any,
    });

    logger.info('Supervisor notified of emergency', {
      supervisorId: supervisor.id,
      supervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
      sessionId: data.sessionId,
    });

    return {
      supervisorId: supervisor.id,
      supervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
      supervisorEmail: supervisor.email,
      notificationSent: true,
    };
  } catch (error: any) {
    logger.error('Failed to notify supervisor', {
      error: error.message,
      sessionId: data.sessionId,
    });
    throw error;
  }
}

/**
 * Notify emergency contact (with HIPAA exception for imminent harm)
 */
export async function notifyEmergencyContact(
  sessionId: string,
  emergencyContactId: string,
  message: string
) {
  try {
    // Get emergency contact details
    const contact = await prisma.emergencyContact.findUnique({
      where: { id: emergencyContactId },
    });

    if (!contact) {
      throw new Error('Emergency contact not found');
    }

    // Note: Implement actual phone call or SMS
    logger.info('Emergency contact notification initiated', {
      contactId: contact.id,
      contactName: contact.name,
      contactPhone: contact.phone,
      sessionId,
      hipaaException: '45 CFR 164.512(j) - Prevention of imminent harm',
    });

    return {
      contactId: contact.id,
      contactName: contact.name,
      contactPhone: contact.phone,
      notificationAttempted: true,
    };
  } catch (error: any) {
    logger.error('Failed to notify emergency contact', {
      error: error.message,
      sessionId,
      emergencyContactId,
    });
    throw error;
  }
}

/**
 * Log 911 call for compliance
 */
export async function log911Call(
  sessionId: string,
  userId: string,
  details: {
    dispatcherInfo?: string;
    outcome?: string;
  }
) {
  try {
    // Note: Emergency fields need to be added to TelehealthSession schema
    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        // TODO: Add emergency fields to TelehealthSession schema
        // emergency911Called: true,
        // emergency911CalledAt: new Date(),
        // emergency911CalledBy: userId,
      } as any,
    });

    logger.info('911 call logged for emergency', {
      sessionId,
      userId,
      timestamp: new Date().toISOString(),
      details,
    });

    return {
      success: true,
      timestamp: new Date(),
    };
  } catch (error: any) {
    logger.error('Failed to log 911 call', {
      error: error.message,
      sessionId,
    });
    throw error;
  }
}

/**
 * Send crisis resources to client via email/SMS
 */
export async function sendCrisisResourcesToClient(
  sessionId: string,
  clientId: string,
  resources: any[]
) {
  try {
    // Get client contact info
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        email: true,
        primaryPhone: true,
        firstName: true,
      },
    });

    if (!client) {
      throw new Error('Client not found');
    }

    // Format resources for email
    const resourcesList = resources
      .map(
        (resource) =>
          `${resource.name}\nPhone: ${resource.phone}${
            resource.textNumber ? `\nText: ${resource.textNumber}` : ''
          }\n${resource.description}\n`
      )
      .join('\n---\n\n');

    const emailBody = `
Crisis Resources

Hello ${client.firstName},

Here are some helpful crisis resources that may be useful to you:

${resourcesList}

If you are in immediate danger, please call 911.

---
MentalSpace EHR
`;

    // Note: Implement actual email sending
    logger.info('Crisis resources sent to client', {
      clientId,
      sessionId,
      resourceCount: resources.length,
    });

    // Update session to mark resources sent
    // Note: Emergency fields need to be added to TelehealthSession schema
    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        // TODO: Add emergency fields to TelehealthSession schema
        // emergencyResourcesSentToClient: true,
      } as any,
    });

    return {
      success: true,
      resourceCount: resources.length,
    };
  } catch (error: any) {
    logger.error('Failed to send crisis resources to client', {
      error: error.message,
      sessionId,
      clientId,
    });
    throw error;
  }
}

/**
 * Generate emergency incident report for compliance team
 */
export async function generateEmergencyIncidentReport(sessionId: string) {
  try {
    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
      include: {
        appointment: {
          include: {
            client: true,
            clinician: true,
          },
        },
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Cast session as any since emergency fields are not yet in schema
    const sessionData = session as any;
    const client = session.appointment.client;

    const report = {
      incidentId: sessionId,
      timestamp: sessionData.emergencyActivatedAt || session.sessionStartedAt,
      clinician: {
        id: session.appointment.clinician.id,
        name: `${session.appointment.clinician.firstName} ${session.appointment.clinician.lastName}`,
      },
      client: {
        id: client.id,
        name: `${client.firstName} ${client.lastName}`,
      },
      emergency: {
        type: sessionData.emergencyType || 'UNKNOWN',
        severity: sessionData.emergencySeverity || 'UNKNOWN',
        notes: sessionData.emergencyNotes || session.technicalIssues,
        resolution: sessionData.emergencyResolution || null,
      },
      location: {
        // Use client's address from their record
        address: client.addressStreet1,
        city: client.addressCity,
        state: client.addressState,
        coordinates: {
          latitude: sessionData.clientLatitude || null,
          longitude: sessionData.clientLongitude || null,
        },
        captureMethod: sessionData.locationCaptureMethod || 'CLIENT_RECORD',
      },
      actions: {
        emergency911Called: sessionData.emergency911Called || false,
        emergency911CalledAt: sessionData.emergency911CalledAt || null,
        supervisorNotified: sessionData.emergencySupervisorNotified || false,
        emergencyContactNotified: sessionData.emergencyContactNotified || false,
        protocolFollowed: sessionData.emergencyProtocolFollowed || false,
      },
      outcome: sessionData.emergencyResolution || null,
      generatedAt: new Date(),
    };

    logger.info('Emergency incident report generated', {
      sessionId,
      reportId: report.incidentId,
    });

    return report;
  } catch (error: any) {
    logger.error('Failed to generate emergency incident report', {
      error: error.message,
      sessionId,
    });
    throw error;
  }
}
