import winston from 'winston';
import config from '../config';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format to add correlation ID and structured metadata
const addMetadata = winston.format((info) => {
  return {
    ...info,
    environment: config.nodeEnv,
    hostname: process.env.HOSTNAME || 'unknown',
    pid: process.pid,
  };
});

// Define structured log format with enhanced metadata
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  addMetadata(),
  winston.format.splat(),
  winston.format.json()
);

// Create enhanced console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    // Remove system metadata from console output for cleaner display
    const { environment, hostname, pid, ...displayMeta } = meta;

    let metaString = '';
    if (Object.keys(displayMeta).length > 0) {
      // Pretty print metadata with indentation
      metaString = `\n  ${JSON.stringify(displayMeta, null, 2).replace(/\n/g, '\n  ')}`;
    }
    return `${timestamp} [${level}] [${service || 'app'}]: ${message}${metaString}`;
  })
);

// Create main application logger
const logger = winston.createLogger({
  level: config.logLevel || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'mentalspace-backend',
    version: process.env.APP_VERSION || '1.0.0',
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.nodeEnv === 'production' ? logFormat : consoleFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

// Add file transports in production and staging
if (config.nodeEnv === 'production' || config.nodeEnv === 'staging') {
  // Error logs
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
      handleExceptions: true,
    })
  );

  // Warning logs
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, 'warn.log'),
      level: 'warn',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true,
    })
  );

  // Combined logs (all levels)
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 7,
      tailable: true,
    })
  );

  // Info logs (separate for easier filtering)
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, 'info.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 3,
      tailable: true,
    })
  );
}

// Create audit logger for HIPAA compliance and security tracking
export const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    addMetadata(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'mentalspace-audit',
    logType: 'AUDIT',
  },
  transports: [
    // Console transport for CloudWatch in containerized environments
    new winston.transports.Console({
      format: logFormat,
    }),
    // Audit logs - critical for compliance, keep longer
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      maxsize: 20971520, // 20MB
      maxFiles: 90, // Keep 90 days of audit logs for compliance
      tailable: true,
    }),
  ],
});

// Create performance logger for monitoring and optimization
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    addMetadata(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'mentalspace-performance',
    logType: 'PERFORMANCE',
  },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'performance.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 7,
      tailable: true,
    }),
  ],
});

// Create security logger for security events
export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    addMetadata(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'mentalspace-security',
    logType: 'SECURITY',
  },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      maxsize: 20971520, // 20MB
      maxFiles: 30,
      tailable: true,
    }),
  ],
});

// Helper function to log API requests with performance metrics
export const logRequest = (req: any, res: any, duration: number) => {
  const logData = {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.userId,
    userRole: req.user?.role,
  };

  if (duration > 1000) {
    logger.warn('Slow API request', logData);
    performanceLogger.warn('Slow request detected', logData);
  } else {
    logger.info('API request', logData);
  }
};

// Helper function to log database queries with performance
export const logQuery = (operation: string, model: string, duration: number, metadata?: any) => {
  const logData = {
    operation,
    model,
    duration: `${duration}ms`,
    ...metadata,
  };

  if (duration > 500) {
    performanceLogger.warn('Slow database query', logData);
  } else {
    performanceLogger.info('Database query', logData);
  }
};

// Helper function to log audit events
export const logAudit = (
  action: string,
  userId: string,
  resourceType: string,
  resourceId: string,
  metadata?: any
) => {
  auditLogger.info('Audit event', {
    action,
    userId,
    resourceType,
    resourceId,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};

// Helper function to log security events
export const logSecurity = (
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  metadata?: any
) => {
  securityLogger.warn('Security event', {
    event,
    severity,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};

/**
 * Sanitized error logging for controllers
 * HIPAA-compliant: Only logs error type and context, never PHI or full error objects
 * @param context - Description of where error occurred (e.g., 'Get clients')
 * @param error - The error object (will extract only safe properties)
 * @param metadata - Additional safe context (userId, action, etc.)
 */
export const logControllerError = (
  context: string,
  error: unknown,
  metadata?: Record<string, any>
) => {
  const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const safeErrorInfo: any = {
    errorId,
    context,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  // Add error message only if it's a known app error or validation error
  if (error instanceof Error) {
    // For Prisma errors, only log error code, not full message
    if (error.constructor.name.includes('Prisma')) {
      safeErrorInfo.prismaCode = (error as any).code;
    } else {
      // For app errors, log message (assumed to be safe)
      safeErrorInfo.message = error.message;
    }
  }

  logger.error(context, safeErrorInfo);

  return errorId;
};

export default logger;
