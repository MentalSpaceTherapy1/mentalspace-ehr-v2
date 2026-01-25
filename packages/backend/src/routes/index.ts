/**
 * MentalSpace EHR - Main Route Index
 *
 * This file serves as the entry point for all API routes.
 * Routes are organized into versioned modules for maintainability.
 *
 * Route Structure:
 * - /health - Health check (no auth)
 * - /webhooks - Webhook handlers (signature verification)
 * - / - Version endpoint (no auth)
 * - /api/v1/* - All API routes (modular groups)
 *
 * The /api/v1 prefix is optional for backward compatibility.
 * Both /api/v1/clients and /clients will work.
 */
import { Router } from 'express';
import healthRoutes from './health.routes';
import versionRoutes from './version.routes';
import webhookRoutes from './webhook.routes';
import v1Routes from './v1';
import logger from '../utils/logger';

const router = Router();

// ============================================================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================================================

// Health check routes
router.use('/health', healthRoutes);

// Webhook routes (uses signature verification instead of auth)
router.use('/webhooks', webhookRoutes);

// Version endpoint
router.use('/', versionRoutes);

// ============================================================================
// API ROUTES
// ============================================================================

// API v1 routes with versioned prefix
router.use('/api/v1', v1Routes);

// Backward compatibility: Also mount v1 routes at root level
// This allows both /api/v1/clients and /clients to work
router.use('/', v1Routes);

logger.info('[ROUTES] All routes registered successfully');

export default router;
