import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CompatibilityFactors {
  specialtyMatch: number;
  availabilityMatch: number;
  experienceMatch: number;
  insuranceMatch: number;
  locationMatch: number;
  styleMatch: number;
}

interface CompatibilityResult {
  overallScore: number;
  factors: CompatibilityFactors;
  details: {
    specialty: string[];
    availability: string;
    experience: string;
    insurance: string;
    location: string;
    style: string;
  };
}

/**
 * Calculate compatibility score between a provider and client
 * @param providerId - Provider user ID
 * @param clientId - Client ID
 * @returns Compatibility score and detailed breakdown
 */
export async function calculateCompatibilityScore(
  providerId: string,
  clientId: string
): Promise<CompatibilityResult> {
  // Fetch provider and client data
  const [provider, client, appointments, clientDiagnoses] = await Promise.all([
    prisma.user.findUnique({
      where: { id: providerId },
      include: { availability: true }
    }),
    prisma.client.findUnique({
      where: { id: clientId },
      include: {
        insuranceInfo: true,
        clientDiagnoses: true
      }
    }),
    prisma.appointment.findMany({
      where: {
        clientId,
        clinicianId: providerId,
        status: { in: ['COMPLETED', 'NO_SHOW', 'CANCELLED'] }
      }
    }),
    prisma.clientDiagnosis.findMany({
      where: { clientId, status: 'ACTIVE' }
    })
  ]);

  if (!provider || !client) {
    throw new Error('Provider or client not found');
  }

  // Calculate individual scores
  const specialtyScore = calculateSpecialtyMatch(provider, clientDiagnoses);
  const availabilityScore = calculateAvailabilityMatch(provider, client);
  const experienceScore = calculateExperienceMatch(provider, client);
  const insuranceScore = calculateInsuranceMatch(provider, client);
  const locationScore = calculateLocationMatch(provider, client);
  const styleScore = calculateStyleMatch(provider, client);

  // Calculate weighted overall score
  const weights = {
    specialty: 0.30,      // 30% - Most important: does provider treat this condition?
    availability: 0.20,   // 20% - Can they actually meet?
    experience: 0.15,     // 15% - Provider experience level
    insurance: 0.15,      // 15% - Financial feasibility
    location: 0.10,       // 10% - Convenience
    style: 0.10          // 10% - Therapeutic approach match
  };

  const overallScore =
    specialtyScore * weights.specialty +
    availabilityScore * weights.availability +
    experienceScore * weights.experience +
    insuranceScore * weights.insurance +
    locationScore * weights.location +
    styleScore * weights.style;

  // Calculate historical metrics
  const totalAppointments = appointments.length;
  const noShowCount = appointments.filter(a => a.status === 'NO_SHOW').length;
  const cancellationCount = appointments.filter(a => a.status === 'CANCELLED').length;
  const completedCount = appointments.filter(a => a.status === 'COMPLETED').length;
  const completionRate = totalAppointments > 0 ? completedCount / totalAppointments : 0;

  // Store or update compatibility score
  await prisma.providerClientCompatibility.upsert({
    where: {
      providerId_clientId: { providerId, clientId }
    },
    create: {
      providerId,
      clientId,
      overallScore,
      specialtyMatch: specialtyScore,
      availabilityMatch: availabilityScore,
      experienceMatch: experienceScore,
      insuranceMatch: insuranceScore,
      locationMatch: locationScore,
      styleMatch: styleScore,
      appointmentCount: totalAppointments,
      noShowCount,
      cancellationCount,
      completionRate,
      lastAppointment: appointments[0]?.appointmentDate,
      factors: {
        weights,
        specialty: provider.specialties,
        diagnoses: clientDiagnoses.map((cd: any) => cd.icd10Code),
        experience: provider.yearsOfExperience,
        insurance: client.insuranceInfo?.map((i: any) => i.insuranceCompany) || []
      }
    },
    update: {
      overallScore,
      specialtyMatch: specialtyScore,
      availabilityMatch: availabilityScore,
      experienceMatch: experienceScore,
      insuranceMatch: insuranceScore,
      locationMatch: locationScore,
      styleMatch: styleScore,
      appointmentCount: totalAppointments,
      noShowCount,
      cancellationCount,
      completionRate,
      lastAppointment: appointments[0]?.appointmentDate,
      lastCalculated: new Date(),
      factors: {
        weights,
        specialty: provider.specialties,
        diagnoses: clientDiagnoses.map((cd: any) => cd.icd10Code),
        experience: provider.yearsOfExperience,
        insurance: client.insuranceInfo?.map((i: any) => i.insuranceCompany) || []
      }
    }
  });

  return {
    overallScore,
    factors: {
      specialtyMatch: specialtyScore,
      availabilityMatch: availabilityScore,
      experienceMatch: experienceScore,
      insuranceMatch: insuranceScore,
      locationMatch: locationScore,
      styleMatch: styleScore
    },
    details: {
      specialty: provider.specialties,
      availability: provider.availability?.length ? 'Available' : 'Limited',
      experience: `${provider.yearsOfExperience || 0} years`,
      insurance: client.insuranceInfo?.map((i: any) => i.insuranceCompany).join(', ') || 'None',
      location: provider.defaultOfficeLocation || 'Not specified',
      style: provider.approachesToTherapy?.join(', ') || 'Not specified'
    }
  };
}

