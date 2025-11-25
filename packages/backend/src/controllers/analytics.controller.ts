import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get provider utilization rates
 * Calculates how effectively each provider's time is being used
 */
export const getProviderUtilization = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, providerId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Build where clause
    const whereClause: any = {
      appointmentDate: {
        gte: start,
        lte: end,
      },
    };

    if (providerId) {
      whereClause.clinicianId = providerId;
    }

    // Get all appointments in date range
    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
    });

    // Calculate utilization by provider
    const providerStats = new Map<string, any>();

    for (const appt of appointments) {
      if (!appt.clinicianId) continue;

      if (!providerStats.has(appt.clinicianId)) {
        providerStats.set(appt.clinicianId, {
          providerId: appt.clinicianId,
          providerName: `${appt.clinician?.firstName} ${appt.clinician?.lastName}`,
          title: appt.clinician?.title,
          totalAppointments: 0,
          completedAppointments: 0,
          cancelledAppointments: 0,
          noShowAppointments: 0,
          totalScheduledMinutes: 0,
          totalBillableMinutes: 0,
        });
      }

      const stats = providerStats.get(appt.clinicianId);
      stats.totalAppointments++;
      stats.totalScheduledMinutes += appt.duration || 0;

      if (appt.status === 'COMPLETED') {
        stats.completedAppointments++;
        stats.totalBillableMinutes += appt.duration || 0;
      } else if (appt.status === 'CANCELLED') {
        stats.cancelledAppointments++;
      } else if (appt.status === 'NO_SHOW') {
        stats.noShowAppointments++;
      }
    }

    // Calculate working days and hours
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const workingDays = Math.floor((daysDiff * 5) / 7); // Rough estimate of working days
    const availableMinutesPerDay = 8 * 60; // 8 hour workday
    const totalAvailableMinutes = workingDays * availableMinutesPerDay;

    // Calculate utilization rates
    const utilizationData = Array.from(providerStats.values()).map((stats) => ({
      ...stats,
      utilizationRate: totalAvailableMinutes > 0
        ? Math.round((stats.totalScheduledMinutes / totalAvailableMinutes) * 100)
        : 0,
      completionRate: stats.totalAppointments > 0
        ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100)
        : 0,
      cancellationRate: stats.totalAppointments > 0
        ? Math.round((stats.cancelledAppointments / stats.totalAppointments) * 100)
        : 0,
      noShowRate: stats.totalAppointments > 0
        ? Math.round((stats.noShowAppointments / stats.totalAppointments) * 100)
        : 0,
    }));

    res.json({
      success: true,
      data: {
        dateRange: { start: startDate, end: endDate },
        providers: utilizationData,
        summary: {
          totalProviders: utilizationData.length,
          averageUtilization: utilizationData.length > 0
            ? Math.round(utilizationData.reduce((sum, p) => sum + p.utilizationRate, 0) / utilizationData.length)
            : 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting provider utilization:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get provider utilization',
    });
  }
};

/**
 * Get no-show rates analysis
 * Breakdown by provider, appointment type, day of week, and time of day
 */
