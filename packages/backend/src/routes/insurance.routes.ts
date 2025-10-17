import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getClientInsurance,
  getInsuranceById,
  createInsurance,
  updateInsurance,
  deleteInsurance,
  verifyInsurance,
} from '../controllers/insurance.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Insurance routes
router.get('/client/:clientId', getClientInsurance);
router.get('/:id', getInsuranceById);
router.post('/', createInsurance);
router.patch('/:id', updateInsurance);
router.delete('/:id', deleteInsurance);
router.post('/:id/verify', verifyInsurance);

export default router;
