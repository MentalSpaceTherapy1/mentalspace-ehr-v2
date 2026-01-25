/**
 * Staff & HR Management Route Group
 * Module 9: Staff Management, Onboarding, Performance, Time & Attendance
 */
import { Router } from 'express';
import staffManagementRoutes from '../staff-management.routes';
import onboardingRoutes from '../onboarding.routes';
import performanceReviewRoutes from '../performance-review.routes';
import timeAttendanceRoutes from '../time-attendance.routes';
import ptoRoutes from '../pto.routes';

const router = Router();

// Staff management
router.use('/staff', staffManagementRoutes);

// Onboarding
router.use('/onboarding', onboardingRoutes);

// Performance reviews
router.use('/performance-reviews', performanceReviewRoutes);
router.use('/performance', performanceReviewRoutes); // Alias for frontend compatibility

// Time & attendance
router.use('/time-attendance', timeAttendanceRoutes);
router.use('/attendance', timeAttendanceRoutes); // Alias for frontend compatibility

// PTO management
router.use('/pto', ptoRoutes);

export default router;