export const getNoShowRates = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Get all appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Overall stats
    const totalAppointments = appointments.length;
    const noShows = appointments.filter((a) => a.status === 'NO_SHOW');
    const noShowCount = noShows.length;
    const overallNoShowRate = totalAppointments > 0
      ? Math.round((noShowCount / totalAppointments) * 100)
      : 0;

    // By provider
    const byProvider = new Map<string, { total: number; noShows: number; name: string }>();
    for (const appt of appointments) {
      if (!appt.clinicianId) continue;

      if (!byProvider.has(appt.clinicianId)) {
        byProvider.set(appt.clinicianId, {
          total: 0,
          noShows: 0,
          name: `${appt.clinician?.firstName} ${appt.clinician?.lastName}`,
        });
      }

      const stats = byProvider.get(appt.clinicianId)!;
      stats.total++;
      if (appt.status === 'NO_SHOW') stats.noShows++;
    }

    const providerStats = Array.from(byProvider.entries()).map(([id, stats]) => ({
      providerId: id,
      providerName: stats.name,
      totalAppointments: stats.total,
      noShows: stats.noShows,
      noShowRate: stats.total > 0 ? Math.round((stats.noShows / stats.total) * 100) : 0,
    }));

    // By appointment type
    const byType = new Map<string, { total: number; noShows: number }>();
    for (const appt of appointments) {
      const type = appt.appointmentType || 'Unknown';
      if (!byType.has(type)) {
        byType.set(type, { total: 0, noShows: 0 });
      }

      const stats = byType.get(type)!;
      stats.total++;
      if (appt.status === 'NO_SHOW') stats.noShows++;
    }

    const typeStats = Array.from(byType.entries()).map(([type, stats]) => ({
      appointmentType: type,
      totalAppointments: stats.total,
      noShows: stats.noShows,
      noShowRate: stats.total > 0 ? Math.round((stats.noShows / stats.total) * 100) : 0,
    }));

    // By day of week
    const byDayOfWeek = new Map<number, { total: number; noShows: number }>();
    for (const appt of appointments) {
      const dayOfWeek = new Date(appt.appointmentDate).getDay();
      if (!byDayOfWeek.has(dayOfWeek)) {
        byDayOfWeek.set(dayOfWeek, { total: 0, noShows: 0 });
      }

      const stats = byDayOfWeek.get(dayOfWeek)!;
      stats.total++;
      if (appt.status === 'NO_SHOW') stats.noShows++;
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeekStats = Array.from(byDayOfWeek.entries())
      .map(([day, stats]) => ({
        dayOfWeek: dayNames[day],
        totalAppointments: stats.total,
        noShows: stats.noShows,
        noShowRate: stats.total > 0 ? Math.round((stats.noShows / stats.total) * 100) : 0,
      }))
      .sort((a, b) => {
        const aIndex = dayNames.indexOf(a.dayOfWeek);
        const bIndex = dayNames.indexOf(b.dayOfWeek);
        return aIndex - bIndex;
      });

    // By time of day (morning, afternoon, evening)
    const byTimeOfDay = new Map<string, { total: number; noShows: number }>();
    for (const appt of appointments) {
      const hour = parseInt(appt.startTime.split(':')[0]);
      let timeOfDay = 'Morning'; // 6-12
      if (hour >= 12 && hour < 17) timeOfDay = 'Afternoon'; // 12-5
      else if (hour >= 17) timeOfDay = 'Evening'; // 5+

      if (!byTimeOfDay.has(timeOfDay)) {
        byTimeOfDay.set(timeOfDay, { total: 0, noShows: 0 });
      }

      const stats = byTimeOfDay.get(timeOfDay)!;
      stats.total++;
      if (appt.status === 'NO_SHOW') stats.noShows++;
    }

    const timeOfDayStats = Array.from(byTimeOfDay.entries()).map(([timeOfDay, stats]) => ({
      timeOfDay,
      totalAppointments: stats.total,
      noShows: stats.noShows,
      noShowRate: stats.total > 0 ? Math.round((stats.noShows / stats.total) * 100) : 0,
    }));

    res.json({
      success: true,
      data: {
        dateRange: { start: startDate, end: endDate },
        overall: {
          totalAppointments,
          noShows: noShowCount,
          noShowRate: overallNoShowRate,
        },
        byProvider: providerStats,
        byAppointmentType: typeStats,
        byDayOfWeek: dayOfWeekStats,
        byTimeOfDay: timeOfDayStats,
      },
    });
  } catch (error: any) {
    console.error('Error getting no-show rates:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get no-show rates',
    });
  }
};

/**
 * Get revenue per hour analysis
 */
