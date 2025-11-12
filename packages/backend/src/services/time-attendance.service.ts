import { PrismaClient, AbsenceType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export interface CreateTimeAttendanceDto {
  userId: string;
  date: Date;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: Date;
  actualEnd?: Date;
  breakMinutes?: number;
  isAbsent?: boolean;
  absenceType?: AbsenceType;
  absenceReason?: string;
  notes?: string;
}

export interface UpdateTimeAttendanceDto {
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: Date;
  actualEnd?: Date;
  breakMinutes?: number;
  isAbsent?: boolean;
  absenceType?: AbsenceType;
  absenceReason?: string;
  notes?: string;
}

export interface ClockInDto {
  userId: string;
  actualStart: Date;
}

export interface ClockOutDto {
  userId: string;
  actualEnd: Date;
  breakMinutes?: number;
}

export interface ApproveAttendanceDto {
  approvedById: string;
}

class TimeAttendanceService {
  /**
   * Calculate total hours and overtime
   */
  private calculateHours(actualStart: Date, actualEnd: Date, breakMinutes: number = 0): {
    totalHours: Decimal;
    overtimeHours: Decimal;
  } {
    const milliseconds = actualEnd.getTime() - actualStart.getTime();
    const totalMinutes = Math.floor(milliseconds / (1000 * 60)) - breakMinutes;
    const totalHours = new Decimal(totalMinutes).div(60);

    // Calculate overtime (hours over 8 per day)
    const regularHours = new Decimal(8);
    const overtimeHours = totalHours.greaterThan(regularHours)
      ? totalHours.minus(regularHours)
      : new Decimal(0);

    return {
      totalHours,
      overtimeHours,
    };
  }

  /**
   * Create a time attendance record
   */
  async createRecord(data: CreateTimeAttendanceDto) {
    // Check if record already exists for this user and date
    const existingRecord = await prisma.timeAttendance.findUnique({
      where: {
        userId_date: {
          userId: data.userId,
          date: new Date(data.date.toISOString().split('T')[0]),
        },
      },
    });

    if (existingRecord) {
      throw new Error('Attendance record already exists for this date');
    }

    let totalHours: Decimal | null = null;
    let overtimeHours: Decimal | null = null;

    // Calculate hours if both actualStart and actualEnd are provided
    if (data.actualStart && data.actualEnd) {
      const hours = this.calculateHours(
        data.actualStart,
        data.actualEnd,
        data.breakMinutes || 0
      );
      totalHours = hours.totalHours;
      overtimeHours = hours.overtimeHours;
    }

    const record = await prisma.timeAttendance.create({
      data: {
        userId: data.userId,
        date: new Date(data.date.toISOString().split('T')[0]),
        scheduledStart: data.scheduledStart,
        scheduledEnd: data.scheduledEnd,
        actualStart: data.actualStart,
        actualEnd: data.actualEnd,
        breakMinutes: data.breakMinutes,
        totalHours,
        overtimeHours,
        isAbsent: data.isAbsent || false,
        absenceType: data.absenceType,
        absenceReason: data.absenceReason,
        notes: data.notes,
      },
      include: {
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

    return record;
  }

  /**
   * Clock in (start time)
   */
  async clockIn(data: ClockInDto) {
    const today = new Date(data.actualStart.toISOString().split('T')[0]);

    // Check if already clocked in today
    const existingRecord = await prisma.timeAttendance.findUnique({
      where: {
        userId_date: {
          userId: data.userId,
          date: today,
        },
      },
    });

    if (existingRecord && existingRecord.actualStart) {
      throw new Error('Already clocked in today');
    }

    // Create or update record
    const record = existingRecord
      ? await prisma.timeAttendance.update({
          where: { id: existingRecord.id },
          data: {
            actualStart: data.actualStart,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        })
      : await prisma.timeAttendance.create({
          data: {
            userId: data.userId,
            date: today,
            actualStart: data.actualStart,
          },
          include: {
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

    return record;
  }

  /**
   * Clock out (end time)
   */
  async clockOut(data: ClockOutDto) {
    const today = new Date(data.actualEnd.toISOString().split('T')[0]);

    const record = await prisma.timeAttendance.findUnique({
      where: {
        userId_date: {
          userId: data.userId,
          date: today,
        },
      },
    });

    if (!record) {
      throw new Error('No clock-in record found for today');
    }

    if (!record.actualStart) {
      throw new Error('Must clock in before clocking out');
    }

    if (record.actualEnd) {
      throw new Error('Already clocked out today');
    }

    // Calculate hours
    const hours = this.calculateHours(
      record.actualStart,
      data.actualEnd,
      data.breakMinutes || 0
    );

    const updatedRecord = await prisma.timeAttendance.update({
      where: { id: record.id },
      data: {
        actualEnd: data.actualEnd,
        breakMinutes: data.breakMinutes,
        totalHours: hours.totalHours,
        overtimeHours: hours.overtimeHours,
      },
      include: {
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

    return updatedRecord;
  }

  /**
   * Get all attendance records with filters
   */
  async getAllRecords(filters?: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    isAbsent?: boolean;
    absenceType?: AbsenceType;
    approved?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.TimeAttendanceWhereInput = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    if (filters?.isAbsent !== undefined) {
      where.isAbsent = filters.isAbsent;
    }

    if (filters?.absenceType) {
      where.absenceType = filters.absenceType;
    }

    if (filters?.approved !== undefined) {
      if (filters.approved) {
        where.approvedById = { not: null };
      } else {
        where.approvedById = null;
      }
    }

    const [records, total] = await Promise.all([
      prisma.timeAttendance.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.timeAttendance.count({ where }),
    ]);

    return {
      records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single attendance record by ID
   */
  async getRecordById(id: string) {
    const record = await prisma.timeAttendance.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!record) {
      throw new Error('Attendance record not found');
    }

    return record;
  }

  /**
   * Update an attendance record
   */
  async updateRecord(id: string, data: UpdateTimeAttendanceDto) {
    const record = await prisma.timeAttendance.findUnique({
      where: { id },
    });

    if (!record) {
      throw new Error('Attendance record not found');
    }

    const updateData: Prisma.TimeAttendanceUpdateInput = {};

    if (data.scheduledStart !== undefined) updateData.scheduledStart = data.scheduledStart;
    if (data.scheduledEnd !== undefined) updateData.scheduledEnd = data.scheduledEnd;
    if (data.actualStart !== undefined) updateData.actualStart = data.actualStart;
    if (data.actualEnd !== undefined) updateData.actualEnd = data.actualEnd;
    if (data.breakMinutes !== undefined) updateData.breakMinutes = data.breakMinutes;
    if (data.isAbsent !== undefined) updateData.isAbsent = data.isAbsent;
    if (data.absenceType !== undefined) updateData.absenceType = data.absenceType;
    if (data.absenceReason !== undefined) updateData.absenceReason = data.absenceReason;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Recalculate hours if actualStart or actualEnd changed
    const actualStart = data.actualStart || record.actualStart;
    const actualEnd = data.actualEnd || record.actualEnd;
    const breakMinutes = data.breakMinutes !== undefined ? data.breakMinutes : record.breakMinutes;

    if (actualStart && actualEnd) {
      const hours = this.calculateHours(actualStart, actualEnd, breakMinutes || 0);
      updateData.totalHours = hours.totalHours;
      updateData.overtimeHours = hours.overtimeHours;
    }

    const updatedRecord = await prisma.timeAttendance.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updatedRecord;
  }

  /**
   * Approve an attendance record
   */
  async approveRecord(id: string, data: ApproveAttendanceDto) {
    const record = await prisma.timeAttendance.update({
      where: { id },
      data: {
        approvedById: data.approvedById,
        approvalDate: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return record;
  }

  /**
   * Delete an attendance record
   */
  async deleteRecord(id: string) {
    await prisma.timeAttendance.delete({
      where: { id },
    });

    return { message: 'Attendance record deleted successfully' };
  }

  /**
   * Get attendance summary for a user
   */
  async getUserAttendanceSummary(userId: string, startDate: Date, endDate: Date) {
    const records = await prisma.timeAttendance.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalDays = records.length;
    const daysPresent = records.filter(r => !r.isAbsent && r.actualStart).length;
    const daysAbsent = records.filter(r => r.isAbsent).length;
    const daysNotClocked = records.filter(r => !r.isAbsent && !r.actualStart).length;

    const totalHoursWorked = records
      .filter(r => r.totalHours)
      .reduce((sum, r) => sum.add(r.totalHours || new Decimal(0)), new Decimal(0));

    const totalOvertimeHours = records
      .filter(r => r.overtimeHours)
      .reduce((sum, r) => sum.add(r.overtimeHours || new Decimal(0)), new Decimal(0));

    const absenceBreakdown: { [key: string]: number } = {};
    records.filter(r => r.isAbsent && r.absenceType).forEach(r => {
      const type = r.absenceType as string;
      absenceBreakdown[type] = (absenceBreakdown[type] || 0) + 1;
    });

    return {
      userId,
      startDate,
      endDate,
      totalDays,
      daysPresent,
      daysAbsent,
      daysNotClocked,
      totalHoursWorked: totalHoursWorked.toNumber(),
      totalOvertimeHours: totalOvertimeHours.toNumber(),
      absenceBreakdown,
    };
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals() {
    const records = await prisma.timeAttendance.findMany({
      where: {
        approvedById: null,
        OR: [
          { actualStart: { not: null } },
          { isAbsent: true },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return records;
  }

  /**
   * Bulk approve attendance records
   */
  async bulkApprove(recordIds: string[], approvedById: string) {
    const result = await prisma.timeAttendance.updateMany({
      where: {
        id: { in: recordIds },
      },
      data: {
        approvedById,
        approvalDate: new Date(),
      },
    });

    return {
      message: `${result.count} attendance records approved successfully`,
      count: result.count,
    };
  }

  /**
   * Get attendance statistics
   */
  async getAttendanceStatistics(filters?: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: Prisma.TimeAttendanceWhereInput = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    const records = await prisma.timeAttendance.findMany({
      where,
    });

    const totalRecords = records.length;
    const totalAbsences = records.filter(r => r.isAbsent).length;
    const totalPresent = records.filter(r => !r.isAbsent && r.actualStart).length;
    const attendanceRate = totalRecords > 0
      ? Math.round((totalPresent / totalRecords) * 100)
      : 0;

    const totalHours = records
      .filter(r => r.totalHours)
      .reduce((sum, r) => sum.add(r.totalHours || new Decimal(0)), new Decimal(0));

    const totalOvertime = records
      .filter(r => r.overtimeHours)
      .reduce((sum, r) => sum.add(r.overtimeHours || new Decimal(0)), new Decimal(0));

    return {
      totalRecords,
      totalAbsences,
      totalPresent,
      attendanceRate,
      totalHours: totalHours.toNumber(),
      totalOvertime: totalOvertime.toNumber(),
    };
  }
}

export default new TimeAttendanceService();
