import { Router } from 'express';
import {
  getAllAppointments,
  getAppointmentById,
  getAppointmentsByClientId,
  createAppointment,
  createRecurringAppointments,
  updateAppointment,
  checkInAppointment,
  checkOutAppointment,
  cancelAppointment,
  rescheduleAppointment,
  markNoShow,
  deleteAppointment,
  getOrCreateAppointment,
  getProviderComparison,
  quickReschedule,
  validateTimeSlot,
  getRoomView,
  bulkUpdateStatus,
  bulkCancelAppointments,
  bulkDeleteAppointments,
  bulkAssignRoom,
  // Phase 5: AdvancedMD Eligibility Integration
  checkAppointmentEligibility,
  checkDailyEligibility,
  checkInWithEligibility,
} from '../controllers/appointment.controller';
import { authenticate, authorize } from '../middleware/auth';
import { requireClientAccess, requireAppointmentAccess } from '../middleware/clientAccess';
import { UserRoles } from '@mentalspace/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

// HIPAA Note: Appointments contain client PHI. Access is controlled by:
// - SUPER_ADMIN: Full access
// - ADMINISTRATOR, CLINICAL_DIRECTOR: Organization-wide access
// - SUPERVISOR: Own appointments + supervisees' appointments
// - CLINICIAN: Own appointments + assigned clients' appointments
// - FRONT_DESK/SCHEDULER: Scheduling access within organization
// - BILLING_STAFF: Billing view access within organization

// Get all appointments (with filters) - RLS applied in controller via applyAppointmentScope
router.get(
  '/',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.BILLING_STAFF,
    UserRoles.FRONT_DESK,
    UserRoles.SCHEDULER,
    UserRoles.SUPER_ADMIN
  ),
  getAllAppointments
);

// Get provider comparison view (must be before /:id to avoid route collision)
router.get(
  '/provider-comparison',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.SUPER_ADMIN
  ),
  getProviderComparison
);

// Get room view for resource scheduling (must be before /:id to avoid route collision)
router.get(
  '/room-view',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.FRONT_DESK,
    UserRoles.SCHEDULER,
    UserRoles.SUPER_ADMIN
  ),
  getRoomView
);

// Batch check eligibility for all appointments on a date (must be before /:id to avoid route collision)
router.get(
  '/eligibility/daily',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.BILLING_STAFF,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.SUPER_ADMIN
  ),
  checkDailyEligibility
);

// RLS: Get all appointments for a specific client (requires client access)
router.get(
  '/client/:clientId',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.BILLING_STAFF,
    UserRoles.FRONT_DESK,
    UserRoles.SCHEDULER,
    UserRoles.SUPER_ADMIN
  ),
  requireClientAccess('clientId', { allowBillingView: true }),
  getAppointmentsByClientId
);

// RLS: Get single appointment (requires appointment access)
router.get(
  '/:id',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.BILLING_STAFF,
    UserRoles.FRONT_DESK,
    UserRoles.SCHEDULER,
    UserRoles.SUPER_ADMIN
  ),
  requireAppointmentAccess('id'),
  getAppointmentById
);

// Create new appointment - client access checked in controller
router.post(
  '/',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.FRONT_DESK,
    UserRoles.SCHEDULER,
    UserRoles.SUPER_ADMIN
  ),
  createAppointment
);

// Get or create appointment (for clinical notes)
router.post(
  '/get-or-create',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.SUPER_ADMIN
  ),
  getOrCreateAppointment
);

// Create recurring appointments
router.post(
  '/recurring',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.FRONT_DESK,
    UserRoles.SCHEDULER,
    UserRoles.SUPER_ADMIN
  ),
  createRecurringAppointments
);

// RLS: Update appointment (requires appointment access)
router.put(
  '/:id',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.FRONT_DESK,
    UserRoles.SCHEDULER,
    UserRoles.SUPER_ADMIN
  ),
  requireAppointmentAccess('id'),
  updateAppointment
);

// RLS: Check-in appointment (requires appointment access)
router.post(
  '/:id/check-in',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.FRONT_DESK,
    UserRoles.SUPER_ADMIN
  ),
  requireAppointmentAccess('id'),
  checkInAppointment
);

// RLS: Check-in with eligibility verification (requires appointment access)
router.post(
  '/:id/check-in-with-eligibility',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.FRONT_DESK,
    UserRoles.SUPER_ADMIN
  ),
  requireAppointmentAccess('id'),
  checkInWithEligibility
);

// RLS: Check-out appointment (requires appointment access)
router.post(
  '/:id/check-out',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.FRONT_DESK,
    UserRoles.SUPER_ADMIN
  ),
  requireAppointmentAccess('id'),
  checkOutAppointment
);

// RLS: Cancel appointment (requires appointment access)
router.post(
  '/:id/cancel',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.FRONT_DESK,
    UserRoles.SCHEDULER,
    UserRoles.SUPER_ADMIN
  ),
  requireAppointmentAccess('id'),
  cancelAppointment
);

// RLS: Reschedule appointment (requires appointment access)
router.post(
  '/:id/reschedule',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.FRONT_DESK,
    UserRoles.SCHEDULER,
    UserRoles.SUPER_ADMIN
  ),
  requireAppointmentAccess('id'),
  rescheduleAppointment
);

// RLS: Quick reschedule (requires appointment access)
router.post(
  '/:id/quick-reschedule',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.FRONT_DESK,
    UserRoles.SCHEDULER,
    UserRoles.SUPER_ADMIN
  ),
  requireAppointmentAccess('id'),
  quickReschedule
);

// Validate time slot availability (for drag-and-drop preview)
router.post(
  '/validate-slot',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.FRONT_DESK,
    UserRoles.SCHEDULER,
    UserRoles.SUPER_ADMIN
  ),
  validateTimeSlot
);

// Bulk operations - admin only (organization-scoped in controller)
router.post(
  '/bulk/update-status',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.SUPER_ADMIN
  ),
  bulkUpdateStatus
);
router.post(
  '/bulk/cancel',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.SUPER_ADMIN
  ),
  bulkCancelAppointments
);
router.post(
  '/bulk/assign-room',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.SUPER_ADMIN
  ),
  bulkAssignRoom
);
router.delete(
  '/bulk/delete',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.SUPER_ADMIN),
  bulkDeleteAppointments
);

// RLS: Mark as no-show (requires appointment access)
router.post(
  '/:id/no-show',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.FRONT_DESK,
    UserRoles.SUPER_ADMIN
  ),
  requireAppointmentAccess('id'),
  markNoShow
);

// ============================================
// Phase 5: Insurance Eligibility Verification (AdvancedMD)
// ============================================

// RLS: Check eligibility for a specific appointment (requires appointment access)
router.get(
  '/:id/eligibility',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.BILLING_STAFF,
    UserRoles.SUPER_ADMIN
  ),
  requireAppointmentAccess('id'),
  checkAppointmentEligibility
);

// RLS: Delete appointment (requires appointment access)
router.delete(
  '/:id',
  authorize(
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.SUPER_ADMIN
  ),
  requireAppointmentAccess('id'),
  deleteAppointment
);

export default router;