export const getRevenueAnalysis = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, providerId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const whereClause: any = {
      appointmentDate: {
        gte: start,
        lte: end,
      },
      status: 'COMPLETED',
    };

    if (providerId) {
      whereClause.clinicianId = providerId;
    }

    // Get completed appointments
    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Calculate revenue by provider
    const providerRevenue = new Map<string, any>();

    for (const appt of appointments) {
      if (!appt.clinicianId) continue;

      if (!providerRevenue.has(appt.clinicianId)) {
        providerRevenue.set(appt.clinicianId, {
          providerId: appt.clinicianId,
          providerName: `${appt.clinician?.firstName} ${appt.clinician?.lastName}`,
          totalHours: 0,
          totalRevenue: 0,
          appointmentCount: 0,
        });
      }

      const stats = providerRevenue.get(appt.clinicianId);
      const hours = (appt.duration || 0) / 60;
      const revenue = Number(appt.chargeAmount) || 0;

      stats.totalHours += hours;
      stats.totalRevenue += revenue;
      stats.appointmentCount++;
    }

    // Calculate per-hour metrics
    const revenueData = Array.from(providerRevenue.values()).map((stats) => ({
      ...stats,
      revenuePerHour: stats.totalHours > 0
        ? Math.round(stats.totalRevenue / stats.totalHours)
        : 0,
      averageAppointmentFee: stats.appointmentCount > 0
        ? Math.round(stats.totalRevenue / stats.appointmentCount)
        : 0,
    }));

    // Overall totals
    const totalRevenue = revenueData.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalHours = revenueData.reduce((sum, p) => sum + p.totalHours, 0);
    const totalAppointments = revenueData.reduce((sum, p) => sum + p.appointmentCount, 0);

    res.json({
      success: true,
      data: {
        dateRange: { start: startDate, end: endDate },
        providers: revenueData,
        summary: {
          totalRevenue: Math.round(totalRevenue),
          totalHours: Math.round(totalHours * 10) / 10,
          totalAppointments,
          averageRevenuePerHour: totalHours > 0 ? Math.round(totalRevenue / totalHours) : 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting revenue analysis:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get revenue analysis',
    });
  }
};

/**
 * Get cancellation pattern analysis
 */
export const getCancellationPatterns = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Get all appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const totalAppointments = appointments.length;
    const cancelled = appointments.filter((a) => a.status === 'CANCELLED');
    const cancelledCount = cancelled.length;
    const overallCancellationRate = totalAppointments > 0
      ? Math.round((cancelledCount / totalAppointments) * 100)
      : 0;

    // By cancellation reason
    const byReason = new Map<string, number>();
    for (const appt of cancelled) {
      const reason = appt.cancellationReason || 'Not specified';
      byReason.set(reason, (byReason.get(reason) || 0) + 1);
    }

    const reasonStats = Array.from(byReason.entries())
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: cancelledCount > 0 ? Math.round((count / cancelledCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // By provider
    const byProvider = new Map<string, { total: number; cancelled: number; name: string }>();
    for (const appt of appointments) {
      if (!appt.clinicianId) continue;

      if (!byProvider.has(appt.clinicianId)) {
        byProvider.set(appt.clinicianId, {
          total: 0,
          cancelled: 0,
          name: `${appt.clinician?.firstName} ${appt.clinician?.lastName}`,
        });
      }

      const stats = byProvider.get(appt.clinicianId)!;
      stats.total++;
      if (appt.status === 'CANCELLED') stats.cancelled++;
    }

    const providerStats = Array.from(byProvider.entries()).map(([id, stats]) => ({
      providerId: id,
      providerName: stats.name,
      totalAppointments: stats.total,
      cancelled: stats.cancelled,
      cancellationRate: stats.total > 0 ? Math.round((stats.cancelled / stats.total) * 100) : 0,
    }));

    // Cancellation timing (how far in advance)
    const cancelledWithDate = cancelled.filter((a) => a.cancellationDate);
    const timingBuckets = {
      'Same day': 0,
      '1-3 days': 0,
      '4-7 days': 0,
      '1-2 weeks': 0,
      '2+ weeks': 0,
    };

    for (const appt of cancelledWithDate) {
      if (!appt.cancellationDate) continue;

      const apptDate = new Date(appt.appointmentDate);
      const cancelDate = new Date(appt.cancellationDate);
      const daysDiff = Math.ceil((apptDate.getTime() - cancelDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 0) timingBuckets['Same day']++;
      else if (daysDiff <= 3) timingBuckets['1-3 days']++;
      else if (daysDiff <= 7) timingBuckets['4-7 days']++;
      else if (daysDiff <= 14) timingBuckets['1-2 weeks']++;
      else timingBuckets['2+ weeks']++;
    }

    const timingStats = Object.entries(timingBuckets).map(([timing, count]) => ({
      timing,
      count,
      percentage: cancelledWithDate.length > 0
        ? Math.round((count / cancelledWithDate.length) * 100)
        : 0,
    }));

    res.json({
      success: true,
      data: {
        dateRange: { start: startDate, end: endDate },
        overall: {
          totalAppointments,
          cancelled: cancelledCount,
          cancellationRate: overallCancellationRate,
        },
        byReason: reasonStats,
        byProvider: providerStats,
        byTiming: timingStats,
      },
    });
  } catch (error: any) {
    console.error('Error getting cancellation patterns:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get cancellation patterns',
    });
  }
};

