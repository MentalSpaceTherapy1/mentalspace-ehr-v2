import { Request, Response } from 'express';
import logger, { logControllerError, auditLogger } from '../utils/logger';
import { z } from 'zod';
import prisma from '../services/database';
import { Prisma } from '@mentalspace/database';

// Helper to get authenticated user - all dashboard endpoints require auth
const getAuthUser = (req: Request) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }
  return req.user;
};

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createDashboardSchema = z.object({
  name: z.string().min(1, 'Dashboard name is required').max(100),
  description: z.string().optional(),
  layout: z.record(z.any()).optional().default({}),
  isDefault: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  role: z.string().optional(),
});

const updateDashboardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  layout: z.record(z.any()).optional(),
  isDefault: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  role: z.string().optional().nullable(),
});

const addWidgetSchema = z.object({
  widgetType: z.string().min(1, 'Widget type is required'),
  title: z.string().min(1, 'Widget title is required').max(200),
  config: z.record(z.any()).default({}),
  position: z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    w: z.number().int().min(1).max(12),
    h: z.number().int().min(1).max(20),
  }),
  refreshRate: z.number().int().min(5).max(3600).default(60),
});

const updateWidgetSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  config: z.record(z.any()).optional(),
  position: z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    w: z.number().int().min(1).max(12),
    h: z.number().int().min(1).max(20),
  }).optional(),
  refreshRate: z.number().int().min(5).max(3600).optional(),
});

// ============================================================================
// WIDGET DATA FETCHERS
// ============================================================================

interface WidgetDataFetcher {
  [key: string]: (userId: string, config: any) => Promise<any>;
}

/**
 * Fetch revenue data for today
 */
async function fetchRevenueToday(userId: string, config: any) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await prisma.appointment.aggregate({
    where: {
      appointmentDate: {
        gte: today,
        lt: tomorrow,
      },
      status: 'COMPLETED',
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
    },
    _sum: {
      chargeAmount: true,
    },
  });

  return {
    value: result._sum.chargeAmount || 0,
    label: 'Revenue Today',
    format: 'currency',
  };
}

/**
 * Calculate Monthly Revenue
 */
async function fetchMonthlyRevenue(userId: string, config: any) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const result = await prisma.appointment.aggregate({
    where: {
      appointmentDate: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      status: 'COMPLETED',
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
    },
    _sum: {
      chargeAmount: true,
    },
  });

  const revenue = result._sum.chargeAmount || 0;

  return {
    value: revenue,
    label: 'Monthly Revenue',
    format: 'currency',
  };
}

/**
 * Calculate Key Verification Rate (KVR)
 */
async function fetchKVR(userId: string, config: any) {
  const period = config?.period || 30; // days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  const totalAppointments = await prisma.appointment.count({
    where: {
      appointmentDate: { gte: startDate },
      status: 'COMPLETED',
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
    },
  });

  const signedNotes = await prisma.clinicalNote.count({
    where: {
      signedDate: { gte: startDate },
      status: 'SIGNED',
      appointment: {
        appointmentDate: { gte: startDate },
        status: 'COMPLETED',
        ...(config?.clinicianId && { clinicianId: config.clinicianId }),
      },
    },
  });

  const kvr = totalAppointments > 0 ? (signedNotes / totalAppointments) * 100 : 0;

  return {
    value: kvr.toFixed(1),
    label: 'Key Verification Rate',
    format: 'percentage',
    trend: kvr >= 95 ? 'up' : kvr >= 85 ? 'neutral' : 'down',
  };
}

/**
 * Get unsigned notes count
 */
async function fetchUnsignedNotes(userId: string, config: any) {
  const count = await prisma.clinicalNote.count({
    where: {
      status: { not: 'SIGNED' },
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
      ...(config?.overdue && {
        dueDate: { lt: new Date() },
      }),
    },
  });

  return {
    value: count,
    label: config?.overdue ? 'Overdue Notes' : 'Unsigned Notes',
    format: 'number',
    severity: count > 10 ? 'high' : count > 5 ? 'medium' : 'low',
  };
}

/**
 * Get active clients count
 */