/**
 * Calculate how well provider's specialties match client's diagnoses
 */
function calculateSpecialtyMatch(provider: any, clientDiagnoses: any[]): number {
  if (!provider.specialties || provider.specialties.length === 0) return 0.5;
  if (!clientDiagnoses || clientDiagnoses.length === 0) return 0.7;

  // Extract diagnosis categories (first 3 characters of ICD codes)
  const diagnosisCategories = new Set(
    clientDiagnoses.map(cd => cd.diagnosis.icdCode.substring(0, 3))
  );

  // Check for specialty matches
  const specialtyKeywords = new Set(
    provider.specialties.flatMap((s: string) =>
      s.toLowerCase().split(/[\s,]+/)
    )
  );

  // Match common conditions to specialties
  const conditionMatches = {
    'F32': ['depression', 'mood', 'affective'],
    'F41': ['anxiety', 'panic', 'stress'],
    'F43': ['trauma', 'ptsd', 'stress'],
    'F50': ['eating', 'anorexia', 'bulimia'],
    'F60': ['personality', 'borderline', 'bpd'],
    'F90': ['adhd', 'attention', 'hyperactivity']
  };

  let matches = 0;
  let total = 0;

  for (const category of diagnosisCategories) {
    total++;
    const keywords = conditionMatches[category as keyof typeof conditionMatches];
    if (keywords && keywords.some(k => specialtyKeywords.has(k))) {
      matches++;
    }
  }

  return total > 0 ? matches / total : 0.7;
}

/**
 * Calculate availability match score
 */
function calculateAvailabilityMatch(provider: any, client: any): number {
  if (!provider.availableForScheduling) return 0.0;
  if (!provider.acceptsNewClients) return 0.3;

  // Check if provider has availability slots configured
  if (!provider.availability || provider.availability.length === 0) return 0.5;

  return 1.0; // Full match if provider is available and accepting new clients
}

/**
 * Calculate experience match score
 */
function calculateExperienceMatch(provider: any, client: any): number {
  const experience = provider.yearsOfExperience || 0;

  // Experience scoring curve
  if (experience >= 10) return 1.0;
  if (experience >= 5) return 0.9;
  if (experience >= 3) return 0.8;
  if (experience >= 1) return 0.7;

  return 0.6; // New providers
}

/**
 * Calculate insurance match score
 */
function calculateInsuranceMatch(provider: any, client: any): number {
  if (!client.insuranceInfo || client.insuranceInfo.length === 0) {
    return 0.8; // Self-pay client
  }

  // In a real implementation, you would check if provider accepts the client's insurance
  // For now, return a high score assuming providers generally accept most insurances
  return 0.9;
}

/**
 * Calculate location/distance match score
 */
function calculateLocationMatch(provider: any, client: any): number {
  // In a real implementation, calculate distance between provider office and client address
  // For now, return a neutral score
  return 0.8;
}

/**
 * Calculate therapy style match score
 */
function calculateStyleMatch(provider: any, client: any): number {
  if (!provider.approachesToTherapy || provider.approachesToTherapy.length === 0) {
    return 0.7; // Neutral if no style specified
  }

  // In a real implementation, you would match client preferences with provider approaches
  // For now, return a good score
  return 0.8;
}

/**
 * Get top compatible providers for a client
 */
export async function getTopCompatibleProviders(
  clientId: string,
  limit: number = 5
): Promise<any[]> {
  // Get all active providers
  const providers = await prisma.user.findMany({
    where: {
      roles: { hasSome: ['CLINICIAN', 'SUPERVISOR'] },
      isActive: true,
      availableForScheduling: true,
      acceptsNewClients: true
    }
  });

  // Calculate compatibility scores for all providers
  const scores = await Promise.all(
    providers.map(async (provider) => {
      try {
        const result = await calculateCompatibilityScore(provider.id, clientId);
        return {
          provider,
          ...result
        };
      } catch (error) {
        console.error(`Error calculating compatibility for provider ${provider.id}:`, error);
        return null;
      }
    })
  );

  // Filter out errors and sort by overall score
  return scores
    .filter(s => s !== null)
    .sort((a, b) => b!.overallScore - a!.overallScore)
    .slice(0, limit);
}

/**
 * Recalculate compatibility scores for all provider-client pairs
 * Should be run periodically (e.g., nightly cron job)
 */
export async function recalculateAllCompatibilityScores(): Promise<void> {
  const activeClients = await prisma.client.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true }
  });

  const activeProviders = await prisma.user.findMany({
    where: {
      roles: { hasSome: ['CLINICIAN', 'SUPERVISOR'] },
      isActive: true
    },
    select: { id: true }
  });

  console.log(`Recalculating compatibility scores for ${activeClients.length} clients and ${activeProviders.length} providers...`);

  let processed = 0;
  const total = activeClients.length * activeProviders.length;

  for (const client of activeClients) {
    for (const provider of activeProviders) {
      try {
        await calculateCompatibilityScore(provider.id, client.id);
        processed++;
        if (processed % 100 === 0) {
          console.log(`Processed ${processed}/${total} compatibility calculations`);
        }
      } catch (error) {
        console.error(`Error calculating compatibility for provider ${provider.id} and client ${client.id}:`, error);
      }
    }
  }

  console.log(`Completed ${processed} compatibility score calculations`);
}
