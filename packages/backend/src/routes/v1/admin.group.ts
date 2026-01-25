/**
 * Administration Route Group
 * Practice Settings, Admin Tools, AI Features
 */
import { Router } from 'express';
import adminRoutes from '../admin.routes';
import practiceSettingsRoutes from '../practiceSettings.routes';
import productivityRoutes from '../productivity.routes';
import aiRoutes from '../ai.routes';
import aiAssistantRoutes from '../aiAssistant.routes';
import messagingRoutes from '../messaging.routes';
import documentRoutes from '../document.routes';
import vendorRoutes from '../vendor.routes';
import budgetRoutes from '../budget.routes';
import expenseRoutes from '../expense.routes';
import purchaseOrderRoutes from '../purchase-order.routes';

const router = Router();

// Admin tools
router.use('/admin', adminRoutes);

// Practice settings
router.use('/practice-settings', practiceSettingsRoutes);

// Productivity tracking
router.use('/productivity', productivityRoutes);

// AI features
router.use('/ai', aiRoutes);
router.use('/ai/assistant', aiAssistantRoutes);

// Communication
router.use('/messages', messagingRoutes);
router.use('/documents', documentRoutes);

// Financial administration
router.use('/vendors', vendorRoutes);
router.use('/budgets', budgetRoutes);
router.use('/expenses', expenseRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);

export default router;
