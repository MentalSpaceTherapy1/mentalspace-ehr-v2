import { Request, Response, Router } from 'express';
import logger from '../utils/logger';
import prisma from '../services/database';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Power BI OData Feed Integration
 *
 * This integration provides OData-compatible endpoints for Power BI to connect to.
 * Power BI can use these endpoints to import data and create dashboards/reports.
 *
 * Connection URL format:
 * http://your-domain.com/api/v1/odata/reports/{reportType}
 *
 * Authentication: Bearer Token (API Key)
 */

/**
 * OData Metadata Document
 * Describes the data structure for Power BI
 */
function generateODataMetadata(entityName: string, properties: Array<{ name: string; type: string }>): string {
  const propertyElements = properties.map(prop => {
    const edmType = mapToEdmType(prop.type);
    return `      <Property Name="${prop.name}" Type="${edmType}" Nullable="false"/>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="MentalSpaceEHR" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="${entityName}">
        <Key>
          <PropertyRef Name="Id"/>
        </Key>
${propertyElements}
      </EntityType>
      <EntityContainer Name="DefaultContainer">
        <EntitySet Name="${entityName}" EntityType="MentalSpaceEHR.${entityName}"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
}

/**
 * Map JavaScript types to EDM (Entity Data Model) types
 */
function mapToEdmType(jsType: string): string {
  const typeMap: Record<string, string> = {
    'string': 'Edm.String',
    'number': 'Edm.Decimal',
    'integer': 'Edm.Int32',
    'boolean': 'Edm.Boolean',
    'date': 'Edm.DateTimeOffset'
  };

  return typeMap[jsType.toLowerCase()] || 'Edm.String';
}

/**
 * Format data in OData JSON format
 */
function formatODataResponse(entityName: string, data: any[], baseUrl: string): any {
  return {
    '@odata.context': `${baseUrl}/$metadata#${entityName}`,
    '@odata.count': data.length,
    'value': data.map((item, index) => ({
      ...item,
      '@odata.id': `${baseUrl}/${entityName}(${index})`,
      '@odata.etag': `W/"${Date.now()}"`
    }))
  };
}

/**
 * OData Service Root
 */
router.get('/odata', authenticate, (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get('host')}/api/v1/odata`;

  res.json({
    '@odata.context': `${baseUrl}/$metadata`,
    'value': [
      {
        'name': 'RevenueByClinician',
        'kind': 'EntitySet',
        'url': 'RevenueByClinician'
      },
      {
        'name': 'RevenueByCPT',
        'kind': 'EntitySet',
        'url': 'RevenueByCPT'
      },
      {
        'name': 'RevenueByPayer',
        'kind': 'EntitySet',
        'url': 'RevenueByPayer'
      },
      {
        'name': 'KVRAnalysis',
        'kind': 'EntitySet',
        'url': 'KVRAnalysis'
      },
      {
        'name': 'ClientDemographics',
        'kind': 'EntitySet',
        'url': 'ClientDemographics'
      }
    ]
  });
});

/**
 * Revenue by Clinician OData Feed
 */
router.get('/odata/RevenueByClinician', authenticate, async (req: Request, res: Response) => {
  try {
    const { $metadata, $top, $skip, $filter, startDate, endDate } = req.query;

    // Return metadata if requested
    if ($metadata !== undefined) {
      const metadata = generateODataMetadata('RevenueByClinician', [
        { name: 'Id', type: 'string' },
        { name: 'ClinicianId', type: 'string' },
        { name: 'ClinicianName', type: 'string' },
        { name: 'TotalRevenue', type: 'number' },
        { name: 'SessionCount', type: 'integer' },
        { name: 'AveragePerSession', type: 'number' },
        { name: 'Period', type: 'string' }
      ]);

      res.set('Content-Type', 'application/xml');
      return res.send(metadata);
    }

    // Get report data
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

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

    let data = chargesByClinician.map((charge, index) => {
      const clinician = clinicians.find(c => c.id === charge.providerId);
      return {
        Id: `${index + 1}`,
        ClinicianId: charge.providerId,
        ClinicianName: clinician ? `${clinician.firstName} ${clinician.lastName}` : 'Unknown',
        TotalRevenue: Number(charge._sum.chargeAmount || 0),
        SessionCount: charge._count.id,
        AveragePerSession: charge._sum.chargeAmount && charge._count.id > 0
          ? Number(charge._sum.chargeAmount) / charge._count.id
          : 0,
        Period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
      };
    });

    // Apply OData query options
    if ($skip) {
      data = data.slice(Number($skip));
    }
    if ($top) {
      data = data.slice(0, Number($top));
    }

    const baseUrl = `${req.protocol}://${req.get('host')}/api/v1/odata`;
    const response = formatODataResponse('RevenueByClinician', data, baseUrl);

    res.json(response);
  } catch (error) {
    logger.error('Error in Power BI OData feed:', error);
    res.status(500).json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to fetch data for Power BI'
      }
    });
  }
});

