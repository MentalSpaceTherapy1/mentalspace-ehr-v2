import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedPortalRequest } from '../../middleware/portalAuth';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

/**
 * Get balance information for client
 * GET /api/v1/portal/billing/balance
 */
export const getBalance = async (req: AuthenticatedPortalRequest, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
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
    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
    const currentBalance = totalCharges - totalPayments;

    // Get last payment info
    const lastPayment = payments.length > 0
      ? payments.sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime())[0]
      : null;

    logger.info(`Retrieved balance for client ${clientId}: $${currentBalance.toFixed(2)}`);

    return res.status(200).json({
      success: true,
      data: {
        currentBalance,
        totalCharges,
        totalPayments,
        lastPaymentDate: lastPayment?.paymentDate || null,
        lastPaymentAmount: lastPayment ? lastPayment.amount.toNumber() : null,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching balance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch balance information',
    });
  }
};

/**
 * Get charges for client
 * GET /api/v1/portal/billing/charges
 */
export const getCharges = async (req: AuthenticatedPortalRequest, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
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

    return res.status(200).json({
      success: true,
      data: formattedCharges,
    });
  } catch (error: any) {
    logger.error('Error fetching charges:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch charges',
    });
  }
};

/**
 * Get payment history for client
 * GET /api/v1/portal/billing/payments
 */
export const getPayments = async (req: AuthenticatedPortalRequest, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const payments = await prisma.paymentRecord.findMany({
      where: { clientId },
      orderBy: { paymentDate: 'desc' },
    });

    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      paymentDate: payment.paymentDate,
      amount: payment.amount.toNumber(),
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      confirmationNumber: payment.confirmationNumber,
    }));

    logger.info(`Retrieved ${formattedPayments.length} payments for client ${clientId}`);

    return res.status(200).json({
      success: true,
      data: formattedPayments,
    });
  } catch (error: any) {
    logger.error('Error fetching payments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
    });
  }
};

/**
 * Process a payment
 * POST /api/v1/portal/billing/payments
 */
export const makePayment = async (req: AuthenticatedPortalRequest, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const { amount, paymentMethod } = req.body;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment amount',
      });
    }

    // Calculate current balance
    const charges = await prisma.chargeEntry.findMany({
      where: { clientId },
    });
    const payments = await prisma.paymentRecord.findMany({
      where: { clientId },
    });

    const totalCharges = charges.reduce((sum, charge) => sum + charge.chargeAmount.toNumber(), 0);
    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
    const currentBalance = totalCharges - totalPayments;

    // Validate payment doesn't exceed balance
    if (amount > currentBalance) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount cannot exceed current balance',
      });
    }

    // TODO: In production, integrate with payment processor (Stripe, Square, etc.)
    // For now, we'll create a simulated successful payment

    const confirmationNumber = `PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const payment = await prisma.paymentRecord.create({
      data: {
        clientId,
        amount,
        paymentDate: new Date(),
        paymentMethod: paymentMethod || 'Credit Card',
        status: 'PROCESSED',
        confirmationNumber,
        notes: 'Payment processed via client portal',
      },
    });

    logger.info(`Payment processed for client ${clientId}: $${amount} (${confirmationNumber})`);

    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        id: payment.id,
        amount: payment.amount.toNumber(),
        confirmationNumber: payment.confirmationNumber,
        paymentDate: payment.paymentDate,
        status: payment.status,
      },
    });
  } catch (error: any) {
    logger.error('Error processing payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process payment',
    });
  }
};
