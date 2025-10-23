import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientStats,
} from '../controllers/client.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Client routes
router.get(
  '/',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'FRONT_DESK', 'BILLING_STAFF'),
  getAllClients
);
router.get(
  '/stats',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'BILLING_STAFF'),
  getClientStats
);
router.get(
  '/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'BILLING_STAFF'),
  getClientById
);
router.post('/', authorize('ADMINISTRATOR', 'SUPERVISOR'), createClient);
router.patch('/:id', authorize('ADMINISTRATOR', 'SUPERVISOR'), updateClient);
router.delete('/:id', authorize('ADMINISTRATOR', 'SUPERVISOR'), deleteClient);

export default router;
