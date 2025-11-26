/**
 * Monitoring Service Index
 *
 * Exports all monitoring-related functionality
 */

export * from './cloudwatch';
export { default as cloudwatch } from './cloudwatch';

// Re-export commonly used functions for convenience
export {
  initializeCloudWatch,
  recordRequest,
  recordAuthEvent,
  recordPHIAccess,
  recordSecurityIncident,
  recordUnauthorizedAccess,
  monitoringMiddleware,
  startMetricsCollection,
} from './cloudwatch';
