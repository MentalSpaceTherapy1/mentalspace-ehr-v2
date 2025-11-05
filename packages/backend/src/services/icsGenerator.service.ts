import ical, { ICalCalendar, ICalEventData } from 'ical-generator';
import logger from '../utils/logger';

interface AppointmentData {
  id: string;
  appointmentDate: Date;
  startTime: string;
  duration?: number;
  appointmentType?: string;
  serviceLocation?: string;
  client: {
    firstName: string;
    lastName: string;
    email?: string;
  };
  clinician: {
    firstName: string;
    lastName: string;
    title?: string;
    email?: string;
  };
  officeLocation?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

/**
 * Service for generating .ics calendar files for appointments
 * Compatible with Google Calendar, Outlook, Apple Calendar, etc.
 */
export class IcsGeneratorService {
  /**
   * Generate ICS file content for an appointment
   */
  async generateIcsFile(appointment: AppointmentData): Promise<string> {
    try {
      // Create calendar
      const calendar = ical({
        name: 'MentalSpace Appointment',
        prodId: {
          company: 'MentalSpace EHR',
          product: 'Appointment Reminder',
        },
        timezone: 'America/New_York', // TODO: Make this configurable
      });

      // Parse appointment date and time
      const appointmentDateTime = new Date(appointment.appointmentDate);
      const [hours, minutes] = appointment.startTime.split(':').map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      // Calculate end time (default 50 minutes if not specified)
      const duration = appointment.duration || 50;
      const endDateTime = new Date(appointmentDateTime.getTime() + duration * 60 * 1000);

      // Determine location
      const location = this.formatLocation(appointment);

      // Build description
      const description = this.buildDescription(appointment);

      // Create event
      const event: ICalEventData = {
        start: appointmentDateTime,
        end: endDateTime,
        summary: `Appointment with ${this.formatClinicianName(appointment.clinician)}`,
        description,
        location,
        url: `${process.env.FRONTEND_URL || 'https://app.mentalspaceehr.com'}/appointments/${appointment.id}`,
        organizer: {
          name: this.formatClinicianName(appointment.clinician),
          email: appointment.clinician.email || 'noreply@mentalspaceehr.com',
        },
        attendees: [
          {
            name: `${appointment.client.firstName} ${appointment.client.lastName}`,
            email: appointment.client.email,
            rsvp: true,
            status: 'NEEDS-ACTION' as any,
            role: 'REQ-PARTICIPANT' as any,
          },
        ],
        status: 'CONFIRMED' as any,
        busyStatus: 'BUSY' as any,
        // Set reminder for 1 hour before
        alarms: [
          {
            type: 'display' as any,
            trigger: 3600, // 1 hour in seconds
            description: 'Appointment reminder',
          },
        ],
      };

      calendar.createEvent(event);

      logger.info('ICS file generated', {
        appointmentId: appointment.id,
        startTime: appointmentDateTime.toISOString(),
      });

      return calendar.toString();
    } catch (error) {
      logger.error('Failed to generate ICS file', {
        error: error instanceof Error ? error.message : 'Unknown error',
        appointmentId: appointment.id,
      });
      throw new Error('Failed to generate calendar file');
    }
  }

  /**
   * Format clinician name with title
   */
  private formatClinicianName(clinician: AppointmentData['clinician']): string {
    const title = clinician.title ? `${clinician.title} ` : '';
    return `${title}${clinician.firstName} ${clinician.lastName}`;
  }

  /**
   * Format location for calendar event
   */
  private formatLocation(appointment: AppointmentData): string {
    if (
      appointment.serviceLocation?.toLowerCase() === 'telehealth' ||
      appointment.serviceLocation?.toLowerCase() === 'video'
    ) {
      return 'Telehealth (Virtual)';
    }

    if (appointment.officeLocation) {
      const loc = appointment.officeLocation;
      const parts: string[] = [];

      if (loc.name) parts.push(loc.name);
      if (loc.address) parts.push(loc.address);

      const cityStateZip: string[] = [];
      if (loc.city) cityStateZip.push(loc.city);
      if (loc.state) cityStateZip.push(loc.state);
      if (loc.zipCode) cityStateZip.push(loc.zipCode);

      if (cityStateZip.length > 0) {
        parts.push(cityStateZip.join(', '));
      }

      return parts.join(', ');
    }

    return appointment.serviceLocation || 'Office';
  }

