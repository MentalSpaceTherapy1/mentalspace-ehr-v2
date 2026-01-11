/**
 * CloudWatch Monitoring Service
 *
 * HIPAA Compliance: Implements comprehensive monitoring and alerting
 * as required by the Security Rule (45 CFR § 164.312)
 *
 * Features:
 * - Application metrics (requests, latency, errors)
 * - Security metrics (failed logins, unauthorized access attempts)
 * - PHI access metrics (data access patterns, anomaly detection)
 * - Business metrics (active sessions, API usage)
 * - Infrastructure metrics (database, memory, CPU)
 */

import {
  CloudWatchClient,
  PutMetricDataCommand,
  PutMetricAlarmCommand,
  MetricDatum,
  Dimension,
  StandardUnit,
} from '@aws-sdk/client-cloudwatch';
import {
  CloudWatchLogsClient,
  PutLogEventsCommand,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  DescribeLogStreamsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import config from '../../config';
import logger from '../../utils/logger';

// =============================================================================
// CONFIGURATION
// =============================================================================

const NAMESPACE = 'MentalSpaceEHR';
const LOG_GROUP = '/mentalspace-ehr/application';
const ENVIRONMENT = config.nodeEnv || 'development';

// Initialize CloudWatch clients
let cloudWatchClient: CloudWatchClient | null = null;
let cloudWatchLogsClient: CloudWatchLogsClient | null = null;
let logStreamName: string | null = null;
let sequenceToken: string | undefined;

// Buffer for batching metrics
const metricsBuffer: MetricDatum[] = [];
const METRICS_BUFFER_SIZE = 20;
const METRICS_FLUSH_INTERVAL = 60000; // 1 minute

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize CloudWatch clients
 */
export async function initializeCloudWatch(): Promise<boolean> {
  try {
    // Check if AWS credentials are available
    if (!process.env.AWS_REGION && !process.env.AWS_ACCESS_KEY_ID) {
      logger.warn('CloudWatch monitoring disabled: AWS credentials not configured');
      return false;
    }

    const region = process.env.AWS_REGION || 'us-east-1';

    cloudWatchClient = new CloudWatchClient({ region });
    cloudWatchLogsClient = new CloudWatchLogsClient({ region });

    // Create log group and stream
    await setupLogGroup();

    // Start metrics flush interval
    setInterval(flushMetrics, METRICS_FLUSH_INTERVAL);

    logger.info('CloudWatch monitoring initialized', { region, namespace: NAMESPACE });
    return true;
  } catch (error) {
    logger.error('Failed to initialize CloudWatch', { error });
    return false;
  }
}

/**
 * Set up CloudWatch Logs group and stream
 */
async function setupLogGroup(): Promise<void> {
  if (!cloudWatchLogsClient) return;

  try {
    // Create log group if it doesn't exist
    try {
      await cloudWatchLogsClient.send(
        new CreateLogGroupCommand({ logGroupName: LOG_GROUP })
      );
    } catch (error: any) {
      // Ignore if already exists
      if (error.name !== 'ResourceAlreadyExistsException') {
        throw error;
      }
    }

    // Create log stream for this instance
    logStreamName = `${ENVIRONMENT}/${new Date().toISOString().split('T')[0]}/${process.pid}`;

    try {
      await cloudWatchLogsClient.send(
        new CreateLogStreamCommand({
          logGroupName: LOG_GROUP,
          logStreamName,
        })
      );
    } catch (error: any) {
      if (error.name !== 'ResourceAlreadyExistsException') {
        throw error;
      }
      // Get existing sequence token
      const response = await cloudWatchLogsClient.send(
        new DescribeLogStreamsCommand({
          logGroupName: LOG_GROUP,
          logStreamNamePrefix: logStreamName,
        })
      );
      sequenceToken = response.logStreams?.[0]?.uploadSequenceToken;
    }
  } catch (error) {
    logger.error('Failed to set up CloudWatch Logs', { error });
  }
}

// =============================================================================
// METRICS PUBLISHING
// =============================================================================

/**
 * Add a metric to the buffer
 */
function addMetric(
  metricName: string,
  value: number,
  unit: StandardUnit,
  dimensions: Dimension[] = []
): void {
  const datum: MetricDatum = {
    MetricName: metricName,
    Value: value,
    Unit: unit,
    Timestamp: new Date(),
    Dimensions: [
      { Name: 'Environment', Value: ENVIRONMENT },
      ...dimensions,
    ],
  };

  metricsBuffer.push(datum);

  // Flush if buffer is full
  if (metricsBuffer.length >= METRICS_BUFFER_SIZE) {
    flushMetrics();
  }
}

/**
 * Flush metrics buffer to CloudWatch
 */
async function flushMetrics(): Promise<void> {
  if (!cloudWatchClient || metricsBuffer.length === 0) return;

  const metrics = metricsBuffer.splice(0, metricsBuffer.length);

  try {
    await cloudWatchClient.send(
      new PutMetricDataCommand({
        Namespace: NAMESPACE,
        MetricData: metrics,
      })
    );
  } catch (error) {
    logger.error('Failed to flush metrics to CloudWatch', { error, metricsCount: metrics.length });
    // Put metrics back in buffer for retry
    metricsBuffer.unshift(...metrics);
  }
}

// =============================================================================
// APPLICATION METRICS
// =============================================================================

/**
 * Record API request metrics
 */
export function recordRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number
): void {
  // Request count
  addMetric('RequestCount', 1, StandardUnit.Count, [
    { Name: 'Method', Value: method },
    { Name: 'StatusCode', Value: String(statusCode) },
  ]);

  // Request latency
  addMetric('RequestLatency', durationMs, StandardUnit.Milliseconds, [
    { Name: 'Method', Value: method },
    { Name: 'Path', Value: sanitizePath(path) },
  ]);

  // Error count (4xx and 5xx)
  if (statusCode >= 400) {
    addMetric('ErrorCount', 1, StandardUnit.Count, [
      { Name: 'StatusCode', Value: String(statusCode) },
      { Name: 'ErrorType', Value: statusCode >= 500 ? 'ServerError' : 'ClientError' },
    ]);
  }
}

