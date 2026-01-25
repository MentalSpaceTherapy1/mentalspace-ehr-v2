/**
 * Authentication & User Management Route Group
 * Module 1: Authentication, Sessions, MFA
 */
import { Router } from 'express';
import authRoutes from '../auth.routes';
import portalAuthRoutes from '../portalAuth.routes';
import sessionRoutes from '../session.routes';
import mfaRoutes from '../mfa.routes';
import userRoutes from '../user.routes';

const router = Router();

// Core authentication
router.use('/auth', authRoutes);
router.use('/portal-auth', portalAuthRoutes);

// Session management
router.use('/sessions', sessionRoutes);

// Multi-Factor Authentication
router.use('/mfa', mfaRoutes);

// User management
router.use('/users', userRoutes);

export default router;
