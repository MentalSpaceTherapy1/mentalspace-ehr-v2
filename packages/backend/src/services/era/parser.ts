/**
 * ERA (835 EDI) File Parser
 * Parses Electronic Remittance Advice files in ANSI X12 835 format
 */

import logger from '../../utils/logger';

export interface ERAPayment {
  paymentAmount: number;
  paymentMethod: string;
  paymentDate: string;
  checkNumber?: string;
  traceNumber?: string;
}

export interface ERAPayer {
  name: string;
  identifier: string;
}

export interface ERAServiceLine {
  cptCode: string;
  chargeAmount: number;
  paymentAmount: number;
  units: number;
  adjustments: ERAdjustment[];
}

export interface ERAdjustment {
  groupCode: string; // CO, PR, OA, PI
  reasonCode: string; // CARC code
  amount: number;
  quantity?: number;
}

export interface ERAClaim {
  claimControlNumber: string;
  patientControlNumber?: string;
  claimStatus: string; // 1=Paid, 2=Partial, 3=Denied, 4=Pending
  totalChargeAmount: number;
  paymentAmount: number;
  patientResponsibility: number;
  patientFirstName?: string;
  patientLastName?: string;
  patientIdentifier?: string;
  serviceDate?: string;
  serviceLines: ERAServiceLine[];
  remarks?: string[];
}

export interface ParsedERA {
  interchangeControlNumber: string;
  paymentInfo: ERAPayment;
  payer: ERAPayer;
  payee: {
    name?: string;
    npi?: string;
    taxId?: string;
  };
  claims: ERAClaim[];
  rawContent: string;
}

export class ERAParser {
  /**
   * Parse an 835 EDI file
   */
  static parse(fileContent: string): ParsedERA {
    const segments = this.splitIntoSegments(fileContent);

    const result: ParsedERA = {
      interchangeControlNumber: '',
      paymentInfo: {
        paymentAmount: 0,
        paymentMethod: '',
        paymentDate: '',
      },
      payer: {
        name: '',
        identifier: '',
      },
      payee: {},
      claims: [],
      rawContent: fileContent,
    };

    let currentClaim: ERAClaim | null = null;
    let currentServiceLine: ERAServiceLine | null = null;

    for (const segment of segments) {
      const elements = segment.split('*');
      const segmentId = elements[0];

      try {
        switch (segmentId) {
          case 'ISA':
            result.interchangeControlNumber = elements[13] || '';
            break;

          case 'BPR':
            // Payment info
            result.paymentInfo = {
              paymentAmount: parseFloat(elements[2] || '0'),
              paymentMethod: this.getPaymentMethod(elements[4]),
              paymentDate: this.parseDate(elements[16]),
              checkNumber: elements[7],
            };
            break;

          case 'TRN':
            // Trace number
            result.paymentInfo.traceNumber = elements[2];
            break;

          case 'N1':
            // Name identification
            const entityCode = elements[1];
            if (entityCode === 'PR') {
              // Payer
              result.payer.name = elements[2] || '';
              result.payer.identifier = elements[4] || '';
            } else if (entityCode === 'PE') {
              // Payee
              result.payee.name = elements[2] || '';
              result.payee.npi = elements[4] || '';
            }
            break;

          case 'CLP':
            // Claim payment info
            if (currentClaim) {
              result.claims.push(currentClaim);
            }

            currentClaim = {
              claimControlNumber: elements[1] || '',
              claimStatus: this.getClaimStatus(elements[2]),
              totalChargeAmount: parseFloat(elements[3] || '0'),
              paymentAmount: parseFloat(elements[4] || '0'),
              patientResponsibility: parseFloat(elements[5] || '0'),
              patientControlNumber: elements[7],
              serviceLines: [],
            };
            break;

          case 'NM1':
            // Patient name
            if (currentClaim && elements[1] === 'QC') {
              currentClaim.patientLastName = elements[3];
              currentClaim.patientFirstName = elements[4];
              currentClaim.patientIdentifier = elements[9];
            }
            break;

          case 'DTM':
            // Date/time reference
            if (currentClaim && elements[1] === '232') {
              // Service date
              currentClaim.serviceDate = this.parseDate(elements[2]);
            }
            break;

          case 'SVC':
            // Service line
            if (currentClaim) {
              if (currentServiceLine) {
                currentClaim.serviceLines.push(currentServiceLine);
              }

              // Parse CPT code from composite (e.g., "HC:90834")
              const procedureCode = elements[1] || '';
              const cptCode = procedureCode.split(':')[1] || procedureCode;

              currentServiceLine = {
                cptCode,
                chargeAmount: parseFloat(elements[2] || '0'),
                paymentAmount: parseFloat(elements[3] || '0'),
                units: parseFloat(elements[7] || '1'),
                adjustments: [],
              };
            }
            break;

          case 'CAS':
            // Claim/service adjustments
            if (currentServiceLine) {
              const groupCode = elements[1] || '';
              // Can have multiple adjustments in one CAS segment
              for (let i = 2; i < elements.length; i += 3) {
                if (elements[i]) {
                  currentServiceLine.adjustments.push({
                    groupCode,
                    reasonCode: elements[i],
                    amount: parseFloat(elements[i + 1] || '0'),
                    quantity: elements[i + 2] ? parseFloat(elements[i + 2]) : undefined,
                  });
                }
              }
            }
            break;

          case 'SE':
            // Transaction set trailer - end of claims
            if (currentServiceLine && currentClaim) {
              currentClaim.serviceLines.push(currentServiceLine);
              currentServiceLine = null;
            }
            if (currentClaim) {
              result.claims.push(currentClaim);
              currentClaim = null;
            }
            break;
        }
      } catch (error: unknown) {
        logger.error('Error parsing ERA segment', {
          segment: segmentId,
          error: error.message,
        });
      }
    }

    // Add last claim if exists
    if (currentServiceLine && currentClaim) {
      currentClaim.serviceLines.push(currentServiceLine);
    }
    if (currentClaim) {
      result.claims.push(currentClaim);
    }

    return result;
  }