/**
 * Record API endpoint latency
 */
export function recordEndpointLatency(
  endpoint: string,
  method: string,
  durationMs: number
): void {
  addMetric('EndpointLatency', durationMs, StandardUnit.Milliseconds, [
    { Name: 'Endpoint', Value: endpoint },
    { Name: 'Method', Value: method },
  ]);
}

/**
 * Record database query metrics
 */
export function recordDatabaseQuery(
  operation: string,
  table: string,
  durationMs: number,
  success: boolean
): void {
  addMetric('DatabaseQueryDuration', durationMs, StandardUnit.Milliseconds, [
    { Name: 'Operation', Value: operation },
    { Name: 'Table', Value: table },
  ]);

  if (!success) {
    addMetric('DatabaseQueryError', 1, StandardUnit.Count, [
      { Name: 'Operation', Value: operation },
      { Name: 'Table', Value: table },
    ]);
  }
}

// =============================================================================
// SECURITY METRICS (HIPAA Compliance)
// =============================================================================

/**
 * Record authentication events
 */
export function recordAuthEvent(
  eventType: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'MFA_SUCCESS' | 'MFA_FAILURE' | 'ACCOUNT_LOCKED',
  userId?: string,
  ipAddress?: string
): void {
  addMetric('AuthEvent', 1, StandardUnit.Count, [
    { Name: 'EventType', Value: eventType },
  ]);

  // Track failed login attempts (security monitoring)
  if (eventType === 'LOGIN_FAILURE' || eventType === 'MFA_FAILURE') {
    addMetric('FailedLoginAttempt', 1, StandardUnit.Count, [
      { Name: 'IPAddress', Value: ipAddress ? hashIP(ipAddress) : 'unknown' },
    ]);
  }

  // Track account lockouts (potential brute force)
  if (eventType === 'ACCOUNT_LOCKED') {
    addMetric('AccountLockout', 1, StandardUnit.Count);
  }
}

/**
 * Record unauthorized access attempts
 */
export function recordUnauthorizedAccess(
  resource: string,
  action: string,
  userId?: string,
  reason?: string
): void {
  addMetric('UnauthorizedAccessAttempt', 1, StandardUnit.Count, [
    { Name: 'Resource', Value: resource },
    { Name: 'Action', Value: action },
  ]);

  // Log for audit trail
  logSecurityEvent('UNAUTHORIZED_ACCESS', {
    resource,
    action,
    userId,
    reason,
  });
}

/**
 * Record PHI access events (HIPAA requirement)
 */
export function recordPHIAccess(
  action: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT',
  entityType: string,
  entityId: string,
  userId: string,
  granted: boolean
): void {
  addMetric('PHIAccess', 1, StandardUnit.Count, [
    { Name: 'Action', Value: action },
    { Name: 'EntityType', Value: entityType },
    { Name: 'Granted', Value: String(granted) },
  ]);

  if (!granted) {
    addMetric('PHIAccessDenied', 1, StandardUnit.Count, [
      { Name: 'EntityType', Value: entityType },
    ]);
  }

  // Log for HIPAA audit trail
  logSecurityEvent('PHI_ACCESS', {
    action,
    entityType,
    entityId: entityId.substring(0, 8), // Only log partial ID
    userId: userId.substring(0, 8),
    granted,
  });
}

