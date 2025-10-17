import prisma from './database';
import logger from '../utils/logger';

interface CreateConsentData {
  clientId: string;
  consentType: 'Georgia_Telehealth' | 'HIPAA_Telehealth' | 'Recording';
  createdBy: string;
}

interface UpdateConsentData {
  consentGiven: boolean;
  patientRightsAcknowledged?: boolean;
  emergencyProtocolsUnderstood?: boolean;
  privacyRisksAcknowledged?: boolean;
  technologyRequirementsUnderstood?: boolean;
  clientSignature?: string;
  clientIPAddress?: string;
  clientUserAgent?: string;
}

/**
 * Get or create telehealth consent for a client
 * Georgia requires separate telehealth consent
 */
export async function getOrCreateTelehealthConsent(data: CreateConsentData) {
  try {
    // Check if client already has active consent
    const existingConsent = await prisma.telehealthConsent.findFirst({
      where: {
        clientId: data.clientId,
        consentType: data.consentType,
        isActive: true,
        consentWithdrawn: false,
        expirationDate: {
          gte: new Date(), // Not expired
        },
      },
    });

    if (existingConsent) {
      return existingConsent;
    }

    // Create new consent (expires in 1 year per Georgia requirements)
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    const consentText = getConsentTextByType(data.consentType);

    const newConsent = await prisma.telehealthConsent.create({
      data: {
        clientId: data.clientId,
        consentType: data.consentType,
        consentText,
        expirationDate,
        createdBy: data.createdBy,
        lastModifiedBy: data.createdBy,
      },
    });

    logger.info('Telehealth consent created', {
      consentId: newConsent.id,
      clientId: data.clientId,
      consentType: data.consentType,
    });

    return newConsent;
  } catch (error: any) {
    logger.error('Failed to get or create telehealth consent', {
      error: error.message,
      clientId: data.clientId,
    });
    throw error;
  }
}

/**
 * Sign/update telehealth consent
 */
export async function signTelehealthConsent(
  consentId: string,
  data: UpdateConsentData,
  userId: string
) {
  try {
    // Validate all Georgia requirements are acknowledged
    if (data.consentGiven) {
      if (
        !data.patientRightsAcknowledged ||
        !data.emergencyProtocolsUnderstood ||
        !data.privacyRisksAcknowledged ||
        !data.technologyRequirementsUnderstood
      ) {
        throw new Error(
          'All Georgia telehealth consent requirements must be acknowledged'
        );
      }
    }

    const consent = await prisma.telehealthConsent.update({
      where: { id: consentId },
      data: {
        ...data,
        consentDate: data.consentGiven ? new Date() : null,
        lastModifiedBy: userId,
      },
    });

    logger.info('Telehealth consent signed', {
      consentId,
      consentGiven: data.consentGiven,
    });

    return consent;
  } catch (error: any) {
    logger.error('Failed to sign telehealth consent', {
      error: error.message,
      consentId,
    });
    throw error;
  }
}

/**
 * Check if client has valid telehealth consent
 */
export async function hasValidTelehealthConsent(
  clientId: string,
  consentType: string = 'Georgia_Telehealth'
): Promise<boolean> {
  try {
    const consent = await prisma.telehealthConsent.findFirst({
      where: {
        clientId,
        consentType,
        isActive: true,
        consentGiven: true,
        consentWithdrawn: false,
        expirationDate: {
          gte: new Date(),
        },
      },
    });

    return !!consent;
  } catch (error: any) {
    logger.error('Failed to check telehealth consent', {
      error: error.message,
      clientId,
    });
    return false;
  }
}

/**
 * Withdraw telehealth consent
 */
export async function withdrawTelehealthConsent(
  consentId: string,
  reason: string,
  userId: string
) {
  try {
    const consent = await prisma.telehealthConsent.update({
      where: { id: consentId },
      data: {
        consentWithdrawn: true,
        withdrawalDate: new Date(),
        withdrawalReason: reason,
        isActive: false,
        lastModifiedBy: userId,
      },
    });

    logger.info('Telehealth consent withdrawn', {
      consentId,
      reason,
    });

    return consent;
  } catch (error: any) {
    logger.error('Failed to withdraw telehealth consent', {
      error: error.message,
      consentId,
    });
    throw error;
  }
}

/**
 * Get all consents for a client
 */
export async function getClientTelehealthConsents(clientId: string) {
  try {
    const consents = await prisma.telehealthConsent.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });

    return consents;
  } catch (error: any) {
    logger.error('Failed to get client telehealth consents', {
      error: error.message,
      clientId,
    });
    throw error;
  }
}

/**
 * Get consent text based on type
 */
function getConsentTextByType(consentType: string): string {
  const consentTexts = {
    Georgia_Telehealth: `
TELEHEALTH SERVICES CONSENT (Georgia)

I hereby consent to engage in telehealth services with MentalSpace EHR providers. I understand that:

1. PATIENT RIGHTS: I have the right to withhold or withdraw consent at any time without affecting my right to future care or treatment.

2. TECHNOLOGY: Telehealth involves the use of electronic communications to enable healthcare providers at different locations to share individual patient medical information for the purpose of improving patient care. The electronic systems used will incorporate network and software security protocols to protect confidentiality of patient identification and imaging data and will include measures to safeguard the data and to ensure its integrity against intentional or unintentional corruption.

3. RISKS & BENEFITS:
   - Benefits may include improved access to care by enabling a patient to remain in their home/office while consulting with their provider.
   - Risks may include delays in evaluation or treatment due to technical difficulties, loss of data due to technical failures, or security protocols could fail causing a breach of privacy of personal medical information.

4. EMERGENCY PROTOCOLS: I understand that in case of technology failure or clinical emergencies, the provider may determine that I should:
   - Receive in-person services
   - Contact emergency services (911)
   - Go to the nearest emergency room

5. PRIVACY: I understand the laws that protect privacy and confidentiality of medical information also apply to telehealth, but there are potential risks of breach of confidentiality.

6. TECHNOLOGY REQUIREMENTS: I understand that I am responsible for:
   - Having adequate internet connectivity
   - Having a device with video capability
   - Being in a private, secure location during sessions
   - Notifying my provider if anyone else is present during the session

7. GEOGRAPHICAL LIMITATIONS: My provider is licensed in Georgia and can only provide services to me while I am physically located in Georgia at the time of service.

By signing this consent, I acknowledge that I have read, understood, and agree to the above terms.
    `.trim(),

    HIPAA_Telehealth: `
HIPAA TELEHEALTH PRIVACY CONSENT

I understand and consent to the use of telehealth technology for my mental health care services. I acknowledge that:

1. All HIPAA privacy protections apply to telehealth services
2. My provider will use encrypted, HIPAA-compliant video conferencing technology
3. Sessions may be interrupted or terminated if privacy cannot be ensured
4. I will not record sessions without written consent from my provider
5. I will ensure I am in a private location during sessions

This consent is valid for one year from the date of signature and may be withdrawn at any time in writing.
    `.trim(),

    Recording: `
SESSION RECORDING CONSENT

I consent to the recording of my telehealth sessions. I understand that:

1. Recordings will be stored securely and encrypted
2. Recordings will only be accessed by my treatment team
3. Recordings may be used for clinical supervision, quality assurance, or legal purposes
4. I may withdraw this consent at any time, which will stop future recordings
5. Withdrawal of consent does not affect recordings made prior to withdrawal

This consent remains in effect until I withdraw it in writing.
    `.trim(),
  };

  return consentTexts[consentType as keyof typeof consentTexts] || '';
}