/**
 * Revenue by CPT OData Feed
 */
router.get('/odata/RevenueByCPT', authenticate, async (req: Request, res: Response) => {
  try {
    const { $metadata, $top, $skip, startDate, endDate } = req.query;

    if ($metadata !== undefined) {
      const metadata = generateODataMetadata('RevenueByCPT', [
        { name: 'Id', type: 'string' },
        { name: 'CPTCode', type: 'string' },
        { name: 'Description', type: 'string' },
        { name: 'TotalRevenue', type: 'number' },
        { name: 'SessionCount', type: 'integer' },
        { name: 'AverageCharge', type: 'number' }
      ]);

      res.set('Content-Type', 'application/xml');
      return res.send(metadata);
    }

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

    let data = chargesByCPT.map((charge, index) => {
      const code = serviceCodes.find(sc => sc.code === charge.cptCode);
      return {
        Id: `${index + 1}`,
        CPTCode: charge.cptCode,
        Description: code?.description || 'Unknown Service',
        TotalRevenue: Number(charge._sum.chargeAmount || 0),
        SessionCount: charge._count.id,
        AverageCharge: charge._sum.chargeAmount && charge._count.id > 0
          ? Number(charge._sum.chargeAmount) / charge._count.id
          : 0
      };
    });

    if ($skip) data = data.slice(Number($skip));
    if ($top) data = data.slice(0, Number($top));

    const baseUrl = `${req.protocol}://${req.get('host')}/api/v1/odata`;
    const response = formatODataResponse('RevenueByCPT', data, baseUrl);

    res.json(response);
  } catch (error) {
    logger.error('Error in Power BI OData feed:', error);
    res.status(500).json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to fetch data for Power BI'
      }
    });
  }
});

/**
 * Revenue by Payer OData Feed
 */
router.get('/odata/RevenueByPayer', authenticate, async (req: Request, res: Response) => {
  try {
    const { $metadata, $top, $skip, startDate, endDate } = req.query;

    if ($metadata !== undefined) {
      const metadata = generateODataMetadata('RevenueByPayer', [
        { name: 'Id', type: 'string' },
        { name: 'PayerName', type: 'string' },
        { name: 'TotalRevenue', type: 'number' },
        { name: 'SessionCount', type: 'integer' },
        { name: 'AveragePerSession', type: 'number' },
        { name: 'Percentage', type: 'number' }
      ]);

      res.set('Content-Type', 'application/xml');
      return res.send(metadata);
    }

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

    let data = Array.from(payerMap.entries()).map(([payer, payerData], index) => ({
      Id: `${index + 1}`,
      PayerName: payer,
      TotalRevenue: payerData.revenue,
      SessionCount: payerData.count,
      AveragePerSession: payerData.count > 0 ? payerData.revenue / payerData.count : 0,
      Percentage: totalRevenue > 0 ? (payerData.revenue / totalRevenue) * 100 : 0
    }));

    if ($skip) data = data.slice(Number($skip));
    if ($top) data = data.slice(0, Number($top));

    const baseUrl = `${req.protocol}://${req.get('host')}/api/v1/odata`;
    const response = formatODataResponse('RevenueByPayer', data, baseUrl);

    res.json(response);
  } catch (error) {
    logger.error('Error in Power BI OData feed:', error);
    res.status(500).json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to fetch data for Power BI'
      }
    });
  }
});

