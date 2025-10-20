import Stripe from 'stripe';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';
import config from '../../config';
import prisma from '../database';

const stripe = config.stripeApiKey ? new Stripe(config.stripeApiKey, {
  apiVersion: '2025-09-30.clover',
}) : null;

// ============================================================================
// PAYMENT METHODS
// ============================================================================

export async function addPaymentMethod(data: {
  clientId: string;
  stripeToken: string;
}) {
  try {
    // Get client to find or create Stripe customer
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!client) {
      throw new AppError('Client not found', 404);
    }

    // Create or get Stripe customer ID
    // In a real implementation, you'd store stripeCustomerId on Client model
    const customer = await stripe.customers.create({
      email: client.email || undefined,
      name: `${client.firstName} ${client.lastName}`,
      metadata: {
        clientId: client.id,
      },
    });

    // Attach payment method to customer
    const paymentMethod = await stripe.paymentMethods.attach(data.stripeToken, {
      customer: customer.id,
    });

    // Save to database
    const savedPaymentMethod = await prisma.paymentMethod.create({
      data: {
        clientId: data.clientId,
        stripePaymentMethodId: paymentMethod.id,
        cardBrand: paymentMethod.card?.brand || 'unknown',
        cardLast4: paymentMethod.card?.last4 || '0000',
        cardExpMonth: paymentMethod.card?.exp_month || 1,
        cardExpYear: paymentMethod.card?.exp_year || 2099,
        isDefault: true, // First card is default
      },
    });

    logger.info(`Payment method added for client ${data.clientId}`);
    return savedPaymentMethod;
  } catch (error) {
    logger.error('Error adding payment method:', error);
    throw new AppError('Failed to add payment method', 500);
  }
}

export async function getPaymentMethods(clientId: string) {
  try {
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });

    return paymentMethods;
  } catch (error) {
    logger.error('Error fetching payment methods:', error);
    throw new AppError('Failed to fetch payment methods', 500);
  }
}

export async function setDefaultPaymentMethod(data: {
  clientId: string;
  paymentMethodId: string;
}) {
  try {
    // Remove default from all other methods
    await prisma.paymentMethod.updateMany({
      where: { clientId: data.clientId },
      data: { isDefault: false },
    });

    // Set new default
    const updated = await prisma.paymentMethod.update({
      where: { id: data.paymentMethodId },
      data: { isDefault: true },
    });

    return updated;
  } catch (error) {
    logger.error('Error setting default payment method:', error);
    throw new AppError('Failed to set default payment method', 500);
  }
}

export async function removePaymentMethod(data: {
  clientId: string;
  paymentMethodId: string;
}) {
  try {
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: data.paymentMethodId,
        clientId: data.clientId,
      },
    });

    if (!paymentMethod) {
      throw new AppError('Payment method not found', 404);
    }

    // Detach from Stripe
    await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);

    // Delete from database
    await prisma.paymentMethod.delete({
      where: { id: data.paymentMethodId },
    });

    logger.info(`Payment method ${data.paymentMethodId} removed for client ${data.clientId}`);
    return { success: true };
  } catch (error) {
    logger.error('Error removing payment method:', error);
    throw new AppError('Failed to remove payment method', 500);
  }
}

// ============================================================================
// BILLING STATEMENTS
// ============================================================================

export async function getBillingStatements(clientId: string) {
  try {
    // Get statements from existing EHR billing module
    const statements = await prisma.clientStatement.findMany({
      where: { clientId },
      orderBy: { statementDate: 'desc' },
      take: 12, // Last 12 months
    });

    return statements;
  } catch (error) {
    logger.error('Error fetching billing statements:', error);
    throw new AppError('Failed to fetch billing statements', 500);
  }
}

export async function getCurrentBalance(clientId: string) {
  try {
    // Calculate current balance from charges and payments
    const charges = await prisma.chargeEntry.aggregate({
      where: {
        clientId,
      },
      _sum: { chargeAmount: true },
    });

    const payments = await prisma.paymentRecord.aggregate({
      where: { clientId },
      _sum: { paymentAmount: true },
    });

    const balance = (charges._sum.chargeAmount?.toNumber() || 0) - (payments._sum.paymentAmount?.toNumber() || 0);

    return {
      currentBalance: balance,
      totalCharges: charges._sum.chargeAmount?.toNumber() || 0,
      totalPayments: payments._sum.paymentAmount?.toNumber() || 0,
    };
  } catch (error) {
    logger.error('Error calculating current balance:', error);
    throw new AppError('Failed to calculate balance', 500);
  }
}

// ============================================================================
// PAYMENTS
// ============================================================================

export async function makePayment(data: {
  clientId: string;
  amount: number;
  paymentMethodId?: string;
  description?: string;
}) {
  try {
    // Get client and payment method
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!client) {
      throw new AppError('Client not found', 404);
    }

    let paymentMethodId = data.paymentMethodId;

    // If no payment method specified, use default
    if (!paymentMethodId) {
      const defaultMethod = await prisma.paymentMethod.findFirst({
        where: { clientId: data.clientId, isDefault: true },
      });

      if (!defaultMethod) {
        throw new AppError('No payment method found', 400);
      }

      paymentMethodId = defaultMethod.id;
    }

    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod || paymentMethod.clientId !== data.clientId) {
      throw new AppError('Invalid payment method', 400);
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(data.amount * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethod.stripePaymentMethodId,
      confirm: true,
      description: data.description || 'MentalSpace EHR Payment',
      metadata: {
        clientId: data.clientId,
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });

    if (paymentIntent.status !== 'succeeded') {
      throw new AppError('Payment failed', 400);
    }

    // Record payment in EHR billing system
    const paymentRecord = await prisma.paymentRecord.create({
      data: {
        clientId: data.clientId,
        paymentAmount: data.amount,
        paymentDate: new Date(),
        paymentSource: 'Client',
        paymentMethod: 'Card',
        transactionId: paymentIntent.id,
        cardLast4: paymentMethod.cardLast4,
        appliedPaymentsJson: [],
      } as any,
    });

    logger.info(`Payment of $${data.amount} processed for client ${data.clientId}`);

    return {
      success: true,
      paymentRecord,
      stripePaymentIntent: paymentIntent.id,
    };
  } catch (error) {
    logger.error('Error processing payment:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to process payment', 500);
  }
}

export async function getPaymentHistory(clientId: string, limit = 20) {
  try {
    const payments = await prisma.paymentRecord.findMany({
      where: { clientId },
      orderBy: { paymentDate: 'desc' },
      take: limit,
    });

    return payments;
  } catch (error) {
    logger.error('Error fetching payment history:', error);
    throw new AppError('Failed to fetch payment history', 500);
  }
}

// ============================================================================
// INSURANCE CLAIM STATUS
// ============================================================================

export async function getInsuranceClaimStatus(clientId: string) {
  try {
    // Get recent charges with insurance submission status
    const charges = await prisma.chargeEntry.findMany({
      where: {
        clientId,
      },
      orderBy: { serviceDate: 'desc' },
      take: 10,
      select: {
        id: true,
        serviceDate: true,
        chargeAmount: true,
        claimStatus: true,
        denialReason: true,
      },
    });

    return charges.map((charge) => ({
      ...charge,
      amount: charge.chargeAmount,
      status: charge.claimStatus || 'PENDING',
    }));
  } catch (error) {
    logger.error('Error fetching insurance claim status:', error);
    throw new AppError('Failed to fetch insurance claim status', 500);
  }
}
