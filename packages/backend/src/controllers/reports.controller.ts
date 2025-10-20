import logger, { logControllerError } from '../utils/logger';
import { Request, Response } from 'express';
import prisma from '../services/database';

/**
 * Revenue Reports Controller
 */

// Get revenue by clinician
export async function getRevenueByClinicianReport(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get all charges grouped by clinician (providerId in schema)
    const chargesByClinician = await prisma.chargeEntry.groupBy({
      by: ['providerId'],
      where: {
        serviceDate: {
          gte: start,
          lte: end,
        },
        chargeStatus: {
          not: 'VOIDED',
        },
      },
      _sum: {
        chargeAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // Get clinician details
    const clinicianIds = chargesByClinician.map((c) => c.providerId);
    const clinicians = await prisma.user.findMany({
      where: {
        id: { in: clinicianIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        roles: true,
      },
    });

    const report = chargesByClinician.map((charge) => {
      const clinician = clinicians.find((c) => c.id === charge.providerId);
      return {
        clinicianId: charge.providerId,
        clinicianName: clinician ? `${clinician.firstName} ${clinician.lastName}` : 'Unknown',
        roles: clinician?.roles || [],
        totalRevenue: Number(charge._sum.chargeAmount || 0),
        sessionCount: charge._count.id,
        averagePerSession: charge._sum.chargeAmount && charge._count.id > 0
          ? Number(charge._sum.chargeAmount) / charge._count.id
          : 0,
      };
    });

    res.json({
      success: true,
      data: {
        report,
        period: { startDate: start, endDate: end },
        totalRevenue: report.reduce((sum, r) => sum + r.totalRevenue, 0),
        totalSessions: report.reduce((sum, r) => sum + r.sessionCount, 0),
      },
    });
  } catch (error) {
    logger.error('Error generating revenue by clinician report:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to generate revenue by clinician report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Get revenue by CPT code
export async function getRevenueByCPTReport(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    const chargesByCPT = await prisma.chargeEntry.groupBy({
      by: ['cptCode'],
      where: {
        serviceDate: {
          gte: start,
          lte: end,
        },
        chargeStatus: {
          not: 'VOIDED',
        },
      },
      _sum: {
        chargeAmount: true,
      },
      _count: {
        id: true,
      },
    });

    const cptCodes = chargesByCPT.map((c) => c.cptCode);
    const serviceCodes = await prisma.serviceCode.findMany({
      where: {
        code: { in: cptCodes },
      },
    });

    const report = chargesByCPT.map((charge) => {
      const code = serviceCodes.find((sc) => sc.code === charge.cptCode);
      return {
        cptCode: charge.cptCode,
        description: code?.description || 'Unknown Service',
        totalRevenue: Number(charge._sum.chargeAmount || 0),
        sessionCount: charge._count.id,
        averageCharge: charge._sum.chargeAmount && charge._count.id > 0
          ? Number(charge._sum.chargeAmount) / charge._count.id
          : 0,
      };
    });

    res.json({
      success: true,
      data: {
        report: report.sort((a, b) => b.totalRevenue - a.totalRevenue),
        period: { startDate: start, endDate: end },
        totalRevenue: report.reduce((sum, r) => sum + r.totalRevenue, 0),
      },
    });
  } catch (error) {
    logger.error('Error generating revenue by CPT report:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to generate revenue by CPT report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Get revenue by payer
export async function getRevenueByPayerReport(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get all charges with client insurance info
    const charges = await prisma.chargeEntry.findMany({
      where: {
        serviceDate: {
          gte: start,
          lte: end,
        },
        chargeStatus: {
          not: 'VOIDED',
        },
      },
      include: {
        client: {
          include: {
            insuranceInfo: {
              where: {
                rank: 'Primary',
              },
            },
          },
        },
      },
    });

    // Group by payer
    const payerMap = new Map<string, { revenue: number; count: number }>();

    charges.forEach((charge) => {
      const payer = charge.client.insuranceInfo[0]?.insuranceCompany || 'Self-Pay';
      const existing = payerMap.get(payer) || { revenue: 0, count: 0 };
      payerMap.set(payer, {
        revenue: existing.revenue + Number(charge.chargeAmount),
        count: existing.count + 1,
      });
    });

    const report = Array.from(payerMap.entries()).map(([payer, data]) => ({
      payerName: payer,
      totalRevenue: data.revenue,
      sessionCount: data.count,
      averagePerSession: data.count > 0 ? data.revenue / data.count : 0,
      percentage: 0, // Will calculate after
    }));

    const totalRevenue = report.reduce((sum, r) => sum + r.totalRevenue, 0);
    report.forEach((r) => {
      r.percentage = totalRevenue > 0 ? (r.totalRevenue / totalRevenue) * 100 : 0;
    });

    res.json({
      success: true,
      data: {
        report: report.sort((a, b) => b.totalRevenue - a.totalRevenue),
        period: { startDate: start, endDate: end },
        totalRevenue,
      },
    });
  } catch (error) {
    logger.error('Error generating revenue by payer report:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to generate revenue by payer report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Get payment collection report
export async function getPaymentCollectionReport(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Total charges
    const totalCharges = await prisma.chargeEntry.aggregate({
      where: {
        serviceDate: { gte: start, lte: end },
        chargeStatus: { not: 'VOIDED' },
      },
      _sum: { chargeAmount: true },
    });

    // Total payments
    const totalPayments = await prisma.paymentRecord.aggregate({
      where: {
        paymentDate: { gte: start, lte: end },
      },
      _sum: { paymentAmount: true },
    });

    const charged = Number(totalCharges._sum.chargeAmount) || 0;
    const collected = Number(totalPayments._sum.paymentAmount) || 0;
    const collectionRate = charged > 0 ? (collected / charged) * 100 : 0;

    res.json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        totalCharged: charged,
        totalCollected: collected,
        outstanding: charged - collected,
        collectionRate,
      },
    });
  } catch (error) {
    logger.error('Error generating payment collection report:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment collection report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Productivity Reports Controller
 */

// Get KVR analysis report
export async function getKVRAnalysisReport(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get all clinicians
    const clinicians = await prisma.user.findMany({
      where: {
        roles: { hasSome: ['CLINICIAN', 'SUPERVISOR', 'ASSOCIATE'] },
      },
    });

    const report = await Promise.all(
      clinicians.map(async (clinician) => {
        // Get appointments in period
        const appointments = await prisma.appointment.findMany({
          where: {
            clinicianId: clinician.id,
            appointmentDate: { gte: start, lte: end },
          },
        });

        const scheduled = appointments.length;
        const kept = appointments.filter((a) => a.status === 'COMPLETED').length;
        const cancelled = appointments.filter((a) => a.status === 'CANCELLED').length;
        const noShow = appointments.filter((a) => a.status === 'NO_SHOW').length;

        const kvr = scheduled > 0 ? (kept / scheduled) * 100 : 0;

        return {
          clinicianId: clinician.id,
          clinicianName: `${clinician.firstName} ${clinician.lastName}`,
          scheduled,
          kept,
          cancelled,
          noShow,
          kvr,
        };
      })
    );

    res.json({
      success: true,
      data: {
        report: report.sort((a, b) => b.kvr - a.kvr),
        period: { startDate: start, endDate: end },
        averageKVR: report.length > 0 ? report.reduce((sum, r) => sum + r.kvr, 0) / report.length : 0,
      },
    });
  } catch (error) {
    logger.error('Error generating KVR analysis report:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to generate KVR analysis report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Get sessions per day report
export async function getSessionsPerDayReport(req: Request, res: Response) {
  try {
    const { startDate, endDate, clinicianId } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    const where: any = {
      appointmentDate: { gte: start, lte: end },
      status: 'COMPLETED',
    };

    if (clinicianId) {
      where.clinicianId = clinicianId as string;
    }

    const appointments = await prisma.appointment.findMany({ where });

    // Group by date
    const dateMap = new Map<string, number>();
    appointments.forEach((apt) => {
      const dateKey = apt.appointmentDate.toISOString().split('T')[0];
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    });

    const report = Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, sessionCount: count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalSessions = appointments.length;
    const daysWorked = dateMap.size;
    const averagePerDay = daysWorked > 0 ? totalSessions / daysWorked : 0;

    res.json({
      success: true,
      data: {
        report,
        period: { startDate: start, endDate: end },
        totalSessions,
        daysWorked,
        averagePerDay,
      },
    });
  } catch (error) {
    logger.error('Error generating sessions per day report:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to generate sessions per day report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Compliance Reports Controller
 */

// Get unsigned notes report
export async function getUnsignedNotesReport(req: Request, res: Response) {
  try {
    const unsignedNotes = await prisma.clinicalNote.findMany({
      where: {
        status: { in: ['DRAFT', 'PENDING_COSIGN'] },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        sessionDate: 'asc',
      },
    });

    const report = unsignedNotes.map((note) => ({
      noteId: note.id,
      clientName: `${note.client.firstName} ${note.client.lastName}`,
      clinicianName: `${note.clinician.firstName} ${note.clinician.lastName}`,
      sessionDate: note.sessionDate,
      noteType: note.noteType,
      status: note.status,
      daysOverdue: Math.floor((new Date().getTime() - note.sessionDate.getTime()) / (1000 * 60 * 60 * 24)),
    }));

    res.json({
      success: true,
      data: {
        report,
        totalUnsigned: unsignedNotes.length,
        criticalCount: report.filter((r) => r.daysOverdue > 7).length, // Georgia 7-day rule
      },
    });
  } catch (error) {
    logger.error('Error generating unsigned notes report:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to generate unsigned notes report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Get missing treatment plans report
export async function getMissingTreatmentPlansReport(req: Request, res: Response) {
  try {
    // Get all active clients
    const activeClients = await prisma.client.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        treatmentPlans: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    const report = activeClients
      .filter((client) => {
        if (client.treatmentPlans.length === 0) return true;
        const lastPlan = client.treatmentPlans[0];
        const daysSinceLastPlan = Math.floor(
          (new Date().getTime() - lastPlan.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSinceLastPlan > 90; // Georgia 90-day rule
      })
      .map((client) => ({
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
        lastTreatmentPlanDate: client.treatmentPlans[0]?.createdAt || null,
        daysOverdue: client.treatmentPlans[0]
          ? Math.max(
              0,
              Math.floor((new Date().getTime() - client.treatmentPlans[0].createdAt.getTime()) / (1000 * 60 * 60 * 24)) - 90
            )
          : 'Never',
      }));

    res.json({
      success: true,
      data: {
        report,
        totalMissing: report.length,
        criticalCount: report.filter((r) => typeof r.daysOverdue === 'number' && r.daysOverdue > 30).length,
      },
    });
  } catch (error) {
    logger.error('Error generating missing treatment plans report:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to generate missing treatment plans report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Demographics Reports Controller
 */

// Get client demographics report
export async function getClientDemographicsReport(req: Request, res: Response) {
  try {
    const clients = await prisma.client.findMany({
      where: {
        status: 'ACTIVE',
      },
    });

    // Age distribution
    const ageGroups = { '0-17': 0, '18-25': 0, '26-40': 0, '41-60': 0, '60+': 0 };
    clients.forEach((client) => {
      const age = Math.floor((new Date().getTime() - client.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      if (age < 18) ageGroups['0-17']++;
      else if (age < 26) ageGroups['18-25']++;
      else if (age < 41) ageGroups['26-40']++;
      else if (age < 61) ageGroups['41-60']++;
      else ageGroups['60+']++;
    });

    // Gender distribution
    const genderDistribution = {
      male: clients.filter((c) => c.gender === 'MALE').length,
      female: clients.filter((c) => c.gender === 'FEMALE').length,
      other: clients.filter((c) => c.gender === 'OTHER' || c.gender === 'NON_BINARY').length,
      preferNotToSay: clients.filter((c) => c.gender === 'PREFER_NOT_TO_SAY').length,
    };

    res.json({
      success: true,
      data: {
        totalActive: clients.length,
        ageGroups,
        genderDistribution,
      },
    });
  } catch (error) {
    logger.error('Error generating client demographics report:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to generate client demographics report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Get quick stats for dashboard
export async function getReportQuickStats(req: Request, res: Response) {
  try {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date();

    // Total revenue this month
    const revenueData = await prisma.chargeEntry.aggregate({
      where: {
        serviceDate: { gte: startOfMonth, lte: endOfMonth },
        chargeStatus: { not: 'VOIDED' },
      },
      _sum: { chargeAmount: true },
    });

    // Average KVR
    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: startOfMonth, lte: endOfMonth },
      },
    });
    const kept = appointments.filter((a) => a.status === 'COMPLETED').length;
    const avgKVR = appointments.length > 0 ? (kept / appointments.length) * 100 : 0;

    // Unsigned notes
    const unsignedCount = await prisma.clinicalNote.count({
      where: {
        status: { in: ['DRAFT', 'PENDING_COSIGN'] },
      },
    });

    // Active clients
    const activeCount = await prisma.client.count({
      where: { status: 'ACTIVE' },
    });

    res.json({
      success: true,
      data: {
        totalRevenue: Number(revenueData._sum.chargeAmount) || 0,
        avgKVR: Math.round(avgKVR * 10) / 10,
        unsignedNotes: unsignedCount,
        activeClients: activeCount,
      },
    });
  } catch (error) {
    logger.error('Error fetching quick stats:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quick stats',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