  /**
   * Build event description
   */
  private buildDescription(appointment: AppointmentData): string {
    const lines: string[] = [];

    lines.push('Appointment Details:');
    lines.push('');

    // Appointment type
    if (appointment.appointmentType) {
      lines.push(`Type: ${appointment.appointmentType}`);
    }

    // Provider
    lines.push(`Provider: ${this.formatClinicianName(appointment.clinician)}`);

    // Duration
    const duration = appointment.duration || 50;
    lines.push(`Duration: ${duration} minutes`);

    // Location details
    if (
      appointment.serviceLocation?.toLowerCase() === 'telehealth' ||
      appointment.serviceLocation?.toLowerCase() === 'video'
    ) {
      lines.push('');
      lines.push('This is a telehealth appointment.');
      lines.push(
        'Join link: ' +
          `${process.env.FRONTEND_URL || 'https://app.mentalspaceehr.com'}/appointments/${appointment.id}/join`
      );
    }

    // Footer
    lines.push('');
    lines.push('---');
    lines.push('If you need to reschedule or cancel, please contact our office.');
    lines.push('');
    lines.push('MentalSpace EHR');

    return lines.join('\n');
  }

  /**
   * Generate ICS for multiple appointments (for batch export)
   */
  async generateMultipleAppointmentsIcs(
    appointments: AppointmentData[]
  ): Promise<string> {
    try {
      const calendar = ical({
        name: 'MentalSpace Appointments',
        prodId: {
          company: 'MentalSpace EHR',
          product: 'Appointment Calendar',
        },
        timezone: 'America/New_York',
      });

      for (const appointment of appointments) {
        const appointmentDateTime = new Date(appointment.appointmentDate);
        const [hours, minutes] = appointment.startTime.split(':').map(Number);
        appointmentDateTime.setHours(hours, minutes, 0, 0);

        const duration = appointment.duration || 50;
        const endDateTime = new Date(
          appointmentDateTime.getTime() + duration * 60 * 1000
        );

        calendar.createEvent({
          start: appointmentDateTime,
          end: endDateTime,
          summary: `Appointment with ${this.formatClinicianName(appointment.clinician)}`,
          description: this.buildDescription(appointment),
          location: this.formatLocation(appointment),
          url: `${process.env.FRONTEND_URL || 'https://app.mentalspaceehr.com'}/appointments/${appointment.id}`,
          organizer: {
            name: this.formatClinicianName(appointment.clinician),
            email: appointment.clinician.email || 'noreply@mentalspaceehr.com',
          },
          attendees: [
            {
              name: `${appointment.client.firstName} ${appointment.client.lastName}`,
              email: appointment.client.email,
              rsvp: true,
              status: 'NEEDS-ACTION' as any,
              role: 'REQ-PARTICIPANT' as any,
            },
          ],
          status: 'CONFIRMED' as any,
          busyStatus: 'BUSY' as any,
        });
      }

      logger.info('Multi-appointment ICS file generated', {
        appointmentCount: appointments.length,
      });

      return calendar.toString();
    } catch (error) {
      logger.error('Failed to generate multi-appointment ICS file', { error });
      throw new Error('Failed to generate calendar file');
    }
  }

  /**
   * Generate ICS for a cancelled appointment (sends cancellation notice)
   */
  async generateCancellationIcs(appointment: AppointmentData): Promise<string> {
    try {
      const calendar = ical({
        name: 'MentalSpace Appointment Cancellation',
        prodId: {
          company: 'MentalSpace EHR',
          product: 'Appointment Cancellation',
        },
        method: 'CANCEL' as any,
        timezone: 'America/New_York',
      });

      const appointmentDateTime = new Date(appointment.appointmentDate);
      const [hours, minutes] = appointment.startTime.split(':').map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      const duration = appointment.duration || 50;
      const endDateTime = new Date(
        appointmentDateTime.getTime() + duration * 60 * 1000
      );

      calendar.createEvent({
        start: appointmentDateTime,
        end: endDateTime,
        summary: `CANCELLED: Appointment with ${this.formatClinicianName(appointment.clinician)}`,
        description: 'This appointment has been cancelled.',
        location: this.formatLocation(appointment),
        status: 'CANCELLED' as any,
        organizer: {
          name: this.formatClinicianName(appointment.clinician),
          email: appointment.clinician.email || 'noreply@mentalspaceehr.com',
        },
        attendees: [
          {
            name: `${appointment.client.firstName} ${appointment.client.lastName}`,
            email: appointment.client.email,
          },
        ],
      });

      logger.info('Cancellation ICS file generated', {
        appointmentId: appointment.id,
      });

      return calendar.toString();
    } catch (error) {
      logger.error('Failed to generate cancellation ICS file', { error });
      throw new Error('Failed to generate cancellation file');
    }
  }

  /**
   * Validate ICS content
   */
  validateIcs(icsContent: string): boolean {
    try {
      // Basic validation - check for required headers
      return (
        icsContent.includes('BEGIN:VCALENDAR') &&
        icsContent.includes('END:VCALENDAR') &&
        icsContent.includes('BEGIN:VEVENT') &&
        icsContent.includes('END:VEVENT')
      );
    } catch {
      return false;
    }
  }
}
