/**
 * Billing & Insurance Route Group
 * Module 5: Billing, Insurance, Payers, Claims, AdvancedMD Integration
 */
import { Router } from 'express';
import billingRoutes from '../billing.routes';
import insuranceRoutes from '../insurance.routes';
import serviceCodeRoutes from '../serviceCode.routes';
import payerRoutes from '../payer.routes';
import payerRuleRoutes from '../payerRule.routes';
import billingHoldRoutes from '../billingHold.routes';
import priorAuthorizationRoutes from '../priorAuthorization.routes';
import advancedMDRoutes from '../advancedmd.routes';
import advancedMDBillingRoutes from '../advancedmd-billing.routes';
import advancedMDEligibilityRoutes from '../advancedmd-eligibility.routes';
import advancedMDClaimsRoutes from '../advancedmd-claims.routes';
import advancedMDERARoutes from '../advancedmd-era.routes';

const router = Router();

// Core billing
router.use('/billing', billingRoutes);
router.use('/service-codes', serviceCodeRoutes);

// Insurance management
router.use('/insurance', insuranceRoutes);
router.use('/payers', payerRoutes);
router.use('/payer-rules', payerRuleRoutes);
router.use('/billing-holds', billingHoldRoutes);
router.use('/prior-authorizations', priorAuthorizationRoutes);

// AdvancedMD Integration
router.use('/advancedmd', advancedMDRoutes);
router.use('/advancedmd/billing', advancedMDBillingRoutes);
router.use('/advancedmd/eligibility', advancedMDEligibilityRoutes);
router.use('/advancedmd/claims', advancedMDClaimsRoutes);
router.use('/advancedmd/era', advancedMDERARoutes);

export default router;