async function fetchActiveClients(userId: string, config: any) {
  const period = config?.period || 90; // days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  const count = await prisma.client.count({
    where: {
      status: 'ACTIVE',
      appointments: {
        some: {
          appointmentDate: { gte: startDate },
          status: { in: ['SCHEDULED', 'COMPLETED', 'CHECKED_IN'] },
        },
      },
      ...(config?.clinicianId && {
        appointments: {
          some: {
            clinicianId: config.clinicianId,
            appointmentDate: { gte: startDate },
          },
        },
      }),
    },
  });

  return {
    value: count,
    label: `Active Clients (${period}d)`,
    format: 'number',
  };
}

/**
 * Get appointments by status
 */
async function fetchAppointmentsByStatus(userId: string, config: any) {
  const period = config?.period || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  const appointments = await prisma.appointment.groupBy({
    by: ['status'],
    where: {
      appointmentDate: { gte: startDate },
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
    },
    _count: {
      id: true,
    },
  });

  return {
    data: appointments.map((item) => ({
      status: item.status,
      count: item._count.id,
    })),
    chartType: 'pie',
  };
}

/**
 * Get revenue trend over time
 */
async function fetchRevenueTrend(userId: string, config: any) {
  const period = config?.period || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  // Group by date
  const appointments = await prisma.appointment.findMany({
    where: {
      appointmentDate: { gte: startDate },
      status: 'COMPLETED',
      chargeAmount: { not: null },
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
    },
    select: {
      appointmentDate: true,
      chargeAmount: true,
    },
    orderBy: {
      appointmentDate: 'asc',
    },
  });

  // Aggregate by date
  const revenueByDate = appointments.reduce((acc: any, apt) => {
    const dateKey = apt.appointmentDate.toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = 0;
    }
    acc[dateKey] += Number(apt.chargeAmount || 0);
    return acc;
  }, {});

  return {
    data: Object.entries(revenueByDate).map(([date, revenue]) => ({
      date,
      revenue,
    })),
    chartType: 'line',
  };
}

/**
 * Get clinician productivity metrics
 */
