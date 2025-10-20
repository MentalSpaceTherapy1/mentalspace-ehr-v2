import { Router } from 'express';
import {
  getAllServiceCodes,
  getServiceCodeById,
  getServiceCodeByCode,
  createServiceCode,
  updateServiceCode,
  deleteServiceCode,
} from '../controllers/serviceCode.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public/authenticated routes
router.get('/', authenticate, getAllServiceCodes);
router.get('/:id', authenticate, getServiceCodeById);
router.get('/code/:code', authenticate, getServiceCodeByCode);

// Admin/Supervisor only routes
router.post('/', authenticate, authorize('ADMINISTRATOR', 'SUPERVISOR'), createServiceCode);
router.put('/:id', authenticate, authorize('ADMINISTRATOR', 'SUPERVISOR'), updateServiceCode);
router.delete('/:id', authenticate, authorize('ADMINISTRATOR'), deleteServiceCode);

export default router;
