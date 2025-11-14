import { Router } from 'express';
import staffManagementController from '../controllers/staff-management.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

/**
 * Module 9: Staff Management Routes
 * All routes require authentication and ADMINISTRATOR/SUPER_ADMIN role
 */

// Apply authentication to all routes
router.use(authenticate);

// Statistics routes (must come before :id routes)
router.get(
  '/statistics',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']),
  staffManagementController.getStaffStatistics
);

router.get(
  '/organization/hierarchy',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']),
  staffManagementController.getOrganizationalHierarchy
);

router.get(
  '/departments/:department/statistics',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']),
  staffManagementController.getDepartmentStatistics
);

router.get(
  '/managers/:managerId/subordinates',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR']),
  staffManagementController.getStaffByManager
);

// CRUD routes for staff members
router.post('/', requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']), staffManagementController.createStaffMember);

router.get('/', requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']), staffManagementController.getStaffMembers);

router.get(
  '/:id',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR']),
  staffManagementController.getStaffMemberById
);

router.put('/:id', requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']), staffManagementController.updateStaffMember);

// Employment status management
router.post(
  '/:id/terminate',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']),
  staffManagementController.terminateEmployment
);

router.post(
  '/:id/reactivate',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']),
  staffManagementController.reactivateStaffMember
);

// Manager assignment
router.post(
  '/:id/assign-manager',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']),
  staffManagementController.assignManager
);

router.delete(
  '/:id/manager',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']),
  staffManagementController.removeManager
);

export default router;
