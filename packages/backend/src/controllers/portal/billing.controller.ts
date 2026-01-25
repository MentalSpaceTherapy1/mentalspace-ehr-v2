import { Response } from 'express';
import logger from '../../utils/logger';
import prisma from '../../services/database';
import { PortalRequest } from '../../types/express.d';
import * as billingService from '../../services/portal/billing.service';
import { sendSuccess, sendBadRequest, sendUnauthorized, sendServerError } from '../../utils/apiResponse';
import { getErrorMessage, getErrorCode } from '../../utils/errorHelpers';

/**
 * Get balance information for client
 * GET /api/v1/portal/billing/balance
 */
export const getBalance = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Get all charges for the client
    const charges = await prisma.chargeEntry.findMany({
      where: { clientId },
    });

    // Get all payments for the client
    const payments = await prisma.paymentRecord.findMany({
      where: { clientId },
    });

    // Calculate totals
    const totalCharges = charges.reduce((sum, charge) => sum + charge.chargeAmount.toNumber(), 0);
    const totalPayments = payments.reduce((sum, payment) => sum + payment.paymentAmount.toNumber(), 0);
    const currentBalance = totalCharges - totalPayments;

    // Get last payment info
    const lastPayment = payments.length > 0
      ? payments.sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime())[0]
      : null;

    logger.info(`Retrieved balance for client ${clientId}: $${currentBalance.toFixed(2)}`);

    return sendSuccess(res, {
      currentBalance,
      totalCharges,
      totalPayments,
      lastPaymentDate: lastPayment?.paymentDate || null,
      lastPaymentAmount: lastPayment ? lastPayment.paymentAmount.toNumber() : null,
    });
  } catch (error) {
    logger.error('Error fetching balance:', error);
    return sendServerError(res, 'Failed to fetch balance information');
  }
};

/**
 * Get charges for client
 * GET /api/v1/portal/billing/charges
 */
export const getCharges = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const charges = await prisma.chargeEntry.findMany({
      where: { clientId },
      orderBy: { serviceDate: 'desc' },
    });

    const formattedCharges = charges.map(charge => ({
      id: charge.id,
      serviceDate: charge.serviceDate,
      cptCode: charge.cptCode,
      description: charge.cptDescription,
      amount: charge.chargeAmount.toNumber(),
      appointmentId: charge.appointmentId,
    }));

    logger.info(`Retrieved ${formattedCharges.length} charges for client ${clientId}`);

    return sendSuccess(res, formattedCharges);
  } catch (error) {
    logger.error('Error fetching charges:', error);
    return sendServerError(res, 'Failed to fetch charges');
  }
};

/**
 * Get payment history for client
 * GET /api/v1/portal/billing/payments
 */
export const getPayments = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const payments = await prisma.paymentRecord.findMany({
      where: { clientId },
      orderBy: { paymentDate: 'desc' },
    });

    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      paymentDate: payment.paymentDate,
      amount: payment.paymentAmount.toNumber(),
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
    }));

    logger.info(`Retrieved ${formattedPayments.length} payments for client ${clientId}`);

    return sendSuccess(res, formattedPayments);
  } catch (error) {
    logger.error('Error fetching payments:', error);
    return sendServerError(res, 'Failed to fetch payment history');
  }
};

/**
 * Process a payment via Stripe
 * POST /api/v1/portal/billing/payments
 */
export const makePayment = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { amount, paymentMethodId, description } = req.body;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Validate amount
    if (!amount || amount <= 0) {
      return sendBadRequest(res, 'Invalid payment amount');
    }

    // Calculate current balance to validate payment
    const balanceInfo = await billingService.getCurrentBalance(clientId);

    // Validate payment doesn't exceed balance
    if (amount > balanceInfo.currentBalance) {
      return sendBadRequest(res, 'Payment amount cannot exceed current balance');
    }

    // Process payment via Stripe using billing service
    const result = await billingService.makePayment({
      clientId,
      amount,
      paymentMethodId,
      description: description || 'Client Portal Payment',
    });

    logger.info(`Payment processed for client ${clientId}: $${amount} (${result.stripePaymentIntent})`);

    return sendSuccess(res, {
      id: result.paymentRecord.id,
      amount: result.paymentRecord.paymentAmount,
      transactionId: result.stripePaymentIntent,
      paymentDate: result.paymentRecord.paymentDate,
    }, 'Payment processed successfully');
  } catch (error) {
    logger.error('Error processing payment:', error);

    // Handle specific error messages from Stripe
    const message = getErrorMessage(error) || 'Failed to process payment';
    return sendServerError(res, message);
  }
};
