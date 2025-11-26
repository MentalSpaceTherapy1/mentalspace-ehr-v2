import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import config from './config';
import logger from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { csrfCookieParser, csrfProtection, generateCsrfToken, csrfErrorHandler } from './middleware/csrf';
import { sanitizationMiddleware } from './middleware/sanitization';
import { monitoringMiddleware } from './services/monitoring';
import { swaggerSpec } from './config/swagger';
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
  const token = generateCsrfToken(req, res);
  res.json({ csrfToken: token });
});

// Apply CSRF protection to all state-changing requests
// Skip for specific API routes that use different auth (e.g., webhook endpoints)
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for webhook endpoints that use signature verification
  if (req.path.includes('/webhooks/')) {
    return next();
  }
  // Skip CSRF for health check
  if (req.path === '/v1/health') {
    return next();
  }
  return csrfProtection(req, res, next);
});

// CSRF error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err === csrfErrorHandler) {
    logger.warn('CSRF token validation failed', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    return res.status(403).json({
      success: false,
      error: 'Invalid or missing CSRF token',
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
app.use(monitoringMiddleware());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

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

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MentalSpace EHR API',
    version: '2.0.0',
    documentation: '/api/v1/health',
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
