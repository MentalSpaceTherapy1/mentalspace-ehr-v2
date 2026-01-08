import prisma from './database';
import { BadRequestError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import { EmploymentStatus, EmploymentType, UserRole } from '@prisma/client';

/**
 * Module 9: Staff Management Service
 * Manages employee records, employment details, organizational structure, and staff operations
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CreateStaffMemberDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  employeeId?: string;
  hireDate?: Date;
  department?: string;
  jobTitle?: string;
  workLocation?: string;
  employmentType?: EmploymentType;
  employmentStatus?: EmploymentStatus;
  managerId?: string;
  phoneNumber?: string;
  personalEmail?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  licenseNumber?: string;
  licenseState?: string;
  licenseExpiration?: Date;
  npiNumber?: string;
  defaultRate?: number;
  hourlyPayrollRate?: number;
  taxId?: string;
}

export interface UpdateStaffMemberDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  personalEmail?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  employeeId?: string;
  hireDate?: Date;
  terminationDate?: Date;
  employmentStatus?: EmploymentStatus;
  department?: string;
  jobTitle?: string;
  workLocation?: string;
  employmentType?: EmploymentType;
  managerId?: string;
  licenseNumber?: string;
  licenseState?: string;
  licenseExpiration?: Date;
  npiNumber?: string;
  defaultRate?: number;
  hourlyPayrollRate?: number;
  taxId?: string;
  isActive?: boolean;
}

export interface StaffFilters {
  department?: string;
  employmentStatus?: EmploymentStatus;
  employmentType?: EmploymentType;
  managerId?: string;
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TerminateEmploymentDto {
  userId: string;
  terminationDate: Date;
  reason?: string;
  notes?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class StaffManagementService {
  /**
   * Create a new staff member with employment details
   */
  async createStaffMember(data: CreateStaffMemberDto) {
    const {
      email,
      password,
      firstName,
      lastName,
      roles,
      employeeId,
      hireDate,
      department,
      jobTitle,
      workLocation,
      employmentType,
      employmentStatus,
      managerId,
      phoneNumber,
      personalEmail,
      emergencyContactName,
      emergencyContactPhone,
      licenseNumber,
      licenseState,
      licenseExpiration,
      npiNumber,
      defaultRate,
      hourlyPayrollRate,
      taxId,
    } = data;

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestError('User with this email already exists');
    }

    // Check if employeeId is unique if provided
    if (employeeId) {
      const existingEmployeeId = await prisma.user.findUnique({
        where: { employeeId },
      });

      if (existingEmployeeId) {
        throw new BadRequestError('Employee ID already exists');
      }
    }

    // Validate manager if provided
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
      });

      if (!manager) {
        throw new NotFoundError('Manager not found');
      }
    }

    // Create staff member
    const staffMember = await prisma.user.create({
      data: {
        email,
        password, // Should be hashed by the controller before calling this service
        firstName,
        lastName,
        roles,
        employeeId: employeeId || `EMP-${Date.now()}`,
        hireDate: hireDate ? new Date(hireDate) : new Date(),
        department,
        jobTitle,
        workLocation,
        employmentType: employmentType || EmploymentType.FULL_TIME,
        employmentStatus: employmentStatus || EmploymentStatus.ACTIVE,
        managerId,
        phoneNumber,
        personalEmail,
        emergencyContactName,
        emergencyContactPhone,
        licenseNumber,
        licenseState,
        licenseExpiration: licenseExpiration ? new Date(licenseExpiration) : undefined,
        npiNumber,
        defaultRate,
        hourlyPayrollRate,
        taxId,
        isActive: true,
        emailVerified: true,
        mustChangePassword: true, // Force password change on first login
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        employeeId: true,
        hireDate: true,
        department: true,
        jobTitle: true,
        workLocation: true,
        employmentType: true,
        employmentStatus: true,
        managerId: true,
        phoneNumber: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        licenseNumber: true,
        licenseState: true,
        licenseExpiration: true,
        npiNumber: true,
        isActive: true,
        createdAt: true,
      },
    });

    logger.info(`Staff member created: ${staffMember.email} (${staffMember.employeeId})`);

    return staffMember;
  }

  /**
   * Get staff member by ID with full details
   */
  async getStaffMemberById(userId: string) {
    const staffMember = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        employeeId: true,
        hireDate: true,
        terminationDate: true,
        employmentStatus: true,
        department: true,
        jobTitle: true,
        workLocation: true,
        employmentType: true,
        phoneNumber: true,
        profilePhotoS3: true,
        officeExtension: true,
        personalEmail: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        licenseNumber: true,
        licenseState: true,
        licenseExpiration: true,
        npiNumber: true,
        defaultRate: true,
        hourlyPayrollRate: true,
        taxId: true,
        isActive: true,
        lastLoginDate: true,
        createdAt: true,
        updatedAt: true,
        managerId: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
          },
        },
        subordinates: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            department: true,
            employmentStatus: true,
          },
        },
        onboardingChecklist: {
          select: {
            id: true,
            completionPercentage: true,
            completionDate: true,
            startDate: true,
          },
        },
      },
    });

    if (!staffMember) {
      throw new NotFoundError('Staff member not found');
    }

    // Transform response to match frontend interface expectations
    const result = staffMember as any;
    return {
      ...staffMember,
      phone: result.phoneNumber,
      photoUrl: result.profilePhotoS3,
      directReports: result.subordinates,
      emergencyContact: result.emergencyContactName ? {
        name: result.emergencyContactName,
        phone: result.emergencyContactPhone || '',
        relationship: '',
      } : undefined,
    };
  }

  /**
   * Get all staff members with filters and pagination
   */
  async getStaffMembers(filters: StaffFilters) {
    const {
      department,
      employmentStatus,
      employmentType,
      managerId,
      role,
      isActive,
      search,
      page = 1,
      limit = 20,
    } = filters;

    const where: any = {};

    if (department) {
      where.department = department;
    }

    if (employmentStatus) {
      where.employmentStatus = employmentStatus;
    }

    if (employmentType) {
      where.employmentType = employmentType;
    }

    if (managerId) {
      where.managerId = managerId;
    }

    if (role) {
      where.roles = { has: role };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const total = await prisma.user.count({ where });

    const staffMembers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        employeeId: true,
        hireDate: true,
        terminationDate: true,
        employmentStatus: true,
        department: true,
        jobTitle: true,
        workLocation: true,
        employmentType: true,
        phoneNumber: true,
        profilePhotoS3: true,
        isActive: true,
        lastLoginDate: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        onboardingChecklist: {
          select: {
            completionPercentage: true,
            completionDate: true,
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    });

    // Transform field names to match frontend expectations
    const transformedStaffMembers = staffMembers.map((member: any) => ({
      ...member,
      phone: member.phoneNumber,
      photoUrl: member.profilePhotoS3,
    }));

    return {
      staffMembers: transformedStaffMembers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update staff member details
   */
  async updateStaffMember(userId: string, data: UpdateStaffMemberDto) {
    // Check if staff member exists
    const existingStaff = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingStaff) {
      throw new NotFoundError('Staff member not found');
    }

    // Check if email is unique if being updated
    if (data.email && data.email !== existingStaff.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailExists) {
        throw new BadRequestError('Email already in use');
      }
    }

    // Check if employeeId is unique if being updated
    if (data.employeeId && data.employeeId !== existingStaff.employeeId) {
      const employeeIdExists = await prisma.user.findUnique({
        where: { employeeId: data.employeeId },
      });

      if (employeeIdExists) {
        throw new BadRequestError('Employee ID already in use');
      }
    }

    // Validate manager if being updated
    if (data.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: data.managerId },
      });

      if (!manager) {
        throw new NotFoundError('Manager not found');
      }

      // Prevent circular reporting relationships
      if (data.managerId === userId) {
        throw new BadRequestError('Staff member cannot be their own manager');
      }
    }

    // Update staff member
    const updatedStaff = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        terminationDate: data.terminationDate ? new Date(data.terminationDate) : undefined,
        hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
        licenseExpiration: data.licenseExpiration ? new Date(data.licenseExpiration) : undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        employeeId: true,
        hireDate: true,
        terminationDate: true,
        employmentStatus: true,
        department: true,
        jobTitle: true,
        workLocation: true,
        employmentType: true,
        phoneNumber: true,
        personalEmail: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        isActive: true,
        updatedAt: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(`Staff member updated: ${userId}`);

    return updatedStaff;
  }

  /**
   * Terminate employment
   */
  async terminateEmployment(data: TerminateEmploymentDto) {
    const { userId, terminationDate, reason, notes } = data;

    const staffMember = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!staffMember) {
      throw new NotFoundError('Staff member not found');
    }

    if (staffMember.employmentStatus === EmploymentStatus.TERMINATED) {
      throw new BadRequestError('Staff member is already terminated');
    }

    // Update employment status and termination date
    const updatedStaff = await prisma.user.update({
      where: { id: userId },
      data: {
        employmentStatus: EmploymentStatus.TERMINATED,
        terminationDate: new Date(terminationDate),
        isActive: false,
        availableForScheduling: false,
        acceptsNewClients: false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        employeeId: true,
        employmentStatus: true,
        terminationDate: true,
        isActive: true,
      },
    });

    logger.info(
      `Employment terminated for ${updatedStaff.email} effective ${terminationDate}. Reason: ${reason || 'Not specified'}`
    );

    return {
      ...updatedStaff,
      terminationReason: reason,
      terminationNotes: notes,
    };
  }

  /**
   * Reactivate terminated staff member
   */
  async reactivateStaffMember(userId: string, hireDate?: Date) {
    const staffMember = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!staffMember) {
      throw new NotFoundError('Staff member not found');
    }

    if (staffMember.employmentStatus !== EmploymentStatus.TERMINATED) {
      throw new BadRequestError('Only terminated staff members can be reactivated');
    }

    const updatedStaff = await prisma.user.update({
      where: { id: userId },
      data: {
        employmentStatus: EmploymentStatus.ACTIVE,
        terminationDate: null,
        hireDate: hireDate ? new Date(hireDate) : staffMember.hireDate,
        isActive: true,
        mustChangePassword: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        employeeId: true,
        employmentStatus: true,
        hireDate: true,
        isActive: true,
      },
    });

    logger.info(`Staff member reactivated: ${updatedStaff.email}`);

    return updatedStaff;
  }

  /**
   * Get organizational hierarchy
   */
  async getOrganizationalHierarchy() {
    // Get all active staff members with their relationships
    const allStaff = await prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        department: true,
        employeeId: true,
        managerId: true,
        profilePhotoS3: true,
      },
    });

    // Define the OrgChartNode type
    interface OrgChartNode {
      id: string;
      name: string;
      title: string;
      department: string;
      photoUrl?: string;
      children: OrgChartNode[];
    }

    // Build hierarchical tree recursively
    const buildTree = (managerId: string | null): OrgChartNode[] => {
      return allStaff
        .filter((staff) => staff.managerId === managerId)
        .map((staff) => ({
          id: staff.id,
          name: `${staff.firstName} ${staff.lastName}`,
          title: staff.jobTitle || '',
          department: staff.department || '',
          photoUrl: staff.profilePhotoS3 || undefined,
          children: buildTree(staff.id),
        }));
    };

    // Get top-level nodes (staff with no manager)
    const rootNodes = buildTree(null);

    // If there's only one root, return it directly; otherwise create a virtual root
    if (rootNodes.length === 1) {
      return rootNodes[0];
    } else if (rootNodes.length > 1) {
      // Multiple top-level managers - return first one or create organization node
      return {
        id: 'organization',
        name: 'Organization',
        title: 'Company',
        department: '',
        photoUrl: undefined,
        children: rootNodes,
      };
    }

    // No org chart data
    return null;
  }

  /**
   * Get department statistics
   */
  async getDepartmentStatistics(department: string) {
    const staffInDepartment = await prisma.user.findMany({
      where: {
        department,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        employmentType: true,
        employmentStatus: true,
        hireDate: true,
      },
    });

    const employmentTypeBreakdown = staffInDepartment.reduce(
      (acc, staff) => {
        const type = staff.employmentType || 'UNKNOWN';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const employmentStatusBreakdown = staffInDepartment.reduce(
      (acc, staff) => {
        const status = staff.employmentStatus || 'UNKNOWN';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      department,
      totalStaff: staffInDepartment.length,
      employmentTypeBreakdown,
      employmentStatusBreakdown,
      staff: staffInDepartment,
    };
  }

  /**
   * Get staff statistics
   */
  async getStaffStatistics() {
    const allStaff = await prisma.user.findMany({
      select: {
        employmentStatus: true,
        employmentType: true,
        department: true,
        hireDate: true,
        isActive: true,
      },
    });

    const activeStaff = allStaff.filter((s) => s.isActive);
    const inactiveStaff = allStaff.filter((s) => !s.isActive);

    const employmentStatusBreakdown = allStaff.reduce(
      (acc, staff) => {
        const status = staff.employmentStatus || 'UNKNOWN';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const employmentTypeBreakdown = activeStaff.reduce(
      (acc, staff) => {
        const type = staff.employmentType || 'UNKNOWN';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const departmentBreakdown = activeStaff.reduce(
      (acc, staff) => {
        const dept = staff.department || 'Unassigned';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Calculate average tenure (in months)
    const now = new Date();
    const tenures = activeStaff
      .filter((s) => s.hireDate)
      .map((s) => {
        const hireDate = new Date(s.hireDate!);
        const months =
          (now.getFullYear() - hireDate.getFullYear()) * 12 +
          (now.getMonth() - hireDate.getMonth());
        return months;
      });

    const averageTenureMonths =
      tenures.length > 0 ? Math.round(tenures.reduce((a, b) => a + b, 0) / tenures.length) : 0;

    return {
      totalStaff: allStaff.length,
      activeStaff: activeStaff.length,
      inactiveStaff: inactiveStaff.length,
      employmentStatusBreakdown,
      employmentTypeBreakdown,
      departmentBreakdown,
      averageTenureMonths,
    };
  }

  /**
   * Get staff members by manager
   */
  async getStaffByManager(managerId: string) {
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        department: true,
      },
    });

    if (!manager) {
      throw new NotFoundError('Manager not found');
    }

    const subordinates = await prisma.user.findMany({
      where: {
        managerId,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        employeeId: true,
        jobTitle: true,
        department: true,
        employmentType: true,
        employmentStatus: true,
        hireDate: true,
        phoneNumber: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return {
      manager,
      totalSubordinates: subordinates.length,
      subordinates,
    };
  }

  /**
   * Assign manager to staff member
   */
  async assignManager(userId: string, managerId: string) {
    const staffMember = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!staffMember) {
      throw new NotFoundError('Staff member not found');
    }

    const manager = await prisma.user.findUnique({
      where: { id: managerId },
    });

    if (!manager) {
      throw new NotFoundError('Manager not found');
    }

    if (userId === managerId) {
      throw new BadRequestError('Staff member cannot be their own manager');
    }

    const updatedStaff = await prisma.user.update({
      where: { id: userId },
      data: { managerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
          },
        },
      },
    });

    logger.info(`Manager ${managerId} assigned to staff member ${userId}`);

    return updatedStaff;
  }

  /**
   * Remove manager from staff member
   */
  async removeManager(userId: string) {
    const staffMember = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!staffMember) {
      throw new NotFoundError('Staff member not found');
    }

    if (!staffMember.managerId) {
      throw new BadRequestError('Staff member does not have a manager assigned');
    }

    const updatedStaff = await prisma.user.update({
      where: { id: userId },
      data: { managerId: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    logger.info(`Manager removed from staff member ${userId}`);

    return updatedStaff;
  }
}

export default new StaffManagementService();
