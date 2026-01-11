import { Request, Response, Router } from 'express';
import logger from '../utils/logger';
import prisma from '../services/database';
import { authenticate } from '../middleware/auth';
import * as cache from '../services/cache.service';

const router = Router();

/**
 * Tableau Web Data Connector (WDC) Integration
 *
 * This integration provides JSON-based data endpoints for Tableau.
 * Tableau can use the Web Data Connector HTML page to connect to these endpoints.
 *
 * WDC Page URL:
 * http://your-domain.com/tableau-wdc.html
 */

/**
 * Tableau WDC Schema Definition
 * Returns the schema for Tableau to understand the data structure
 */
router.get('/tableau/schema/:reportType', authenticate, (req: Request, res: Response) => {
  try {
    const { reportType } = req.params;

    let schema: any;

    switch (reportType) {
      case 'revenue-by-clinician':
        schema = {
          id: 'revenueByClinician',
          alias: 'Revenue by Clinician',
          columns: [
            { id: 'clinicianId', alias: 'Clinician ID', dataType: 'string' },
            { id: 'clinicianName', alias: 'Clinician Name', dataType: 'string' },
            { id: 'totalRevenue', alias: 'Total Revenue', dataType: 'float' },
            { id: 'sessionCount', alias: 'Session Count', dataType: 'int' },
            { id: 'averagePerSession', alias: 'Average Per Session', dataType: 'float' },
            { id: 'period', alias: 'Period', dataType: 'string' }
          ]
        };
        break;

      case 'revenue-by-cpt':
        schema = {
          id: 'revenueByCPT',
          alias: 'Revenue by CPT Code',
          columns: [
            { id: 'cptCode', alias: 'CPT Code', dataType: 'string' },
            { id: 'description', alias: 'Description', dataType: 'string' },
            { id: 'totalRevenue', alias: 'Total Revenue', dataType: 'float' },
            { id: 'sessionCount', alias: 'Session Count', dataType: 'int' },
            { id: 'averageCharge', alias: 'Average Charge', dataType: 'float' }
          ]
        };
        break;

      case 'revenue-by-payer':
        schema = {
          id: 'revenueByPayer',
          alias: 'Revenue by Payer',
          columns: [
            { id: 'payerName', alias: 'Payer Name', dataType: 'string' },
            { id: 'totalRevenue', alias: 'Total Revenue', dataType: 'float' },
            { id: 'sessionCount', alias: 'Session Count', dataType: 'int' },
            { id: 'averagePerSession', alias: 'Average Per Session', dataType: 'float' },
            { id: 'percentage', alias: 'Percentage', dataType: 'float' }
          ]
        };
        break;

      case 'kvr-analysis':
        schema = {
          id: 'kvrAnalysis',
          alias: 'KVR Analysis',
          columns: [
            { id: 'clinicianName', alias: 'Clinician Name', dataType: 'string' },
            { id: 'scheduled', alias: 'Scheduled', dataType: 'int' },
            { id: 'kept', alias: 'Kept', dataType: 'int' },
            { id: 'cancelled', alias: 'Cancelled', dataType: 'int' },
            { id: 'noShow', alias: 'No Show', dataType: 'int' },
            { id: 'kvr', alias: 'KVR Percentage', dataType: 'float' }
          ]
        };
        break;

      case 'client-demographics':
        schema = {
          id: 'clientDemographics',
          alias: 'Client Demographics',
          columns: [
            { id: 'category', alias: 'Category', dataType: 'string' },
            { id: 'value', alias: 'Value', dataType: 'string' },
            { id: 'count', alias: 'Count', dataType: 'int' },
            { id: 'percentage', alias: 'Percentage', dataType: 'float' }
          ]
        };
        break;

      default:
        return res.status(404).json({
          success: false,
          message: 'Unknown report type'
        });
    }

    res.json({
      success: true,
      schema
    });
  } catch (error) {
    logger.error('Error generating Tableau schema:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate schema',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Tableau WDC Data Endpoint - Revenue by Clinician
 */
router.get('/tableau/data/revenue-by-clinician', authenticate, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, noCache } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Check cache unless noCache is specified
    if (!noCache) {
      const cacheKey = cache.generateKey('tableau-revenue-clinician', {
        start: start.toISOString(),
        end: end.toISOString(),
      });
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        logger.debug('Tableau cache hit: revenue-by-clinician');
        return res.json({
          success: true,
          data: cachedData,
          cached: true,
          cacheExpiry: '5 minutes'
        });
      }
    }

    const chargesByClinician = await prisma.chargeEntry.groupBy({
      by: ['providerId'],
      where: {
        serviceDate: { gte: start, lte: end },
        chargeStatus: { not: 'VOIDED' }
      },
      _sum: { chargeAmount: true },
      _count: { id: true }
    });

    const clinicianIds = chargesByClinician.map(c => c.providerId);
    const clinicians = await prisma.user.findMany({
      where: { id: { in: clinicianIds } },
      select: { id: true, firstName: true, lastName: true }
    });

    const data = chargesByClinician.map(charge => {
      const clinician = clinicians.find(c => c.id === charge.providerId);
      return {
        clinicianId: charge.providerId,
        clinicianName: clinician ? `${clinician.firstName} ${clinician.lastName}` : 'Unknown',
        totalRevenue: Number(charge._sum.chargeAmount || 0),
        sessionCount: charge._count.id,
        averagePerSession: charge._sum.chargeAmount && charge._count.id > 0
          ? Number(charge._sum.chargeAmount) / charge._count.id
          : 0,
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
      };
    });

    // Cache the result for 5 minutes
    const cacheKey = cache.generateKey('tableau-revenue-clinician', {
      start: start.toISOString(),
      end: end.toISOString(),
    });
    await cache.set(cacheKey, data, cache.CacheTTL.MEDIUM, cache.CacheCategory.REVENUE);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching Tableau data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Tableau WDC Data Endpoint - Revenue by CPT
 */
router.get('/tableau/data/revenue-by-cpt', authenticate, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    const chargesByCPT = await prisma.chargeEntry.groupBy({
      by: ['cptCode'],
      where: {
        serviceDate: { gte: start, lte: end },
        chargeStatus: { not: 'VOIDED' }
      },
      _sum: { chargeAmount: true },
      _count: { id: true }
    });

    const cptCodes = chargesByCPT.map(c => c.cptCode);
    const serviceCodes = await prisma.serviceCode.findMany({
      where: { code: { in: cptCodes } }
    });

    const data = chargesByCPT.map(charge => {
      const code = serviceCodes.find(sc => sc.code === charge.cptCode);
      return {
        cptCode: charge.cptCode,
        description: code?.description || 'Unknown Service',
        totalRevenue: Number(charge._sum.chargeAmount || 0),
        sessionCount: charge._count.id,
        averageCharge: charge._sum.chargeAmount && charge._count.id > 0
          ? Number(charge._sum.chargeAmount) / charge._count.id
          : 0
      };
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching Tableau data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Tableau WDC Data Endpoint - Revenue by Payer
 */
router.get('/tableau/data/revenue-by-payer', authenticate, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    const charges = await prisma.chargeEntry.findMany({
      where: {
        serviceDate: { gte: start, lte: end },
        chargeStatus: { not: 'VOIDED' }
      },
      include: {
        client: {
          include: {
            insuranceInfo: {
              where: { rank: 'Primary' }
            }
          }
        }
      }
    });

    const payerMap = new Map<string, { revenue: number; count: number }>();

    charges.forEach(charge => {
      const payer = charge.client.insuranceInfo[0]?.insuranceCompany || 'Self-Pay';
      const existing = payerMap.get(payer) || { revenue: 0, count: 0 };
      payerMap.set(payer, {
        revenue: existing.revenue + Number(charge.chargeAmount),
        count: existing.count + 1
      });
    });

    const totalRevenue = Array.from(payerMap.values()).reduce((sum, p) => sum + p.revenue, 0);

    const data = Array.from(payerMap.entries()).map(([payer, payerData]) => ({
      payerName: payer,
      totalRevenue: payerData.revenue,
      sessionCount: payerData.count,
      averagePerSession: payerData.count > 0 ? payerData.revenue / payerData.count : 0,
      percentage: totalRevenue > 0 ? (payerData.revenue / totalRevenue) * 100 : 0
    }));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching Tableau data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Tableau WDC Data Endpoint - KVR Analysis
 */
router.get('/tableau/data/kvr-analysis', authenticate, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    const clinicians = await prisma.user.findMany({
      where: {
        roles: { hasSome: ['CLINICIAN', 'SUPERVISOR', 'ASSOCIATE'] }
      }
    });

    const data = await Promise.all(
      clinicians.map(async clinician => {
        const appointments = await prisma.appointment.findMany({
          where: {
            clinicianId: clinician.id,
            appointmentDate: { gte: start, lte: end }
          }
        });

        const scheduled = appointments.length;
        const kept = appointments.filter(a => a.status === 'COMPLETED').length;
        const cancelled = appointments.filter(a => a.status === 'CANCELLED').length;
        const noShow = appointments.filter(a => a.status === 'NO_SHOW').length;
        const kvr = scheduled > 0 ? (kept / scheduled) * 100 : 0;

        return {
          clinicianName: `${clinician.firstName} ${clinician.lastName}`,
          scheduled,
          kept,
          cancelled,
          noShow,
          kvr
        };
      })
    );

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching Tableau data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Tableau WDC Data Endpoint - Client Demographics
 */
router.get('/tableau/data/client-demographics', authenticate, async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      where: { status: 'ACTIVE' }
    });

    const totalActive = clients.length;
    const data: any[] = [];

    // Age distribution
    const ageGroups: Record<string, number> = { '0-17': 0, '18-25': 0, '26-40': 0, '41-60': 0, '60+': 0 };
    clients.forEach(client => {
      const age = Math.floor((new Date().getTime() - client.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      if (age < 18) ageGroups['0-17']++;
      else if (age < 26) ageGroups['18-25']++;
      else if (age < 41) ageGroups['26-40']++;
      else if (age < 61) ageGroups['41-60']++;
      else ageGroups['60+']++;
    });

    Object.entries(ageGroups).forEach(([group, count]) => {
      data.push({
        category: 'Age',
        value: group,
        count,
        percentage: totalActive > 0 ? (count / totalActive) * 100 : 0
      });
    });

    // Gender distribution
    const genderMap: Record<string, string> = {
      'MALE': 'Male',
      'FEMALE': 'Female',
      'OTHER': 'Other',
      'NON_BINARY': 'Non-Binary',
      'PREFER_NOT_TO_SAY': 'Prefer Not to Say'
    };

    const genderCounts = new Map<string, number>();
    clients.forEach(client => {
      const gender = genderMap[client.gender] || 'Unknown';
      genderCounts.set(gender, (genderCounts.get(gender) || 0) + 1);
    });

    genderCounts.forEach((count, gender) => {
      data.push({
        category: 'Gender',
        value: gender,
        count,
        percentage: totalActive > 0 ? (count / totalActive) * 100 : 0
      });
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching Tableau data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Tableau WDC Available Reports List
 */
router.get('/tableau/reports', authenticate, (req: Request, res: Response) => {
  res.json({
    success: true,
    reports: [
      {
        id: 'revenue-by-clinician',
        name: 'Revenue by Clinician',
        description: 'Revenue breakdown by clinician with session counts',
        schemaUrl: '/api/v1/tableau/schema/revenue-by-clinician',
        dataUrl: '/api/v1/tableau/data/revenue-by-clinician'
      },
      {
        id: 'revenue-by-cpt',
        name: 'Revenue by CPT Code',
        description: 'Revenue analysis by service CPT codes',
        schemaUrl: '/api/v1/tableau/schema/revenue-by-cpt',
        dataUrl: '/api/v1/tableau/data/revenue-by-cpt'
      },
      {
        id: 'revenue-by-payer',
        name: 'Revenue by Payer',
        description: 'Revenue breakdown by insurance payers',
        schemaUrl: '/api/v1/tableau/schema/revenue-by-payer',
        dataUrl: '/api/v1/tableau/data/revenue-by-payer'
      },
      {
        id: 'kvr-analysis',
        name: 'KVR Analysis',
        description: 'Keep/Visit Ratio analysis by clinician',
        schemaUrl: '/api/v1/tableau/schema/kvr-analysis',
        dataUrl: '/api/v1/tableau/data/kvr-analysis'
      },
      {
        id: 'client-demographics',
        name: 'Client Demographics',
        description: 'Age and gender distribution of active clients',
        schemaUrl: '/api/v1/tableau/schema/client-demographics',
        dataUrl: '/api/v1/tableau/data/client-demographics'
      }
    ]
  });
});

export default router;
