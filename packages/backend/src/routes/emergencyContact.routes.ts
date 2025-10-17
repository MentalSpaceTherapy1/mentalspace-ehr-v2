import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getEmergencyContacts,
  getEmergencyContactById,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
} from '../controllers/emergencyContact.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Emergency contact routes
router.get('/client/:clientId', getEmergencyContacts);
router.get('/:id', getEmergencyContactById);
router.post('/', createEmergencyContact);
router.patch('/:id', updateEmergencyContact);
router.delete('/:id', deleteEmergencyContact);

export default router;
