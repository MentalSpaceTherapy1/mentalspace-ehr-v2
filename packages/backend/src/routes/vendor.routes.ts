/**
 * Vendor Routes
 *
 * Defines API routes for vendor management
 *
 * @module routes/vendor
 */

import { Router } from 'express';
import * as vendorController from '../controllers/vendor.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All vendor routes require authentication
router.use(authenticate);

// Vendor CRUD operations
router.post('/', vendorController.createVendor);
router.get('/attention-required', vendorController.getVendorsRequiringAttention);
router.get('/:id', vendorController.getVendor);
router.get('/', vendorController.listVendors);
router.put('/:id', vendorController.updateVendor);
router.delete('/:id', vendorController.deactivateVendor);

// Vendor metrics and analytics
router.get('/:id/performance', vendorController.getVendorPerformance);
router.get('/:id/spending', vendorController.getVendorSpending);

export default router;
