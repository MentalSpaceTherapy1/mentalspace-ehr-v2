import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Version endpoint - returns deployment information
 * Used for verifying deployments and tracking which version is running
 */
router.get('/version', (req: Request, res: Response) => {
  res.status(200).json({
    gitSha: process.env.GIT_SHA || 'unknown',
    buildTime: process.env.BUILD_TIME || 'unknown',
    nodeEnv: process.env.NODE_ENV || 'unknown',
    version: '2.0.0',
    service: 'mentalspace-backend',
  });
});

export default router;
