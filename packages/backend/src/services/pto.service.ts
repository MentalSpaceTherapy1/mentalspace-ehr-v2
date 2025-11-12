import { PrismaClient, PTOStatus, AbsenceType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export interface CreatePTORequestDto {
  userId: string;
  requestType: AbsenceType;
  startDate: Date;
  endDate: Date;
  reason?: string;
  coverageNotes?: string;
}

export interface UpdatePTORequestDto {
  requestType?: AbsenceType;
  startDate?: Date;
  endDate?: Date;
  reason?: string;
  coverageNotes?: string;
}

export interface ApprovePTORequestDto {
  approvedById: string;
  approvalNotes?: string;
}

export interface DenyPTORequestDto {
  approvedById: string;
  approvalNotes: string;
}

export interface UpdatePTOBalanceDto {
  ptoBalance?: number;
  sickBalance?: number;
  vacationBalance?: number;
  ptoAnnual?: number;
  sickAnnual?: number;
  vacationAnnual?: number;
  accrualRate?: number;
}

class PTOService {
  /**
   * Calculate business days between two dates (excluding weekends)
   */
  private calculateBusinessDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const curDate = new Date(startDate);

    while (curDate <= endDate) {
      const dayOfWeek = curDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        count++;
      }
      curDate.setDate(curDate.getDate() + 1);
    }

    return count;
  }

  /**
   * Create a new PTO request
   */
  async createRequest(data: CreatePTORequestDto) {
    // Validate dates
    if (data.startDate > data.endDate) {
      throw new Error('Start date must be before end date');
    }

    // Calculate total days
    const totalDays = this.calculateBusinessDays(data.startDate, data.endDate);

    // Check if user has sufficient balance
    const balance = await this.getBalance(data.userId);

    let availableBalance = new Decimal(0);
    switch (data.requestType) {
      case AbsenceType.PTO:
        availableBalance = balance.ptoBalance;
        break;
      case AbsenceType.SICK:
        availableBalance = balance.sickBalance;
        break;
      case AbsenceType.VACATION:
        availableBalance = balance.vacationBalance;
        break;
      default:
        // For other types (FMLA, BEREAVEMENT, etc.), no balance check
        availableBalance = new Decimal(totalDays);
    }

    if (availableBalance.lessThan(new Decimal(totalDays)) &&
        [AbsenceType.PTO, AbsenceType.SICK, AbsenceType.VACATION].includes(data.requestType)) {
      throw new Error(`Insufficient ${data.requestType} balance. Available: ${availableBalance.toNumber()} days, Requested: ${totalDays} days`);
    }

    const request = await prisma.pTORequest.create({
      data: {
        userId: data.userId,
        requestType: data.requestType,
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays: new Decimal(totalDays),
        reason: data.reason,
        coverageNotes: data.coverageNotes,
        status: PTOStatus.PENDING,
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

    return request;
  }

  /**
   * Get all PTO requests with filters
   */
  async getAllRequests(filters?: {
    userId?: string;
    status?: PTOStatus;
    requestType?: AbsenceType;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.PTORequestWhereInput = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.requestType) {
      where.requestType = filters.requestType;
    }

    if (filters?.startDate || filters?.endDate) {
      where.startDate = {};
      if (filters.startDate) {
        where.startDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.startDate.lte = filters.endDate;
      }
    }

    const [requests, total] = await Promise.all([
      prisma.pTORequest.findMany({
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
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pTORequest.count({ where }),
    ]);

    return {
      requests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single PTO request by ID
   */
  async getRequestById(id: string) {
    const request = await prisma.pTORequest.findUnique({
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

    if (!request) {
      throw new Error('PTO request not found');
    }

    return request;
  }

  /**
   * Update a PTO request
   */
  async updateRequest(id: string, data: UpdatePTORequestDto) {
    const request = await prisma.pTORequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new Error('PTO request not found');
    }

    if (request.status !== PTOStatus.PENDING) {
      throw new Error('Can only update pending requests');
    }

    const updateData: Prisma.PTORequestUpdateInput = {};

    if (data.requestType) updateData.requestType = data.requestType;
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.coverageNotes !== undefined) updateData.coverageNotes = data.coverageNotes;

    // Recalculate totalDays if dates changed
    const startDate = data.startDate || request.startDate;
    const endDate = data.endDate || request.endDate;

    if (data.startDate || data.endDate) {
      if (startDate > endDate) {
        throw new Error('Start date must be before end date');
      }
      const totalDays = this.calculateBusinessDays(startDate, endDate);
      updateData.totalDays = new Decimal(totalDays);
    }

    if (data.startDate) updateData.startDate = data.startDate;
    if (data.endDate) updateData.endDate = data.endDate;

    const updatedRequest = await prisma.pTORequest.update({
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
      },
    });

    return updatedRequest;
  }

  /**
   * Approve a PTO request
   */
  async approveRequest(id: string, data: ApprovePTORequestDto) {
    const request = await prisma.pTORequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new Error('PTO request not found');
    }

    if (request.status !== PTOStatus.PENDING) {
      throw new Error('Request is not pending approval');
    }

    // Deduct from balance
    await this.deductFromBalance(request.userId, request.requestType, request.totalDays.toNumber());

    const updatedRequest = await prisma.pTORequest.update({
      where: { id },
      data: {
        status: PTOStatus.APPROVED,
        approvedById: data.approvedById,
        approvalDate: new Date(),
        approvalNotes: data.approvalNotes,
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

    return updatedRequest;
  }

  /**
   * Deny a PTO request
   */
  async denyRequest(id: string, data: DenyPTORequestDto) {
    const request = await prisma.pTORequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new Error('PTO request not found');
    }

    if (request.status !== PTOStatus.PENDING) {
      throw new Error('Request is not pending approval');
    }

    const updatedRequest = await prisma.pTORequest.update({
      where: { id },
      data: {
        status: PTOStatus.DENIED,
        approvedById: data.approvedById,
        approvalDate: new Date(),
        approvalNotes: data.approvalNotes,
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

    return updatedRequest;
  }

  /**
   * Cancel a PTO request
   */
  async cancelRequest(id: string) {
    const request = await prisma.pTORequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new Error('PTO request not found');
    }

    if (request.status === PTOStatus.CANCELLED) {
      throw new Error('Request is already cancelled');
    }

    // If request was approved, restore balance
    if (request.status === PTOStatus.APPROVED) {
      await this.restoreBalance(request.userId, request.requestType, request.totalDays.toNumber());
    }

    const updatedRequest = await prisma.pTORequest.update({
      where: { id },
      data: {
        status: PTOStatus.CANCELLED,
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

    return updatedRequest;
  }

  /**
   * Delete a PTO request
   */
  async deleteRequest(id: string) {
    const request = await prisma.pTORequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new Error('PTO request not found');
    }

    // If request was approved, restore balance
    if (request.status === PTOStatus.APPROVED) {
      await this.restoreBalance(request.userId, request.requestType, request.totalDays.toNumber());
    }

    await prisma.pTORequest.delete({
      where: { id },
    });

    return { message: 'PTO request deleted successfully' };
  }

  /**
   * Get PTO balance for a user
   */
  async getBalance(userId: string) {
    let balance = await prisma.pTOBalance.findUnique({
      where: { userId },
    });

    // Create balance record if it doesn't exist
    if (!balance) {
      balance = await prisma.pTOBalance.create({
        data: {
          userId,
          ptoBalance: new Decimal(0),
          sickBalance: new Decimal(0),
          vacationBalance: new Decimal(0),
          ptoAnnual: new Decimal(0),
          sickAnnual: new Decimal(0),
          vacationAnnual: new Decimal(0),
        },
      });
    }

    return balance;
  }

  /**
   * Update PTO balance for a user
   */
  async updateBalance(userId: string, data: UpdatePTOBalanceDto) {
    const updateData: Prisma.PTOBalanceUpdateInput = {};

    if (data.ptoBalance !== undefined) updateData.ptoBalance = new Decimal(data.ptoBalance);
    if (data.sickBalance !== undefined) updateData.sickBalance = new Decimal(data.sickBalance);
    if (data.vacationBalance !== undefined) updateData.vacationBalance = new Decimal(data.vacationBalance);
    if (data.ptoAnnual !== undefined) updateData.ptoAnnual = new Decimal(data.ptoAnnual);
    if (data.sickAnnual !== undefined) updateData.sickAnnual = new Decimal(data.sickAnnual);
    if (data.vacationAnnual !== undefined) updateData.vacationAnnual = new Decimal(data.vacationAnnual);
    if (data.accrualRate !== undefined) updateData.accrualRate = new Decimal(data.accrualRate);

    const balance = await prisma.pTOBalance.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ptoBalance: data.ptoBalance !== undefined ? new Decimal(data.ptoBalance) : new Decimal(0),
        sickBalance: data.sickBalance !== undefined ? new Decimal(data.sickBalance) : new Decimal(0),
        vacationBalance: data.vacationBalance !== undefined ? new Decimal(data.vacationBalance) : new Decimal(0),
        ptoAnnual: data.ptoAnnual !== undefined ? new Decimal(data.ptoAnnual) : new Decimal(0),
        sickAnnual: data.sickAnnual !== undefined ? new Decimal(data.sickAnnual) : new Decimal(0),
        vacationAnnual: data.vacationAnnual !== undefined ? new Decimal(data.vacationAnnual) : new Decimal(0),
        accrualRate: data.accrualRate !== undefined ? new Decimal(data.accrualRate) : undefined,
      },
    });

    return balance;
  }

  /**
   * Deduct from balance (internal use)
   */
  private async deductFromBalance(userId: string, requestType: AbsenceType, days: number) {
    const balance = await this.getBalance(userId);

    const updateData: Prisma.PTOBalanceUpdateInput = {};

    switch (requestType) {
      case AbsenceType.PTO:
        updateData.ptoBalance = balance.ptoBalance.minus(new Decimal(days));
        break;
      case AbsenceType.SICK:
        updateData.sickBalance = balance.sickBalance.minus(new Decimal(days));
        break;
      case AbsenceType.VACATION:
        updateData.vacationBalance = balance.vacationBalance.minus(new Decimal(days));
        break;
      default:
        // No deduction for FMLA, BEREAVEMENT, etc.
        return;
    }

    await prisma.pTOBalance.update({
      where: { userId },
      data: updateData,
    });
  }

  /**
   * Restore balance (internal use)
   */
  private async restoreBalance(userId: string, requestType: AbsenceType, days: number) {
    const balance = await this.getBalance(userId);

    const updateData: Prisma.PTOBalanceUpdateInput = {};

    switch (requestType) {
      case AbsenceType.PTO:
        updateData.ptoBalance = balance.ptoBalance.plus(new Decimal(days));
        break;
      case AbsenceType.SICK:
        updateData.sickBalance = balance.sickBalance.plus(new Decimal(days));
        break;
      case AbsenceType.VACATION:
        updateData.vacationBalance = balance.vacationBalance.plus(new Decimal(days));
        break;
      default:
        // No restoration for FMLA, BEREAVEMENT, etc.
        return;
    }

    await prisma.pTOBalance.update({
      where: { userId },
      data: updateData,
    });
  }

  /**
   * Process accruals for all users
   */
  async processAccruals() {
    const balances = await prisma.pTOBalance.findMany({
      where: {
        accrualRate: { not: null },
      },
    });

    const results = [];

    for (const balance of balances) {
      if (!balance.accrualRate) continue;

      const updateData: Prisma.PTOBalanceUpdateInput = {
        ptoBalance: balance.ptoBalance.plus(balance.accrualRate),
        lastAccrualDate: new Date(),
      };

      const updated = await prisma.pTOBalance.update({
        where: { userId: balance.userId },
        data: updateData,
      });

      results.push({
        userId: balance.userId,
        accrued: balance.accrualRate.toNumber(),
        newBalance: updated.ptoBalance.toNumber(),
      });
    }

    return {
      message: `Processed accruals for ${results.length} users`,
      results,
    };
  }

  /**
   * Get pending PTO requests
   */
  async getPendingRequests() {
    const requests = await prisma.pTORequest.findMany({
      where: {
        status: PTOStatus.PENDING,
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
      orderBy: { createdAt: 'asc' },
    });

    return requests;
  }

  /**
   * Get PTO calendar (approved requests)
   */
  async getPTOCalendar(startDate: Date, endDate: Date) {
    const requests = await prisma.pTORequest.findMany({
      where: {
        status: PTOStatus.APPROVED,
        OR: [
          {
            startDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            endDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: endDate } },
            ],
          },
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
      orderBy: { startDate: 'asc' },
    });

    return requests;
  }
}

export default new PTOService();