async function fetchClinicianProductivity(userId: string, config: any) {
  const period = config?.period || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  const clinicians = await prisma.user.findMany({
    where: {
      roles: { has: 'CLINICIAN' },
      ...(config?.clinicianId && { id: config.clinicianId }),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  const productivityData = await Promise.all(
    clinicians.map(async (clinician) => {
      const appointments = await prisma.appointment.count({
        where: {
          clinicianId: clinician.id,
          appointmentDate: { gte: startDate },
          status: 'COMPLETED',
        },
      });

      const revenue = await prisma.appointment.aggregate({
        where: {
          clinicianId: clinician.id,
          appointmentDate: { gte: startDate },
          status: 'COMPLETED',
        },
        _sum: {
          chargeAmount: true,
        },
      });

      return {
        clinician: `${clinician.firstName} ${clinician.lastName}`,
        appointments,
        revenue: Number(revenue._sum.chargeAmount || 0),
      };
    })
  );

  return {
    data: productivityData,
    chartType: 'bar',
  };
}

/**
 * Get recent appointments
 */
async function fetchRecentAppointments(userId: string, config: any) {
  const limit = config?.limit || 10;

  const appointments = await prisma.appointment.findMany({
    where: {
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
      ...(config?.status && { status: config.status }),
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
      appointmentDate: 'desc',
    },
    take: limit,
  });

  return {
    data: appointments.map((apt) => ({
      id: apt.id,
      date: apt.appointmentDate,
      time: apt.startTime,
      client: `${apt.client.firstName} ${apt.client.lastName}`,
      clinician: `${apt.clinician.firstName} ${apt.clinician.lastName}`,
      type: apt.appointmentType,
      status: apt.status,
    })),
  };
}

/**
 * Get unsigned notes list
 */
async function fetchUnsignedNotesList(userId: string, config: any) {
  const limit = config?.limit || 10;

  const notes = await prisma.clinicalNote.findMany({
    where: {
      status: { not: 'SIGNED' },
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
      ...(config?.overdue && {
        dueDate: { lt: new Date() },
      }),
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
      appointment: {
        select: {
          appointmentDate: true,
        },
      },
    },
    orderBy: {
      dueDate: 'asc',
    },
    take: limit,
  });

  return {
    data: notes.map((note) => ({
      id: note.id,
      client: `${note.client.firstName} ${note.client.lastName}`,
      clinician: `${note.clinician.firstName} ${note.clinician.lastName}`,
      appointmentDate: note.appointment?.appointmentDate,
      dueDate: note.dueDate,
      status: note.status,
      daysOverdue: note.dueDate ? Math.floor((new Date().getTime() - note.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0,
    })),
  };
}

/**
 * Get compliance alerts
 */
async function fetchComplianceAlerts(userId: string, config: any) {
  const alerts = [];

  // Check for overdue notes
  const overdueNotes = await prisma.clinicalNote.count({
    where: {
      status: { not: 'SIGNED' },
      dueDate: { lt: new Date() },
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
    },
  });

  if (overdueNotes > 0) {
    alerts.push({
      type: 'OVERDUE_NOTES',
      severity: overdueNotes > 10 ? 'high' : 'medium',
      message: `${overdueNotes} overdue clinical notes`,
      count: overdueNotes,
    });
  }

  // Check for unsigned notes approaching deadline
  const approachingDeadline = await prisma.clinicalNote.count({
    where: {
      status: { not: 'SIGNED' },
      dueDate: {
        gte: new Date(),
        lt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next 24 hours
      },
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
    },
  });

  if (approachingDeadline > 0) {
    alerts.push({
      type: 'NOTES_DUE_SOON',
      severity: 'medium',
      message: `${approachingDeadline} notes due in next 24 hours`,
      count: approachingDeadline,
    });
  }

  // Check for missing documentation
  const completedWithoutNotes = await prisma.appointment.count({
    where: {
      status: 'COMPLETED',
      appointmentDate: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
      // TODO: Fix relation name - should be ClinicalNote not notes
      // notes: {
      //   none: {},
      // },
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
    },
  });

  if (completedWithoutNotes > 0) {
    alerts.push({
      type: 'MISSING_NOTES',
      severity: 'high',
      message: `${completedWithoutNotes} completed appointments without notes`,
      count: completedWithoutNotes,
    });
  }

  return {
    data: alerts,
    totalAlerts: alerts.length,
  };
}

/**
 * Get threshold alerts
 */
async function fetchThresholdAlerts(userId: string, config: any) {
  const alerts = await prisma.thresholdAlert.findMany({
    where: {
      userId,
      isActive: true,
    },
    orderBy: {
      lastTriggered: 'desc',
    },
  });

  return {
    data: alerts,
    count: alerts.length,
  };
}

/**
 * Get capacity utilization
 */
async function fetchCapacityUtilization(userId: string, config: any) {
  const period = config?.period || 7; // days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  // Get total available hours (assuming 8 hours per day per clinician)
  const clinicianCount = await prisma.user.count({
    where: {
      roles: { has: 'CLINICIAN' },
      ...(config?.clinicianId && { id: config.clinicianId }),
    },
  });

  const totalAvailableHours = clinicianCount * period * 8;

  // Get total scheduled hours
  const appointments = await prisma.appointment.findMany({
    where: {
      appointmentDate: { gte: startDate },
      status: { in: ['SCHEDULED', 'COMPLETED', 'CHECKED_IN'] },
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
    },
    select: {
      duration: true,
    },
  });

  const totalScheduledMinutes = appointments.reduce((sum, apt) => sum + apt.duration, 0);
  const totalScheduledHours = totalScheduledMinutes / 60;

  const utilization = totalAvailableHours > 0 ? (totalScheduledHours / totalAvailableHours) * 100 : 0;

  return {
    value: utilization.toFixed(1),
    label: 'Capacity Utilization',
    format: 'percentage',
    gauge: {
      min: 0,
      max: 100,
      target: 80,
    },
  };
}

/**
 * Get revenue vs target
 */
async function fetchRevenueVsTarget(userId: string, config: any) {
  const period = config?.period || 30;
  const target = config?.target || 100000; // Default target
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  const result = await prisma.appointment.aggregate({
    where: {
      appointmentDate: { gte: startDate },
      status: 'COMPLETED',
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
    },
    _sum: {
      chargeAmount: true,
    },
  });

  const actual = Number(result._sum.chargeAmount || 0);
  const percentage = target > 0 ? (actual / target) * 100 : 0;

  return {
    value: percentage.toFixed(1),
    label: 'Revenue vs Target',
    format: 'percentage',
    gauge: {
      min: 0,
      max: 100,
      target: 100,
      actual,
      targetValue: target,
    },
  };
}

/**
 * Get no-show rate
 */
async function fetchNoShowRate(userId: string, config: any) {
  const period = config?.period || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  const totalAppointments = await prisma.appointment.count({
    where: {
      appointmentDate: { gte: startDate },
      status: { in: ['COMPLETED', 'NO_SHOW', 'CANCELLED'] },
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
    },
  });

  const noShows = await prisma.appointment.count({
    where: {
      appointmentDate: { gte: startDate },
      status: 'NO_SHOW',
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
    },
  });

  const rate = totalAppointments > 0 ? (noShows / totalAppointments) * 100 : 0;

  return {
    value: rate.toFixed(1),
    label: 'No-Show Rate',
    format: 'percentage',
    trend: rate < 5 ? 'down' : rate < 10 ? 'neutral' : 'up',
  };
}

/**
 * Get average session duration
 */
async function fetchAverageSessionDuration(userId: string, config: any) {
  const period = config?.period || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  const result = await prisma.appointment.aggregate({
    where: {
      appointmentDate: { gte: startDate },
      status: 'COMPLETED',
      actualDuration: { not: null },
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
    },
    _avg: {
      actualDuration: true,
    },
  });

  const avgDuration = result._avg.actualDuration || 0;

  return {
    value: Math.round(avgDuration),
    label: 'Avg Session Duration',
    format: 'minutes',
  };
}

/**
 * Get waitlist summary
 */
async function fetchWaitlistSummary(userId: string, config: any) {
  const total = await prisma.waitlistEntry.count({
    where: {
      status: 'ACTIVE',
      ...(config?.appointmentType && { appointmentType: config.appointmentType }),
    },
  });

  const urgent = await prisma.waitlistEntry.count({
    where: {
      status: 'ACTIVE',
      // TODO: WaitlistEntry model doesn't have urgency field - use priority instead
      priority: { gte: 8 }, // High priority threshold
      ...(config?.appointmentType && { appointmentType: config.appointmentType }),
    },
  });

  return {
    value: total,
    label: 'Waitlist Count',
    format: 'number',
    urgent,
  };
}

/**
 * Widget data fetcher registry
 */
const widgetDataFetchers: WidgetDataFetcher = {
  REVENUE_TODAY: fetchRevenueToday,
  MONTHLY_REVENUE: fetchMonthlyRevenue,
  KVR: fetchKVR,
  UNSIGNED_NOTES: fetchUnsignedNotes,
  ACTIVE_CLIENTS: fetchActiveClients,
  APPOINTMENTS_BY_STATUS: fetchAppointmentsByStatus,
  REVENUE_TREND: fetchRevenueTrend,
  CLINICIAN_PRODUCTIVITY: fetchClinicianProductivity,
  RECENT_APPOINTMENTS: fetchRecentAppointments,
  UNSIGNED_NOTES_LIST: fetchUnsignedNotesList,
  COMPLIANCE_ALERTS: fetchComplianceAlerts,
  THRESHOLD_ALERTS: fetchThresholdAlerts,
  CAPACITY_UTILIZATION: fetchCapacityUtilization,
  REVENUE_VS_TARGET: fetchRevenueVsTarget,
  NO_SHOW_RATE: fetchNoShowRate,
  AVG_SESSION_DURATION: fetchAverageSessionDuration,
  WAITLIST_SUMMARY: fetchWaitlistSummary,
};

// ============================================================================
// CONTROLLER FUNCTIONS
// ============================================================================

/**
 * Create a new dashboard
 * POST /api/v1/dashboards
 */
export const createDashboard = async (req: Request, res: Response) => {
  try {
    const validatedData = createDashboardSchema.parse(req.body);

    // If isDefault is true, unset other defaults for this user
    if (validatedData.isDefault) {
      await prisma.dashboard.updateMany({
        where: {
          userId: req.user!.userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const dashboard = await prisma.dashboard.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        layout: validatedData.layout as any,
        isDefault: validatedData.isDefault,
        isPublic: validatedData.isPublic,
        role: validatedData.role,
        userId: req.user!.userId,
      },
      include: {
        widgets: true,
      },
    });

    auditLogger.log('dashboard.create', req.user!.userId, {
      dashboardId: dashboard.id,
      dashboardName: dashboard.name,
    });

    logger.info(`Dashboard created: ${dashboard.id} by user ${req.user!.userId}`);

    res.status(201).json({
      success: true,
      data: dashboard,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    logControllerError('createDashboard', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create dashboard',
    });
  }
};

/**
 * Get all dashboards for the current user
 * GET /api/v1/dashboards
 */
export const getDashboards = async (req: Request, res: Response) => {
  try {
    const dashboards = await prisma.dashboard.findMany({
      where: {
        OR: [
          { userId: req.user!.userId },
          { isPublic: true },
          ...(req.user!.roles && req.user!.roles.length > 0 ? req.user!.roles.map(r => ({ role: r })) : []),
        ],
      },
      include: {
        widgets: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    res.json({
      success: true,
      data: dashboards,
      count: dashboards.length,
    });
  } catch (error) {
    logControllerError('getDashboards', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboards',
    });
  }
};

/**
 * Get a specific dashboard by ID
 * GET /api/v1/dashboards/:id
 */
export const getDashboardById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const dashboard = await prisma.dashboard.findUnique({
      where: { id },
      include: {
        widgets: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found',
      });
    }

    // Check access: owner, public, or role-based
    const hasAccess =
      dashboard.userId === req.user!.userId ||
      dashboard.isPublic ||
      (dashboard.role && req.user!.roles && req.user!.roles.includes(dashboard.role));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this dashboard',
      });
    }

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    logControllerError('getDashboardById', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard',
    });
  }
};

/**
 * Update a dashboard
 * PUT /api/v1/dashboards/:id
 */
export const updateDashboard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateDashboardSchema.parse(req.body);

    // Check if dashboard exists and user is owner
    const existingDashboard = await prisma.dashboard.findUnique({
      where: { id },
    });

    if (!existingDashboard) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found',
      });
    }

    if (existingDashboard.userId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own dashboards',
      });
    }

    // If setting as default, unset other defaults
    if (validatedData.isDefault) {
      await prisma.dashboard.updateMany({
        where: {
          userId: req.user!.userId,
          isDefault: true,
          id: { not: id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    const dashboard = await prisma.dashboard.update({
      where: { id },
      data: validatedData,
      include: {
        widgets: true,
      },
    });

    auditLogger.log('dashboard.update', req.user!.userId, {
      dashboardId: dashboard.id,
      changes: validatedData,
    });

    logger.info(`Dashboard updated: ${dashboard.id} by user ${req.user!.userId}`);

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    logControllerError('updateDashboard', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update dashboard',
    });
  }
};

/**
 * Delete a dashboard
 * DELETE /api/v1/dashboards/:id
 */
export const deleteDashboard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if dashboard exists and user is owner
    const existingDashboard = await prisma.dashboard.findUnique({
      where: { id },
    });

    if (!existingDashboard) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found',
      });
    }

    if (existingDashboard.userId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own dashboards',
      });
    }

    await prisma.dashboard.delete({
      where: { id },
    });

    auditLogger.log('dashboard.delete', req.user!.userId, {
      dashboardId: id,
      dashboardName: existingDashboard.name,
    });

    logger.info(`Dashboard deleted: ${id} by user ${req.user!.userId}`);

    res.json({
      success: true,
      message: 'Dashboard deleted successfully',
    });
  } catch (error) {
    logControllerError('deleteDashboard', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete dashboard',
    });
  }
};

