import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getClientGuardians,
  getGuardianById,
  createGuardian,
  updateGuardian,
  deleteGuardian,
} from '../controllers/guardian.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Guardian routes
router.get('/client/:clientId', getClientGuardians);
router.get('/:id', getGuardianById);
router.post('/', createGuardian);
router.patch('/:id', updateGuardian);
router.delete('/:id', deleteGuardian);

export default router;