/**
 * Record security incidents
 */
export function recordSecurityIncident(
  incidentType: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  details: Record<string, unknown>
): void {
  addMetric('SecurityIncident', 1, StandardUnit.Count, [
    { Name: 'IncidentType', Value: incidentType },
    { Name: 'Severity', Value: severity },
  ]);

  // Log for incident response
  logSecurityEvent('SECURITY_INCIDENT', {
    incidentType,
    severity,
    ...details,
  });
}

// =============================================================================
// BUSINESS METRICS
// =============================================================================

/**
 * Record active session count
 */
export function recordActiveSessions(count: number): void {
  addMetric('ActiveSessions', count, StandardUnit.Count);
}

/**
 * Record concurrent users
 */
export function recordConcurrentUsers(count: number): void {
  addMetric('ConcurrentUsers', count, StandardUnit.Count);
}

/**
 * Record API rate limit events
 */
export function recordRateLimitEvent(
  ipAddress: string,
  path: string
): void {
  addMetric('RateLimitHit', 1, StandardUnit.Count, [
    { Name: 'Path', Value: sanitizePath(path) },
  ]);
}

/**
 * Record clinical note submission
 */
export function recordClinicalNoteSubmission(
  noteType: string,
  status: 'DRAFT' | 'PENDING_REVIEW' | 'SIGNED' | 'COSIGNED'
): void {
  addMetric('ClinicalNoteSubmission', 1, StandardUnit.Count, [
    { Name: 'NoteType', Value: noteType },
    { Name: 'Status', Value: status },
  ]);
}

/**
 * Record appointment events
 */
export function recordAppointmentEvent(
  eventType: 'CREATED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW'
): void {
  addMetric('AppointmentEvent', 1, StandardUnit.Count, [
    { Name: 'EventType', Value: eventType },
  ]);
}

// =============================================================================
// INFRASTRUCTURE METRICS
// =============================================================================

/**
 * Record memory usage
 */
export function recordMemoryUsage(): void {
  const usage = process.memoryUsage();

  addMetric('HeapUsed', usage.heapUsed, StandardUnit.Bytes);
  addMetric('HeapTotal', usage.heapTotal, StandardUnit.Bytes);
  addMetric('RSS', usage.rss, StandardUnit.Bytes);
  addMetric('External', usage.external, StandardUnit.Bytes);
}

/**
 * Record event loop lag
 */
export function recordEventLoopLag(lagMs: number): void {
  addMetric('EventLoopLag', lagMs, StandardUnit.Milliseconds);
}

/**
 * Record database connection pool stats
 */
export function recordDatabasePoolStats(
  activeConnections: number,
  idleConnections: number,
  waitingRequests: number
): void {
  addMetric('DBActiveConnections', activeConnections, StandardUnit.Count);
  addMetric('DBIdleConnections', idleConnections, StandardUnit.Count);
  addMetric('DBWaitingRequests', waitingRequests, StandardUnit.Count);
}

// =============================================================================
// CLOUDWATCH ALARMS
// =============================================================================

/**
 * Create CloudWatch alarms for critical metrics
 */