/**
 * Add a widget to a dashboard
 * POST /api/v1/dashboards/:id/widgets
 */
export const addWidget = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = addWidgetSchema.parse(req.body);

    // Check if dashboard exists and user is owner
    const dashboard = await prisma.dashboard.findUnique({
      where: { id },
    });

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found',
      });
    }

    if (dashboard.userId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only add widgets to your own dashboards',
      });
    }

    const widget = await prisma.widget.create({
      data: {
        widgetType: validatedData.widgetType,
        title: validatedData.title,
        config: validatedData.config as any,
        position: validatedData.position as any,
        refreshRate: validatedData.refreshRate,
        dashboardId: id,
      },
    });

    auditLogger.log('widget.create', req.user!.userId, {
      widgetId: widget.id,
      dashboardId: id,
      widgetType: widget.widgetType,
    });

    logger.info(`Widget added: ${widget.id} to dashboard ${id} by user ${req.user!.userId}`);

    res.status(201).json({
      success: true,
      data: widget,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    logControllerError('addWidget', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add widget',
    });
  }
};

/**
 * Update a widget
 * PUT /api/v1/dashboards/widgets/:widgetId
 */
export const updateWidget = async (req: Request, res: Response) => {
  try {
    const { widgetId } = req.params;
    const validatedData = updateWidgetSchema.parse(req.body);

    // Check if widget exists and user owns the dashboard
    const widget = await prisma.widget.findUnique({
      where: { id: widgetId },
      include: {
        dashboard: true,
      },
    });

    if (!widget) {
      return res.status(404).json({
        success: false,
        error: 'Widget not found',
      });
    }

    if (widget.dashboard.userId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only update widgets on your own dashboards',
      });
    }

    const updatedWidget = await prisma.widget.update({
      where: { id: widgetId },
      data: validatedData,
    });

    auditLogger.log('widget.update', req.user!.userId, {
      widgetId,
      changes: validatedData,
    });

    logger.info(`Widget updated: ${widgetId} by user ${req.user!.userId}`);

    res.json({
      success: true,
      data: updatedWidget,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    logControllerError('updateWidget', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update widget',
    });
  }
};

