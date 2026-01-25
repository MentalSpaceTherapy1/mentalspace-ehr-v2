/**
 * Dashboard Service
 * Phase 3.2: Business logic extracted from dashboard.controller.ts
 *
 * Handles all dashboard and widget operations including data fetching
 */

import { UserRoles, AppointmentStatus as AppointmentStatusConst, NoteStatus } from '@mentalspace/shared';
import prisma from './database';
import { Prisma, AppointmentStatus } from '@mentalspace/database';
import logger from '../utils/logger';
import { AppError, NotFoundError, ForbiddenError } from '../utils/errors';
import { AuthUser } from '../types/express';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface WidgetConfig {
  clinicianId?: string;
  period?: number;
  overdue?: boolean;
  limit?: number;
  status?: string;
  appointmentType?: string;
  target?: number;
}

export interface WidgetDataBase {
  value?: number | string;
  label?: string;
  format?: string;
  trend?: string;
  severity?: string;
  urgent?: number;
  gauge?: Record<string, unknown>;
  data?: unknown[];
  chartType?: string;
  totalAlerts?: number;
  count?: number;
}

export type WidgetData = WidgetDataBase;

interface RevenueByDate {
  [date: string]: number;
}

export interface CreateDashboardInput {
  name: string;
  description?: string;
  layout?: Record<string, unknown>;
  isDefault?: boolean;
  isPublic?: boolean;
  role?: string;
}

export interface UpdateDashboardInput {
  name?: string;
  description?: string | null;
  layout?: Record<string, unknown>;
  isDefault?: boolean;
  isPublic?: boolean;
  role?: string | null;
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CreateWidgetInput {
  widgetType: string;
  title: string;
  config?: Record<string, unknown>;
  position: WidgetPosition;
  refreshRate?: number;
}

export interface UpdateWidgetInput {
  title?: string;
  config?: Record<string, unknown>;
  position?: WidgetPosition;
  refreshRate?: number;
}

// ============================================================================
// WIDGET DATA FETCHERS
// ============================================================================

async function fetchRevenueToday(userId: string, config: WidgetConfig): Promise<WidgetData> {
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
      status: AppointmentStatusConst.COMPLETED,
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
    },
    _sum: {
      chargeAmount: true,
    },
  });

  return {
    value: Number(result._sum.chargeAmount || 0),
    label: 'Revenue Today',
    format: 'currency',
  };
}

async function fetchMonthlyRevenue(userId: string, config: WidgetConfig): Promise<WidgetData> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const result = await prisma.appointment.aggregate({
    where: {
      appointmentDate: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      status: AppointmentStatusConst.COMPLETED,
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
    },
    _sum: {
      chargeAmount: true,
    },
  });

  const revenue = Number(result._sum.chargeAmount || 0);

  return {
    value: revenue,
    label: 'Monthly Revenue',
    format: 'currency',
  };
}

