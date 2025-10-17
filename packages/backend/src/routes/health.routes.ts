import { Router, Request, Response } from 'express';
import { PrismaClient } from '@mentalspace/database';

const router = Router();
const prisma = new PrismaClient();

/**
 * Basic health check endpoint - no authentication required
 * Used by load balancers and monitoring services
 */
router.get('/', async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
  });
});

/**
 * Detailed health check with dependency checks
 * Checks database connectivity and other critical services
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const healthChecks: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    status: 'healthy',
    checks: {
      api: { status: 'healthy', message: 'API is running' },
      database: { status: 'unknown', message: 'Not checked' },
      memory: { status: 'unknown', message: 'Not checked' },
    },
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    healthChecks.checks.database = {
      status: 'healthy',
      message: 'Database connection successful',
      responseTime: '<100ms',
    };
  } catch (error: any) {
    healthChecks.checks.database = {
      status: 'unhealthy',
      message: 'Database connection failed',
      error: error.message,
    };
    healthChecks.status = 'unhealthy';
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024),
  };

  healthChecks.checks.memory = {
    status: memoryUsageMB.heapUsed < 500 ? 'healthy' : 'warning',
    message: 'Memory usage within acceptable range',
    usage: memoryUsageMB,
  };

  // Check uptime
  healthChecks.uptime = process.uptime();

  // Return appropriate status code
  const statusCode = healthChecks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthChecks);
});

/**
 * Readiness check - returns 200 when application is ready to serve traffic
 * Used by Kubernetes/ECS for readiness probes
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check critical dependencies
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      ready: false,
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * Liveness check - returns 200 if application is alive
 * Used by Kubernetes/ECS for liveness probes
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;