/**
 * Get capacity planning projections
 */
export const getCapacityPlanning = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Get all appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Get unique providers
    const providerIds = [...new Set(appointments.map((a) => a.clinicianId).filter(Boolean))];

    // Calculate working days
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const workingDays = Math.floor((daysDiff * 5) / 7);
    const availableHoursPerDay = 8;
    const totalAvailableHours = workingDays * availableHoursPerDay * providerIds.length;

    // Calculate used hours
    const usedMinutes = appointments
      .filter((a) => a.status !== 'CANCELLED')
      .reduce((sum, a) => sum + (a.duration || 0), 0);
    const usedHours = usedMinutes / 60;

    // Calculate by provider
    const providerCapacity = new Map<string, any>();

    for (const appt of appointments) {
      if (!appt.clinicianId || appt.status === 'CANCELLED') continue;

      if (!providerCapacity.has(appt.clinicianId)) {
        providerCapacity.set(appt.clinicianId, {
          providerId: appt.clinicianId,
          providerName: `${appt.clinician?.firstName} ${appt.clinician?.lastName}`,
          scheduledMinutes: 0,
          appointmentCount: 0,
        });
      }

      const stats = providerCapacity.get(appt.clinicianId);
      stats.scheduledMinutes += appt.duration || 0;
      stats.appointmentCount++;
    }

    const providerAvailableHours = workingDays * availableHoursPerDay;
    const capacityByProvider = Array.from(providerCapacity.values()).map((stats) => ({
      ...stats,
      scheduledHours: Math.round((stats.scheduledMinutes / 60) * 10) / 10,
      availableHours: providerAvailableHours,
      utilizationRate: Math.round((stats.scheduledMinutes / (providerAvailableHours * 60)) * 100),
      remainingHours: Math.round((providerAvailableHours - stats.scheduledMinutes / 60) * 10) / 10,
    }));

    // Overall capacity
    const overallUtilization = totalAvailableHours > 0
      ? Math.round((usedHours / totalAvailableHours) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        dateRange: { start: startDate, end: endDate },
        overall: {
          totalProviders: providerIds.length,
          workingDays,
          totalAvailableHours: Math.round(totalAvailableHours),
          scheduledHours: Math.round(usedHours * 10) / 10,
          remainingHours: Math.round((totalAvailableHours - usedHours) * 10) / 10,
          utilizationRate: overallUtilization,
          capacityStatus:
            overallUtilization > 85 ? 'High' : overallUtilization > 65 ? 'Medium' : 'Low',
        },
        byProvider: capacityByProvider,
      },
    });
  } catch (error: any) {
    console.error('Error getting capacity planning:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get capacity planning',
    });
  }
};
