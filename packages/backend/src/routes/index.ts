import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MentalSpace EHR API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
router.use('/auth', authRoutes);

// Future routes will be added here:
// router.use('/users', userRoutes);
// router.use('/clients', clientRoutes);
// router.use('/appointments', appointmentRoutes);
// router.use('/notes', noteRoutes);
// etc.

export default router;