/**
 * KVR Analysis OData Feed
 */
router.get('/odata/KVRAnalysis', authenticate, async (req: Request, res: Response) => {
  try {
    const { $metadata, $top, $skip, startDate, endDate } = req.query;

    if ($metadata !== undefined) {
      const metadata = generateODataMetadata('KVRAnalysis', [
        { name: 'Id', type: 'string' },
        { name: 'ClinicianName', type: 'string' },
        { name: 'Scheduled', type: 'integer' },
        { name: 'Kept', type: 'integer' },
        { name: 'Cancelled', type: 'integer' },
        { name: 'NoShow', type: 'integer' },
        { name: 'KVR', type: 'number' }
      ]);

      res.set('Content-Type', 'application/xml');
      return res.send(metadata);
    }

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    const clinicians = await prisma.user.findMany({
      where: {
        roles: { hasSome: ['CLINICIAN', 'SUPERVISOR', 'ASSOCIATE'] }
      }
    });

    let data = await Promise.all(
      clinicians.map(async (clinician, index) => {
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
          Id: `${index + 1}`,
          ClinicianName: `${clinician.firstName} ${clinician.lastName}`,
          Scheduled: scheduled,
          Kept: kept,
          Cancelled: cancelled,
          NoShow: noShow,
          KVR: kvr
        };
      })
    );

    if ($skip) data = data.slice(Number($skip));
    if ($top) data = data.slice(0, Number($top));

    const baseUrl = `${req.protocol}://${req.get('host')}/api/v1/odata`;
    const response = formatODataResponse('KVRAnalysis', data, baseUrl);

    res.json(response);
  } catch (error) {
    logger.error('Error in Power BI OData feed:', error);
    res.status(500).json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to fetch data for Power BI'
      }
    });
  }
});

/**
 * Client Demographics OData Feed
 */
router.get('/odata/ClientDemographics', authenticate, async (req: Request, res: Response) => {
  try {
    const { $metadata, $top, $skip } = req.query;

    if ($metadata !== undefined) {
      const metadata = generateODataMetadata('ClientDemographics', [
        { name: 'Id', type: 'string' },
        { name: 'Category', type: 'string' },
        { name: 'Value', type: 'string' },
        { name: 'Count', type: 'integer' },
        { name: 'Percentage', type: 'number' }
      ]);

      res.set('Content-Type', 'application/xml');
      return res.send(metadata);
    }

    const clients = await prisma.client.findMany({
      where: { status: 'ACTIVE' }
    });

    const totalActive = clients.length;
    let data: any[] = [];
    let idCounter = 1;

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
        Id: `${idCounter++}`,
        Category: 'Age',
        Value: group,
        Count: count,
        Percentage: totalActive > 0 ? (count / totalActive) * 100 : 0
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
        Id: `${idCounter++}`,
        Category: 'Gender',
        Value: gender,
        Count: count,
        Percentage: totalActive > 0 ? (count / totalActive) * 100 : 0
      });
    });

    if ($skip) data = data.slice(Number($skip));
    if ($top) data = data.slice(0, Number($top));

    const baseUrl = `${req.protocol}://${req.get('host')}/api/v1/odata`;
    const response = formatODataResponse('ClientDemographics', data, baseUrl);

    res.json(response);
  } catch (error) {
    logger.error('Error in Power BI OData feed:', error);
    res.status(500).json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to fetch data for Power BI'
      }
    });
  }
});

export default router;