  /**
   * Split file content into segments
   */
  private static splitIntoSegments(content: string): string[] {
    // Remove any BOM or extra whitespace
    content = content.trim().replace(/^\uFEFF/, '');

    // Split by segment terminator (usually ~)
    const segments = content.split('~').map(s => s.trim()).filter(s => s.length > 0);

    return segments;
  }

  /**
   * Parse date from CCYYMMDD format
   */
  private static parseDate(dateStr?: string): string {
    if (!dateStr || dateStr.length !== 8) {
      return new Date().toISOString().split('T')[0];
    }

    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);

    return `${year}-${month}-${day}`;
  }

  /**
   * Get payment method description
   */
  private static getPaymentMethod(code?: string): string {
    const methods: Record<string, string> = {
      'ACH': 'ACH/EFT',
      'CHK': 'Check',
      'FWT': 'Wire Transfer',
      'BOP': 'Financial Institution',
    };

    return methods[code || ''] || code || 'Unknown';
  }

  /**
   * Get claim status description
   */
  private static getClaimStatus(code?: string): string {
    const statuses: Record<string, string> = {
      '1': 'Paid',
      '2': 'Partial Payment',
      '3': 'Denied',
      '4': 'Pending',
      '19': 'Reversed',
      '20': 'Hold',
      '21': 'Adjusted',
      '22': 'Forwarded',
    };

    return statuses[code || ''] || 'Unknown';
  }

  /**
   * Get adjustment reason description
   */
  static getAdjustmentReasonDescription(code: string): string {
    // Common CARC codes
    const reasons: Record<string, string> = {
      '1': 'Deductible amount',
      '2': 'Coinsurance amount',
      '3': 'Copayment amount',
      '4': 'Procedure code inconsistent with modifier',
      '5': 'Procedure code/procedure not covered',
      '45': 'Charge exceeds fee schedule/maximum allowable',
      '50': 'Non-covered service',
      '96': 'Non-covered charge',
      '97': 'Benefit maximum exceeded',
      '204': 'Service partially paid',
      // Add more as needed
    };

    return reasons[code] || `Reason code ${code}`;
  }

  /**
   * Validate ERA file format
   */
  static validateFormat(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('File is empty');
      return { valid: false, errors };
    }

    // Check for required segments
    if (!content.includes('ISA*')) {
      errors.push('Missing ISA (Interchange header) segment');
    }

    if (!content.includes('GS*HP')) {
      errors.push('Missing GS (Functional group) segment');
    }

    if (!content.includes('ST*835')) {
      errors.push('Missing ST (Transaction set) segment - not an 835 file');
    }

    if (!content.includes('BPR*')) {
      errors.push('Missing BPR (Payment info) segment');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
