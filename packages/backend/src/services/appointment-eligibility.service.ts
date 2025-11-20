import prisma from '../lib/prisma';

/**
 * Service to determine which appointments are eligible for creating clinical notes
 */

export interface EligibleAppointment {
  id: string;
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  duration: number;
  serviceCode: string;
  location: string;
  status: string;
  appointmentType: string;
  hasNote: boolean;
}

// Mapping of note types to eligible appointment types/service codes
const NOTE_TYPE_MAPPINGS = {
  'Intake Assessment': {
    appointmentTypes: ['Intake', 'Initial Evaluation', 'INTAKE', 'Therapy', 'Individual Therapy'], // Allow various intake-related appointment types
    serviceCodes: [], // Any service code - intake can use various codes
    allowMultipleNotes: false,
  },
  'Progress Note': {
    appointmentTypes: ['Therapy', 'Follow-up', 'Individual Therapy'],
    serviceCodes: ['90832', '90834', '90837', '90846', '90847'], // Therapy codes
    allowMultipleNotes: false,
  },
  'Treatment Plan': {
    appointmentTypes: ['Treatment Planning', 'Therapy', 'Follow-up'],
    serviceCodes: ['90791', '90832', '90834', '90837'], // Can be any therapy session
    allowMultipleNotes: false,
  },
  'Contact Note': {
    appointmentTypes: [], // Any appointment type - contact notes can document any client interaction
    serviceCodes: [], // Any service code
    allowMultipleNotes: true, // Can document multiple contacts
  },
  'Consultation Note': {
    appointmentTypes: [], // Any appointment type - consultations can occur in various appointment contexts
    serviceCodes: [], // Any service code
    allowMultipleNotes: true, // Can document multiple consultations
  },
  'Termination Note': {
    appointmentTypes: [], // Any appointment type - termination can be documented for any session
    serviceCodes: [],
    allowMultipleNotes: false,
  },
  'Cancellation Note': {
    appointmentTypes: [], // Any appointment type - can document cancellation of any appointment
    serviceCodes: [],
    allowMultipleNotes: true, // Can document multiple cancellations
  },
  'Miscellaneous Note': {
    appointmentTypes: [], // Any appointment type
    serviceCodes: [],
    allowMultipleNotes: true,
  },
};

export class AppointmentEligibilityService {
  /**
   * Get eligible appointments for a specific note type and client
   */
  static async getEligibleAppointments(
    clientId: string,
    noteType: string
  ): Promise<EligibleAppointment[]> {
    const mapping = NOTE_TYPE_MAPPINGS[noteType as keyof typeof NOTE_TYPE_MAPPINGS];

    if (!mapping) {
      throw new Error(`Unknown note type: ${noteType}`);
    }

    const now = new Date();

    // Build the where clause based on eligibility criteria
    const where: any = {
      clientId,
      status: {
        in: ['SCHEDULED', 'COMPLETED', 'CONFIRMED', 'CHECKED_IN', 'IN_SESSION'],
      },
      // Only past and current appointments (not future)
      appointmentDate: {
        lte: now,
      },
      // Exclude cancelled/deleted/no-show
      NOT: {
        status: {
          in: ['CANCELLED', 'NO_SHOW'],
        },
      },
    };

    // Add appointment type filter if specified
    if (mapping.appointmentTypes.length > 0) {
      where.appointmentType = {
        in: mapping.appointmentTypes,
      };
    }

    // Add CPT code filter if specified
    if (mapping.serviceCodes.length > 0) {
      where.cptCode = {
        in: mapping.serviceCodes,
      };
    }

    // Fetch appointments with their notes
    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        clinicalNotes: {
          where: {
            noteType,
          },
          select: {
            id: true,
            noteType: true,
          },
        },
      },
      orderBy: {
        appointmentDate: 'desc',
      },
    });

    // Filter based on whether notes already exist
    const eligible = appointments
      .filter((apt) => {
        // If multiple notes allowed, always include
        if (mapping.allowMultipleNotes) {
          return true;
        }
        // Otherwise, only include if no note of this type exists
        return apt.clinicalNotes.length === 0;
      })
      .map((apt) => ({
        id: apt.id,
        appointmentDate: apt.appointmentDate,
        startTime: apt.startTime,
        endTime: apt.endTime,
        duration: apt.duration || 0,
        serviceCode: apt.cptCode || '',
        location: apt.serviceLocation || '',
        status: apt.status,
        appointmentType: apt.appointmentType || '',
        hasNote: apt.clinicalNotes.length > 0,
      }));

    return eligible;
  }

  /**
   * Check if an appointment is eligible for a specific note type
   */
  static async isAppointmentEligible(
    appointmentId: string,
    noteType: string
  ): Promise<boolean> {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        clinicalNotes: {
          where: { noteType },
        },
      },
    });

    if (!appointment) {
      return false;
    }

    const mapping = NOTE_TYPE_MAPPINGS[noteType as keyof typeof NOTE_TYPE_MAPPINGS];
    if (!mapping) {
      return false;
    }

    // Check status
    if (!['SCHEDULED', 'COMPLETED', 'CONFIRMED', 'CHECKED_IN', 'IN_SESSION'].includes(appointment.status)) {
      return false;
    }

    // Check if appointment is in the past or present
    const now = new Date();
    if (appointment.appointmentDate > now) {
      return false;
    }

    // Check appointment type if specified
    if (
      mapping.appointmentTypes.length > 0 &&
      !mapping.appointmentTypes.includes(appointment.appointmentType || '')
    ) {
      return false;
    }

    // Check CPT code if specified
    if (
      mapping.serviceCodes.length > 0 &&
      !mapping.serviceCodes.includes(appointment.cptCode || '')
    ) {
      return false;
    }

    // Check if note already exists (unless multiple allowed)
    if (!mapping.allowMultipleNotes && appointment.clinicalNotes.length > 0) {
      return false;
    }

    return true;
  }

  /**
   * Get the default appointment type and service code for a note type
   */
  static getDefaultAppointmentConfig(noteType: string): {
    appointmentType: string;
    serviceCode: string;
    duration: number;
  } {
    const defaults: Record<string, { appointmentType: string; serviceCode: string; duration: number }> = {
      'Intake Assessment': {
        appointmentType: 'Intake',
        serviceCode: '90791',
        duration: 60,
      },
      'Progress Note': {
        appointmentType: 'Individual Therapy',
        serviceCode: '90834',
        duration: 45,
      },
      'Treatment Plan': {
        appointmentType: 'Treatment Planning',
        serviceCode: '90832',
        duration: 30,
      },
      'Contact Note': {
        appointmentType: 'Phone Contact',
        serviceCode: '99441',
        duration: 15,
      },
      'Consultation Note': {
        appointmentType: 'Consultation',
        serviceCode: '99241',
        duration: 30,
      },
      'Termination Note': {
        appointmentType: 'Termination',
        serviceCode: '',
        duration: 30,
      },
      'Cancellation Note': {
        appointmentType: 'Cancelled',
        serviceCode: '',
        duration: 0,
      },
      'Miscellaneous Note': {
        appointmentType: 'Administrative',
        serviceCode: '',
        duration: 15,
      },
    };

    return defaults[noteType] || {
      appointmentType: 'Therapy',
      serviceCode: '',
      duration: 45,
    };
  }
}
