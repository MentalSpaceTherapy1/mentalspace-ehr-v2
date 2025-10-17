import { Router } from 'express';
import { authenticate } from '../middleware/auth';
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
router.get('/', getAllClients);
router.get('/stats', getClientStats);
router.get('/:id', getClientById);
router.post('/', createClient);
router.patch('/:id', updateClient);
router.delete('/:id', deleteClient);

export default router;
