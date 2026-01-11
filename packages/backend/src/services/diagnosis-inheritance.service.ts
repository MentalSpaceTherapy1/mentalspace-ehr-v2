import prisma from '../lib/prisma';

/**
 * Service to handle diagnosis inheritance from Intake to Progress Notes and Treatment Plans
 */

export interface DiagnosisData {
  code: string;
  description: string;
  isPrimary: boolean;
  effectiveDate: Date;
}

export class DiagnosisInheritanceService {
  /**
   * Get active diagnoses for a client from the most recent signed Intake Assessment
   */
  static async getActiveDiagnoses(clientId: string): Promise<DiagnosisData[]> {
    // Find the most recent signed Intake Assessment
    const latestIntake = await prisma.clinicalNote.findFirst({
      where: {
        clientId,
        noteType: 'Intake Assessment',
        status: 'SIGNED', // Only consider signed notes
      },
      orderBy: {
        sessionDate: 'desc',
      },
      select: {
        diagnosisCodes: true,
        sessionDate: true,
      },
    });

    if (!latestIntake || !latestIntake.diagnosisCodes) {
      return [];
    }

    // diagnosisCodes is a JSON array of strings (ICD-10 codes)
    // Convert to DiagnosisData format
    const codes = Array.isArray(latestIntake.diagnosisCodes) ? latestIntake.diagnosisCodes : [];
    return codes.map((code: any, index: number) => ({
      code: typeof code === 'string' ? code : code.toString(),
      description: '', // Description not stored in clinical note, would need ICD-10 lookup
      isPrimary: index === 0, // First code is primary
      effectiveDate: latestIntake.sessionDate || new Date(),
    }));
  }

  /**
   * Check if a client has active diagnoses (required for Progress Notes and Treatment Plans)
   */
  static async hasActiveDiagnoses(clientId: string): Promise<boolean> {
    const diagnoses = await this.getActiveDiagnoses(clientId);
    return diagnoses.length > 0;
  }

  /**
   * Validate that required diagnoses exist before allowing note signing
   */
  static async validateDiagnosesForNoteType(
    clientId: string,
    noteType: string
  ): Promise<{ valid: boolean; message?: string }> {
    // Only Progress Notes and Treatment Plans require diagnoses from Intake
    const requiresDiagnosis = ['Progress Note', 'Treatment Plan'].includes(noteType);

    if (!requiresDiagnosis) {
      return { valid: true };
    }

    const hasDiagnoses = await this.hasActiveDiagnoses(clientId);

    if (!hasDiagnoses) {
      return {
        valid: false,
        message: `A diagnosis from the Intake Assessment is required to sign this ${noteType}. Please complete an Intake Assessment with diagnosis or add a diagnosis to the client's active diagnoses.`,
      };
    }

    return { valid: true };
  }

  /**
   * Auto-populate diagnoses for a new note based on inheritance rules
   */
  static async getInheritedDiagnosesForNote(
    clientId: string,
    noteType: string
  ): Promise<string[]> {
    // Only Progress Notes and Treatment Plans inherit diagnoses
    const inheritsDiagnosis = ['Progress Note', 'Treatment Plan'].includes(noteType);

    if (!inheritsDiagnosis) {
      return [];
    }

    const diagnoses = await this.getActiveDiagnoses(clientId);

    // Return ICD-10 codes sorted by primary first
    return diagnoses
      .sort((a, b) => (a.isPrimary === b.isPrimary ? 0 : a.isPrimary ? -1 : 1))
      .map((dx) => dx.code);
  }

  /**
   * Create or update client diagnoses when a note is signed
   * This keeps the client's active diagnosis list in sync
   */
  static async updateClientDiagnosesFromNote(
    clientId: string,
    noteId: string,
    diagnosisCodes: string[]
  ): Promise<void> {
    const note = await prisma.clinicalNote.findUnique({
      where: { id: noteId },
      select: { noteType: true, sessionDate: true, clinicianId: true },
    });

    if (!note) {
      throw new Error('Note not found');
    }

    // Only update client diagnoses from Intake or Treatment Plan
    if (!['Intake Assessment', 'Treatment Plan'].includes(note.noteType)) {
      return;
    }

    // For each diagnosis code, create/update in the client's diagnosis list
    for (let i = 0; i < diagnosisCodes.length; i++) {
      const code = diagnosisCodes[i];
      const isPrimary = i === 0; // First diagnosis is primary

      // Check if this diagnosis already exists for the client
      const existing = await prisma.diagnosis.findFirst({
        where: {
          clientId,
          icdCode: code,
        },
      });

      if (existing) {
        // Update diagnosis date and type
        await prisma.diagnosis.update({
          where: { id: existing.id },
          data: {
            diagnosisType: isPrimary ? 'Primary' : 'Secondary',
            diagnosisDate: note.sessionDate || new Date(),
            status: 'Active',
          },
        });
      } else {
        // Create new diagnosis
        await prisma.diagnosis.create({
          data: {
            clientId,
            icdCode: code,
            diagnosisDescription: '', // Would need ICD-10 lookup service
            diagnosisType: isPrimary ? 'Primary' : 'Secondary',
            diagnosedBy: note.clinicianId || '', // Need to pass this from context
            diagnosisDate: note.sessionDate || new Date(),
            status: 'Active',
          },
        });
      }
    }
  }
}
