import { Router } from 'express';
import staffManagementController from '../controllers/staff-management.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

/**
 * Module 9: Staff Management Routes
 * All routes require authentication and ADMIN/SUPERADMIN role
 */

// Apply authentication to all routes
router.use(authenticate);

// Statistics routes (must come before :id routes)
router.get(
  '/statistics',
  requireRole(['ADMIN', 'SUPERADMIN']),
  staffManagementController.getStaffStatistics
);

router.get(
  '/organization/hierarchy',
  requireRole(['ADMIN', 'SUPERADMIN']),
  staffManagementController.getOrganizationalHierarchy
);

router.get(
  '/departments/:department/statistics',
  requireRole(['ADMIN', 'SUPERADMIN']),
  staffManagementController.getDepartmentStatistics
);

router.get(
  '/managers/:managerId/subordinates',
  requireRole(['ADMIN', 'SUPERADMIN', 'SUPERVISOR']),
  staffManagementController.getStaffByManager
);

// CRUD routes for staff members
router.post('/', requireRole(['ADMIN', 'SUPERADMIN']), staffManagementController.createStaffMember);

router.get('/', requireRole(['ADMIN', 'SUPERADMIN']), staffManagementController.getStaffMembers);

router.get(
  '/:id',
  requireRole(['ADMIN', 'SUPERADMIN', 'SUPERVISOR']),
  staffManagementController.getStaffMemberById
);

router.put('/:id', requireRole(['ADMIN', 'SUPERADMIN']), staffManagementController.updateStaffMember);

// Employment status management
router.post(
  '/:id/terminate',
  requireRole(['ADMIN', 'SUPERADMIN']),
  staffManagementController.terminateEmployment
);

router.post(
  '/:id/reactivate',
  requireRole(['ADMIN', 'SUPERADMIN']),
  staffManagementController.reactivateStaffMember
);

// Manager assignment
router.post(
  '/:id/assign-manager',
  requireRole(['ADMIN', 'SUPERADMIN']),
  staffManagementController.assignManager
);

router.delete(
  '/:id/manager',
  requireRole(['ADMIN', 'SUPERADMIN']),
  staffManagementController.removeManager
);

export default router;
