// Module 9: Enhanced Client Portal Services
// All services are fully integrated with EHR system

export * as authService from './auth.service';
export * as billingService from './billing.service';
export * as insuranceService from './insurance.service';
export * as sessionReviewsService from './sessionReviews.service';
export * as therapistChangeService from './therapistChange.service';
export * as moodTrackingService from './moodTracking.service';

// Export types for convenience
export type { AppError } from '../../utils/errors';