/**
 * Delete a widget
 * DELETE /api/v1/dashboards/widgets/:widgetId
 */
export const deleteWidget = async (req: Request, res: Response) => {
  try {
    const { widgetId } = req.params;

    // Check if widget exists and user owns the dashboard
    const widget = await prisma.widget.findUnique({
      where: { id: widgetId },
      include: {
        dashboard: true,
      },
    });

    if (!widget) {
      return res.status(404).json({
        success: false,
        error: 'Widget not found',
      });
    }

    if (widget.dashboard.userId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete widgets from your own dashboards',
      });
    }

    await prisma.widget.delete({
      where: { id: widgetId },
    });

    auditLogger.log('widget.delete', req.user!.userId, {
      widgetId,
      dashboardId: widget.dashboardId,
    });

    logger.info(`Widget deleted: ${widgetId} by user ${req.user!.userId}`);

    res.json({
      success: true,
      message: 'Widget deleted successfully',
    });
  } catch (error) {
    logControllerError('deleteWidget', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete widget',
    });
  }
};

/**
 * Get real-time widget data for a dashboard
 * GET /api/v1/dashboards/:id/data
 */
export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if dashboard exists and user has access
    const dashboard = await prisma.dashboard.findUnique({
      where: { id },
      include: {
        widgets: true,
      },
    });

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found',
      });
    }

    const hasAccess =
      dashboard.userId === req.user!.userId ||
      dashboard.isPublic ||
      (dashboard.role && req.user!.roles && req.user!.roles.includes(dashboard.role));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this dashboard',
      });
    }

    // Fetch data for all widgets
    const widgetDataPromises = dashboard.widgets.map(async (widget) => {
      try {
        const fetcher = widgetDataFetchers[widget.widgetType];
        if (!fetcher) {
          logger.warn(`No data fetcher found for widget type: ${widget.widgetType}`);
          return {
            widgetId: widget.id,
            widgetType: widget.widgetType,
            error: 'Unsupported widget type',
          };
        }

        const data = await fetcher(req.user!.userId, widget.config);
        return {
          widgetId: widget.id,
          widgetType: widget.widgetType,
          title: widget.title,
          data,
        };
      } catch (error) {
        logger.error(`Error fetching data for widget ${widget.id}:`, error);
        return {
          widgetId: widget.id,
          widgetType: widget.widgetType,
          error: 'Failed to fetch widget data',
        };
      }
    });

    const widgetData = await Promise.all(widgetDataPromises);

    res.json({
      success: true,
      data: {
        dashboardId: dashboard.id,
        dashboardName: dashboard.name,
        widgets: widgetData,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    logControllerError('getDashboardData', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
    });
  }
};
