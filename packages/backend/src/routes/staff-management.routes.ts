import { Router, Request, Response, NextFunction } from 'express';
import staffManagementController from '../controllers/staff-management.controller';
import credentialingController from '../controllers/credentialing.controller';
import trainingController from '../controllers/training.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import { auditLog } from '../middleware/auditLogger';

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

// Alias for org chart - frontend calls this endpoint
router.get(
  '/org-chart',
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

// Staff credentials routes (proxy to credentialing controller)
// Must come before /:id routes to avoid conflicts
router.get(
  '/:id/credentials',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR']),
  (req: Request, res: Response, next: NextFunction) => {
    // Rewrite params to match credentialing controller expectation
    req.params.userId = req.params.id;
    return credentialingController.getUserCredentials(req, res);
  }
);

router.post(
  '/:id/credentials',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']),
  auditLog({ entityType: 'Credential', action: 'CREATE' }),
  (req: Request, res: Response, next: NextFunction) => {
    // Set userId from path param if not in body
    if (!req.body.userId) {
      req.body.userId = req.params.id;
    }
    return credentialingController.createCredential(req, res);
  }
);

// Staff training routes (proxy to training controller)
router.get(
  '/:id/training',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR']),
  (req: Request, res: Response, next: NextFunction) => {
    // Rewrite params to match training controller expectation
    req.params.userId = req.params.id;
    return trainingController.getUserTrainingRecords(req, res, next);
  }
);

router.post(
  '/:id/training',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']),
  auditLog({ entityType: 'Training', action: 'CREATE' }),
  (req: Request, res: Response, next: NextFunction) => {
    // Set userId from path param if not in body
    if (!req.body.userId) {
      req.body.userId = req.params.id;
    }
    return trainingController.enrollUser(req, res, next);
  }
);

// CRUD routes for staff members
router.post('/', requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']), auditLog({ entityType: 'Staff', action: 'CREATE' }), staffManagementController.createStaffMember);

router.get('/', requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']), staffManagementController.getStaffMembers);

router.get(
  '/:id',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR']),
  auditLog({ entityType: 'Staff', action: 'VIEW' }),
  staffManagementController.getStaffMemberById
);

router.put('/:id', requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']), auditLog({ entityType: 'Staff', action: 'UPDATE' }), staffManagementController.updateStaffMember);

// Employment status management
router.post(
  '/:id/terminate',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']),
  auditLog({ entityType: 'Staff', action: 'UPDATE' }),
  staffManagementController.terminateEmployment
);

router.post(
  '/:id/reactivate',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']),
  auditLog({ entityType: 'Staff', action: 'UPDATE' }),
  staffManagementController.reactivateStaffMember
);

// Manager assignment
router.post(
  '/:id/assign-manager',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']),
  auditLog({ entityType: 'Staff', action: 'UPDATE' }),
  staffManagementController.assignManager
);

router.delete(
  '/:id/manager',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']),
  auditLog({ entityType: 'Staff', action: 'UPDATE' }),
  staffManagementController.removeManager
);

export default router;
