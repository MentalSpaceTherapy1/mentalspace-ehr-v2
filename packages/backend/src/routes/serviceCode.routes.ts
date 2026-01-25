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
import { UserRoles } from '@mentalspace/shared';

const router = Router();

// Public/authenticated routes
router.get('/', authenticate, getAllServiceCodes);
router.get('/:id', authenticate, getServiceCodeById);
router.get('/code/:code', authenticate, getServiceCodeByCode);

// Admin/Supervisor only routes
router.post('/', authenticate, authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR), createServiceCode);
router.put('/:id', authenticate, authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR), updateServiceCode);
router.delete('/:id', authenticate, authorize(UserRoles.ADMINISTRATOR), deleteServiceCode);

export default router;
