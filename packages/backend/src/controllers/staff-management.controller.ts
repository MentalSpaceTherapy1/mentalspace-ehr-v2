import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { EmploymentStatus, EmploymentType, UserRole } from '@prisma/client';
import staffManagementService from '../services/staff-management.service';
import { BadRequestError } from '../utils/errors';
import logger from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError, sendPaginated, calculatePagination } from '../utils/apiResponse';

/**
 * Module 9: Staff Management Controller
 * Handles HTTP requests for staff management operations
 */

class StaffManagementController {
  /**
   * Create a new staff member
   * POST /api/staff
   */
  async createStaffMember(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        role,
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
      } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName || !role) {
        throw new BadRequestError('Missing required fields');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const staffMember = await staffManagementService.createStaffMember({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        roles: [role], // Convert single role to array
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
      });

      return sendCreated(res, staffMember, 'Staff member created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get staff member by ID
   * GET /api/staff/:id
   */
  async getStaffMemberById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const staffMember = await staffManagementService.getStaffMemberById(id);

      return sendSuccess(res, staffMember);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all staff members with filters
   * GET /api/staff
   */
  async getStaffMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        department,
        employmentStatus,
        employmentType,
        managerId,
        role,
        isActive,
        search,
        page,
        limit,
      } = req.query;

      const filters = {
        department: department as string,
        employmentStatus: employmentStatus as EmploymentStatus | undefined,
        employmentType: employmentType as EmploymentType | undefined,
        managerId: managerId as string,
        role: role as UserRole | undefined,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      };

      const result = await staffManagementService.getStaffMembers(filters);

      return sendPaginated(res, result.staffMembers, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update staff member
   * PUT /api/staff/:id
   */
  async updateStaffMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updatedStaff = await staffManagementService.updateStaffMember(id, updateData);

      return sendSuccess(res, updatedStaff, 'Staff member updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Terminate employment
   * POST /api/staff/:id/terminate
   */
  async terminateEmployment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { terminationDate, reason, notes } = req.body;

      if (!terminationDate) {
        throw new BadRequestError('Termination date is required');
      }

      const result = await staffManagementService.terminateEmployment({
        userId: id,
        terminationDate: new Date(terminationDate),
        reason,
        notes,
      });

      return sendSuccess(res, result, 'Employment terminated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reactivate staff member
   * POST /api/staff/:id/reactivate
   */
  async reactivateStaffMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { hireDate } = req.body;

      const reactivatedStaff = await staffManagementService.reactivateStaffMember(
        id,
        hireDate ? new Date(hireDate) : undefined
      );

      return sendSuccess(res, reactivatedStaff, 'Staff member reactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organizational hierarchy
   * GET /api/staff/organization/hierarchy
   */
  async getOrganizationalHierarchy(req: Request, res: Response, next: NextFunction) {
    try {
      const hierarchy = await staffManagementService.getOrganizationalHierarchy();

      return sendSuccess(res, hierarchy);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get department statistics
   * GET /api/staff/departments/:department/statistics
   */
  async getDepartmentStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const { department } = req.params;

      const statistics = await staffManagementService.getDepartmentStatistics(department);

      return sendSuccess(res, statistics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get overall staff statistics
   * GET /api/staff/statistics
   */
  async getStaffStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const statistics = await staffManagementService.getStaffStatistics();

      return sendSuccess(res, statistics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get staff by manager
   * GET /api/staff/managers/:managerId/subordinates
   */
  async getStaffByManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { managerId } = req.params;

      const result = await staffManagementService.getStaffByManager(managerId);

      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign manager to staff member
   * POST /api/staff/:id/assign-manager
   */
  async assignManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { managerId } = req.body;

      if (!managerId) {
        throw new BadRequestError('Manager ID is required');
      }

      const updatedStaff = await staffManagementService.assignManager(id, managerId);

      return sendSuccess(res, updatedStaff, 'Manager assigned successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove manager from staff member
   * DELETE /api/staff/:id/manager
   */
  async removeManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const updatedStaff = await staffManagementService.removeManager(id);

      return sendSuccess(res, updatedStaff, 'Manager removed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new StaffManagementController();
