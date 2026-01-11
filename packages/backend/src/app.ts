import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import config from './config';
import logger from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import { startHRJobs } from './jobs/hr-automation.job';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { csrfCookieParser, csrfProtection, generateCsrfToken, csrfErrorHandler } from './middleware/csrf';
import { sanitizationMiddleware } from './middleware/sanitization';
import { monitoringMiddleware } from './services/monitoring';
import { swaggerSpec } from './config/swagger';
import { apiRateLimiter } from './middleware/rateLimiter';
import routes from './routes';

// Create Express app
const app: Application = express();

// Trust proxy - required for ngrok and load balancers
// Set to 1 to trust the first proxy (safer than 'true')
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);

// Stripe webhook needs raw body for signature verification - MUST come before JSON parser
app.use('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input Sanitization (XSS, SQL injection, command injection prevention)
// HIPAA Security: Prevents injection attacks that could compromise PHI
app.use(sanitizationMiddleware);

// CSRF Protection - Cookie parser must come before CSRF middleware
app.use(csrfCookieParser);

// CSRF token endpoint - frontend calls this to get a token
app.get('/api/v1/csrf-token', (req: Request, res: Response) => {
  try {
    const token = generateCsrfToken(req, res);
    res.json({ csrfToken: token });
  } catch (error: any) {
    logger.error('Failed to generate CSRF token', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to generate CSRF token',
    });
  }
});

// Apply CSRF protection to all state-changing requests
// Skip for specific API routes that use different auth (e.g., webhook endpoints)
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  // EXTENSIVE DEBUG LOGGING for CSRF troubleshooting
  const reqPath = req.path;
  const isAuthPath = reqPath.includes('/auth/');
  const isRefreshPath = reqPath.includes('refresh');

  // Log ALL auth-related requests for debugging
  if (isAuthPath || isRefreshPath) {
    logger.info('[CSRF MIDDLEWARE] Auth-related request', {
      path: reqPath,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      method: req.method,
      isAuthPath,
      isRefreshPath,
      pathStartsWithV1AuthRefresh: reqPath.startsWith('/v1/auth/refresh'),
      pathIncludesAuthRefresh: reqPath.includes('/auth/refresh'),
    });
  }

  // Skip CSRF for webhook endpoints that use signature verification
  if (reqPath.includes('/webhooks/')) {
    return next();
  }
  // Skip CSRF for health check
  if (reqPath === '/v1/health' || reqPath.startsWith('/v1/health/')) {
    return next();
  }
  // Skip CSRF for portal routes - they use Bearer token authentication, not cookies
  // Portal routes are protected by JWT validation, not CSRF cookies
  if (reqPath.startsWith('/v1/portal/')) {
    return next();
  }

  // Skip CSRF for auth endpoints (login, register, etc.) - they don't have cookies yet
  // These endpoints use rate limiting and account lockout for protection
  // Note: /auth/refresh is exempt because it validates the session token from cookies
  // and the frontend clears CSRF token on 401, creating a chicken-and-egg problem
  // IMPORTANT: Check with both startsWith and includes to handle different URL patterns
  const isExemptAuthRoute =
    // Staff/EHR auth routes
    reqPath.startsWith('/v1/auth/login') ||
    reqPath.startsWith('/v1/auth/register') ||
    reqPath.startsWith('/v1/auth/refresh') ||
    reqPath.startsWith('/v1/auth/forgot-password') ||
    reqPath.startsWith('/v1/auth/reset-password') ||
    reqPath.startsWith('/v1/auth/verify-email') ||
    reqPath.startsWith('/v1/auth/resend-verification') ||
    reqPath.startsWith('/v1/auth/mfa/complete') ||
    // Client Portal auth routes (use Bearer tokens, not cookies)
    reqPath.startsWith('/v1/portal-auth/login') ||
    reqPath.startsWith('/v1/portal-auth/register') ||
    reqPath.startsWith('/v1/portal-auth/activate') ||
    reqPath.startsWith('/v1/portal-auth/forgot-password') ||
    reqPath.startsWith('/v1/portal-auth/reset-password') ||
    reqPath.startsWith('/v1/portal-auth/verify-email') ||
    reqPath.startsWith('/v1/portal-auth/resend-verification') ||
    // Also check without /v1 prefix in case of different routing
    reqPath === '/auth/refresh' ||
    reqPath.startsWith('/auth/refresh');

  if (isExemptAuthRoute) {
    logger.info('[CSRF MIDDLEWARE] Skipping CSRF for exempt auth route', {
      path: reqPath,
      method: req.method,
    });
    return next();
  }

  // Log when CSRF protection WILL be applied (for debugging 403s)
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    logger.info('[CSRF MIDDLEWARE] Applying CSRF protection', {
      path: reqPath,
      method: req.method,
      hasCsrfHeader: !!req.headers['x-csrf-token'],
      csrfCookiePresent: !!req.cookies?.['csrf-token'],
    });
  }

  return csrfProtection(req, res, next);
});

// CSRF error handler
// Note: csrf-csrf library throws error instances, not the class itself
// Check for CSRF errors by code or message
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const isCsrfError = err.code === 'EBADCSRFTOKEN' ||
                      err.message?.includes('csrf') ||
                      err.message?.includes('CSRF') ||
                      err.name === 'InvalidCsrfTokenError';

  if (isCsrfError) {
    logger.error('[CSRF ERROR] Token validation failed', {
      ip: req.ip,
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      method: req.method,
      errorCode: err.code,
      errorName: err.name,
      errorMessage: err.message,
      hasCsrfHeader: !!req.headers['x-csrf-token'],
      csrfHeaderValue: req.headers['x-csrf-token'] ? 'present' : 'missing',
      csrfCookiePresent: !!req.cookies?.['csrf-token'],
      allCookieNames: Object.keys(req.cookies || {}),
    });
    return res.status(403).json({
      success: false,
      error: 'Invalid or missing CSRF token',
      debug: {
        path: req.path,
        method: req.method,
      },
    });
  }
  next(err);
});

// Compression middleware
app.use(compression());

// Request logging
app.use(requestLogger);

// Monitoring middleware (CloudWatch metrics, request tracking)
// HIPAA Audit: Tracks all API requests, latency, and errors
app.use(monitoringMiddleware);

// Rate limiting - Uses Redis when REDIS_URL is set, otherwise in-memory
// Supports RATE_LIMIT_WHITELIST env var for admin IP bypass
app.use('/api', apiRateLimiter);

// Swagger API Documentation
// Note: In production, this should be protected or disabled
const swaggerOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MentalSpace EHR API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
  },
};

// Serve Swagger JSON spec
app.get('/api/v1/docs/swagger.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Swagger UI - protected in production
if (config.nodeEnv !== 'production' || process.env.ENABLE_SWAGGER_UI === 'true') {
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
  logger.info('📚 Swagger documentation available at /api/v1/docs');
}

// API routes
app.use('/api/v1', routes);
// Backward compatibility: also mount at /api for older frontend builds
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MentalSpace EHR API',
    version: '2.0.0',
    documentation: '/api/v1/health',
  });
});

// Initialize HR automation cron jobs
// Runs scheduled tasks for performance reviews, PTO accruals, attendance compliance
if (config.nodeEnv !== 'test') {
  startHRJobs();
  logger.info('📅 HR automation cron jobs initialized');
}

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