async function fetchKVR(userId: string, config: WidgetConfig): Promise<WidgetData> {
  const period = config?.period || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  const totalAppointments = await prisma.appointment.count({
    where: {
      appointmentDate: { gte: startDate },
      status: AppointmentStatusConst.COMPLETED,
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
    },
  });

  const signedNotes = await prisma.clinicalNote.count({
    where: {
      signedDate: { gte: startDate },
      status: 'SIGNED',
      appointment: {
        appointmentDate: { gte: startDate },
        status: AppointmentStatusConst.COMPLETED,
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

async function fetchUnsignedNotes(userId: string, config: WidgetConfig): Promise<WidgetData> {
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

async function fetchActiveClients(userId: string, config: WidgetConfig): Promise<WidgetData> {
  const period = config?.period || 90;
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

async function fetchAppointmentsByStatus(userId: string, config: WidgetConfig): Promise<WidgetData> {
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

async function fetchRevenueTrend(userId: string, config: WidgetConfig): Promise<WidgetData> {
  const period = config?.period || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  const appointments = await prisma.appointment.findMany({
    where: {
      appointmentDate: { gte: startDate },
      status: AppointmentStatusConst.COMPLETED,
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

  const revenueByDate = appointments.reduce<RevenueByDate>((acc, apt) => {
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

async function fetchClinicianProductivity(userId: string, config: WidgetConfig): Promise<WidgetData> {
  const period = config?.period || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  const clinicians = await prisma.user.findMany({
    where: {
      roles: { has: UserRoles.CLINICIAN },
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
          status: AppointmentStatusConst.COMPLETED,
        },
      });

      const revenue = await prisma.appointment.aggregate({
        where: {
          clinicianId: clinician.id,
          appointmentDate: { gte: startDate },
          status: AppointmentStatusConst.COMPLETED,
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

async function fetchRecentAppointments(userId: string, config: WidgetConfig): Promise<WidgetData> {
  const limit = config?.limit || 10;

  const appointments = await prisma.appointment.findMany({
    where: {
      ...(config?.clinicianId && { clinicianId: config.clinicianId }),
      ...(config?.status && { status: config.status as AppointmentStatus }),
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
      client: apt.client ? `${apt.client.firstName} ${apt.client.lastName}` : 'Unknown',
      clinician: apt.clinician ? `${apt.clinician.firstName} ${apt.clinician.lastName}` : 'Unknown',
      type: apt.appointmentType,
      status: apt.status,
    })),
  };
}

async function fetchUnsignedNotesList(userId: string, config: WidgetConfig): Promise<WidgetData> {
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

async function fetchComplianceAlerts(userId: string, config: WidgetConfig): Promise<WidgetData> {
  const alerts: Array<{
    type: string;
    severity: string;
    message: string;
    count: number;
  }> = [];

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

  const approachingDeadline = await prisma.clinicalNote.count({
    where: {
      status: { not: 'SIGNED' },
      dueDate: {
        gte: new Date(),
        lt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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

  const completedWithoutNotes = await prisma.appointment.count({
    where: {
      status: AppointmentStatusConst.COMPLETED,
      appointmentDate: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
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

async function fetchThresholdAlerts(userId: string, config: WidgetConfig): Promise<WidgetData> {
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

async function fetchCapacityUtilization(userId: string, config: WidgetConfig): Promise<WidgetData> {
  const period = config?.period || 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  const clinicianCount = await prisma.user.count({
    where: {
      roles: { has: UserRoles.CLINICIAN },
      ...(config?.clinicianId && { id: config.clinicianId }),
    },
  });

  const totalAvailableHours = clinicianCount * period * 8;

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

async function fetchRevenueVsTarget(userId: string, config: WidgetConfig): Promise<WidgetData> {
  const period = config?.period || 30;
  const target = config?.target || 100000;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  const result = await prisma.appointment.aggregate({
    where: {
      appointmentDate: { gte: startDate },
      status: AppointmentStatusConst.COMPLETED,
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

async function fetchNoShowRate(userId: string, config: WidgetConfig): Promise<WidgetData> {
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
      status: AppointmentStatusConst.NO_SHOW,
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

async function fetchAverageSessionDuration(userId: string, config: WidgetConfig): Promise<WidgetData> {
  const period = config?.period || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  const result = await prisma.appointment.aggregate({
    where: {
      appointmentDate: { gte: startDate },
      status: AppointmentStatusConst.COMPLETED,
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

async function fetchWaitlistSummary(userId: string, config: WidgetConfig): Promise<WidgetData> {
  const total = await prisma.waitlistEntry.count({
    where: {
      status: 'ACTIVE',
      ...(config?.appointmentType && { appointmentType: config.appointmentType }),
    },
  });

  const urgent = await prisma.waitlistEntry.count({
    where: {
      status: 'ACTIVE',
      priority: { gte: 8 },
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

type WidgetDataFetcher = (userId: string, config: WidgetConfig) => Promise<WidgetData>;

const widgetDataFetchers: Record<string, WidgetDataFetcher> = {
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
// DASHBOARD SERVICE CLASS
// ============================================================================

class DashboardService {
  /**
   * Create a new dashboard
   */
  async createDashboard(input: CreateDashboardInput, userId: string) {
    // If isDefault is true, unset other defaults for this user
    if (input.isDefault) {
      await prisma.dashboard.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const dashboard = await prisma.dashboard.create({
      data: {
        name: input.name,
        description: input.description,
        layout: (input.layout || {}) as Prisma.InputJsonValue,
        isDefault: input.isDefault ?? false,
        isPublic: input.isPublic ?? false,
        role: input.role,
        userId,
      },
      include: {
        widgets: true,
      },
    });

    logger.info(`Dashboard created: ${dashboard.id} by user ${userId}`);

    return dashboard;
  }

  /**
   * Get all dashboards accessible by user
   */
  async getDashboards(user: AuthUser) {
    const dashboards = await prisma.dashboard.findMany({
      where: {
        OR: [
          { userId: user.userId },
          { isPublic: true },
          ...(user.roles && user.roles.length > 0 ? user.roles.map((r) => ({ role: r })) : []),
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
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });

    return { dashboards, count: dashboards.length };
  }

  /**
   * Get dashboard by ID with access check
   */
  async getDashboardById(id: string, user: AuthUser) {
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
      throw new NotFoundError('Dashboard');
    }

    // Check access: owner, public, or role-based
    const hasAccess =
      dashboard.userId === user.userId ||
      dashboard.isPublic ||
      (dashboard.role && user.roles && user.roles.includes(dashboard.role));

    if (!hasAccess) {
      throw new ForbiddenError('Access denied to this dashboard');
    }

    return dashboard;
  }

  /**
   * Update a dashboard
   */
  async updateDashboard(id: string, input: UpdateDashboardInput, userId: string) {
    const existingDashboard = await prisma.dashboard.findUnique({
      where: { id },
    });

    if (!existingDashboard) {
      throw new NotFoundError('Dashboard');
    }

    if (existingDashboard.userId !== userId) {
      throw new ForbiddenError('You can only update your own dashboards');
    }

    // If setting as default, unset other defaults
    if (input.isDefault) {
      await prisma.dashboard.updateMany({
        where: {
          userId,
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
      data: {
        ...input,
        layout: input.layout as Prisma.InputJsonValue | undefined,
      },
      include: {
        widgets: true,
      },
    });

    logger.info(`Dashboard updated: ${dashboard.id} by user ${userId}`);

    return dashboard;
  }

  /**
   * Delete a dashboard
   */
  async deleteDashboard(id: string, userId: string) {
    const existingDashboard = await prisma.dashboard.findUnique({
      where: { id },
    });

    if (!existingDashboard) {
      throw new NotFoundError('Dashboard');
    }

    if (existingDashboard.userId !== userId) {
      throw new ForbiddenError('You can only delete your own dashboards');
    }

    await prisma.dashboard.delete({
      where: { id },
    });

    logger.info(`Dashboard deleted: ${id} by user ${userId}`);

    return { message: 'Dashboard deleted successfully' };
  }

  /**
   * Add a widget to a dashboard
   */
  async addWidget(dashboardId: string, input: CreateWidgetInput, userId: string) {
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
    });

    if (!dashboard) {
      throw new NotFoundError('Dashboard');
    }

    if (dashboard.userId !== userId) {
      throw new ForbiddenError('You can only add widgets to your own dashboards');
    }

    const widget = await prisma.widget.create({
      data: {
        widgetType: input.widgetType,
        title: input.title,
        config: (input.config || {}) as Prisma.InputJsonValue,
        position: input.position as unknown as Prisma.InputJsonValue,
        refreshRate: input.refreshRate ?? 60,
        dashboardId,
      },
    });

    logger.info(`Widget added: ${widget.id} to dashboard ${dashboardId} by user ${userId}`);

    return widget;
  }

  /**
   * Update a widget
   */
  async updateWidget(widgetId: string, input: UpdateWidgetInput, userId: string) {
    const widget = await prisma.widget.findUnique({
      where: { id: widgetId },
      include: {
        dashboard: true,
      },
    });

    if (!widget) {
      throw new NotFoundError('Widget');
    }

    if (widget.dashboard.userId !== userId) {
      throw new ForbiddenError('You can only update widgets on your own dashboards');
    }

    const updatedWidget = await prisma.widget.update({
      where: { id: widgetId },
      data: {
        ...input,
        config: input.config as Prisma.InputJsonValue | undefined,
        position: input.position as Prisma.InputJsonValue | undefined,
      },
    });

    logger.info(`Widget updated: ${widgetId} by user ${userId}`);

    return updatedWidget;
  }

  /**
   * Delete a widget
   */
  async deleteWidget(widgetId: string, userId: string) {
    const widget = await prisma.widget.findUnique({
      where: { id: widgetId },
      include: {
        dashboard: true,
      },
    });

    if (!widget) {
      throw new NotFoundError('Widget');
    }

    if (widget.dashboard.userId !== userId) {
      throw new ForbiddenError('You can only delete widgets from your own dashboards');
    }

    await prisma.widget.delete({
      where: { id: widgetId },
    });

    logger.info(`Widget deleted: ${widgetId} by user ${userId}`);

    return { message: 'Widget deleted successfully' };
  }

  /**
   * Get real-time data for all widgets in a dashboard
   */
  async getDashboardData(dashboardId: string, user: AuthUser) {
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
      include: {
        widgets: true,
      },
    });

    if (!dashboard) {
      throw new NotFoundError('Dashboard');
    }

    const hasAccess =
      dashboard.userId === user.userId ||
      dashboard.isPublic ||
      (dashboard.role && user.roles && user.roles.includes(dashboard.role));

    if (!hasAccess) {
      throw new ForbiddenError('Access denied to this dashboard');
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

        const data = await fetcher(user.userId, widget.config as WidgetConfig);
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

    return {
      dashboardId: dashboard.id,
      dashboardName: dashboard.name,
      widgets: widgetData,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get widget data fetcher by type (for single widget refresh)
   */
  getWidgetDataFetcher(widgetType: string): WidgetDataFetcher | undefined {
    return widgetDataFetchers[widgetType];
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