export async function createAlarms(): Promise<void> {
  if (!cloudWatchClient) return;

  const alarms = [
    // High error rate
    {
      AlarmName: `${ENVIRONMENT}-HighErrorRate`,
      MetricName: 'ErrorCount',
      Threshold: 50,
      EvaluationPeriods: 3,
      Period: 300, // 5 minutes
      Statistic: 'Sum' as const,
      ComparisonOperator: 'GreaterThanThreshold' as const,
      AlarmDescription: 'High error rate detected - more than 50 errors in 5 minutes',
    },
    // High latency
    {
      AlarmName: `${ENVIRONMENT}-HighLatency`,
      MetricName: 'RequestLatency',
      Threshold: 5000, // 5 seconds
      EvaluationPeriods: 3,
      Period: 300,
      Statistic: 'Average' as const,
      ComparisonOperator: 'GreaterThanThreshold' as const,
      AlarmDescription: 'High API latency detected - average above 5 seconds',
    },
    // Security: Failed logins
    {
      AlarmName: `${ENVIRONMENT}-HighFailedLogins`,
      MetricName: 'FailedLoginAttempt',
      Threshold: 10,
      EvaluationPeriods: 2,
      Period: 300,
      Statistic: 'Sum' as const,
      ComparisonOperator: 'GreaterThanThreshold' as const,
      AlarmDescription: 'Potential brute force attack - high failed login attempts',
    },
    // Security: Unauthorized access
    {
      AlarmName: `${ENVIRONMENT}-UnauthorizedAccess`,
      MetricName: 'UnauthorizedAccessAttempt',
      Threshold: 5,
      EvaluationPeriods: 1,
      Period: 300,
      Statistic: 'Sum' as const,
      ComparisonOperator: 'GreaterThanThreshold' as const,
      AlarmDescription: 'Multiple unauthorized access attempts detected',
    },
    // HIPAA: PHI access denied
    {
      AlarmName: `${ENVIRONMENT}-PHIAccessDenied`,
      MetricName: 'PHIAccessDenied',
      Threshold: 10,
      EvaluationPeriods: 2,
      Period: 300,
      Statistic: 'Sum' as const,
      ComparisonOperator: 'GreaterThanThreshold' as const,
      AlarmDescription: 'Multiple PHI access denials - potential data breach attempt',
    },
    // Memory threshold
    {
      AlarmName: `${ENVIRONMENT}-HighMemoryUsage`,
      MetricName: 'HeapUsed',
      Threshold: 1024 * 1024 * 1024, // 1 GB
      EvaluationPeriods: 3,
      Period: 300,
      Statistic: 'Average' as const,
      ComparisonOperator: 'GreaterThanThreshold' as const,
      AlarmDescription: 'High memory usage detected',
    },
  ];

  for (const alarmConfig of alarms) {
    try {
      await cloudWatchClient.send(
        new PutMetricAlarmCommand({
          ...alarmConfig,
          Namespace: NAMESPACE,
          ActionsEnabled: true,
          // Add SNS topic ARN for notifications
          // AlarmActions: [process.env.ALERT_SNS_TOPIC_ARN],
          Dimensions: [{ Name: 'Environment', Value: ENVIRONMENT }],
        })
      );
      logger.info(`Created CloudWatch alarm: ${alarmConfig.AlarmName}`);
    } catch (error) {
      logger.error(`Failed to create alarm: ${alarmConfig.AlarmName}`, { error });
    }
  }
}

// =============================================================================
// LOGGING
// =============================================================================

/**
 * Log security event to CloudWatch Logs
 */
async function logSecurityEvent(
  eventType: string,
  details: Record<string, unknown>
): Promise<void> {
  if (!cloudWatchLogsClient || !logStreamName) return;

  const logEvent = {
    timestamp: Date.now(),
    message: JSON.stringify({
      eventType,
      timestamp: new Date().toISOString(),
      environment: ENVIRONMENT,
      ...details,
    }),
  };

  try {
    const response = await cloudWatchLogsClient.send(
      new PutLogEventsCommand({
        logGroupName: LOG_GROUP,
        logStreamName,
        logEvents: [logEvent],
        sequenceToken,
      })
    );
    sequenceToken = response.nextSequenceToken;
  } catch (error: any) {
    // Handle sequence token issues
    if (error.name === 'InvalidSequenceTokenException') {
      sequenceToken = error.expectedSequenceToken;
      // Retry
      await logSecurityEvent(eventType, details);
    } else {
      logger.error('Failed to log security event', { error, eventType });
    }
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Sanitize API path for metrics (remove IDs)
 */
function sanitizePath(path: string): string {
  // Replace UUIDs and numeric IDs with placeholder
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+/g, '/:id');
}

/**
 * Hash IP address for privacy (don't store raw IPs)
 */
function hashIP(ip: string): string {
  // Simple hash for grouping - not for security
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `ip-${Math.abs(hash).toString(16)}`;
}

// =============================================================================
// EXPRESS MIDDLEWARE
// =============================================================================

/**
 * Express middleware for request monitoring
 */
export function monitoringMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();

    // Record on response finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      recordRequest(req.method, req.path, res.statusCode, duration);
    });

    next();
  };
}

// =============================================================================
// SCHEDULED TASKS
// =============================================================================

/**
 * Start periodic metrics collection
 */
export function startMetricsCollection(): void {
  // Record memory every minute
  setInterval(() => {
    recordMemoryUsage();
  }, 60000);

  // Create alarms on startup
  createAlarms().catch(error => {
    logger.error('Failed to create CloudWatch alarms', { error });
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  initializeCloudWatch,
  recordRequest,
  recordEndpointLatency,
  recordDatabaseQuery,
  recordAuthEvent,
  recordUnauthorizedAccess,
  recordPHIAccess,
  recordSecurityIncident,
  recordActiveSessions,
  recordConcurrentUsers,
  recordRateLimitEvent,
  recordClinicalNoteSubmission,
  recordAppointmentEvent,
  recordMemoryUsage,
  recordEventLoopLag,
  recordDatabasePoolStats,
  createAlarms,
  monitoringMiddleware,
  startMetricsCollection,
};
