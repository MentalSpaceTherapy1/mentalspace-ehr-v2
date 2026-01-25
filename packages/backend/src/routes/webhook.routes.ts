import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import config from '../config';
import logger from '../utils/logger';
import prisma from '../services/database';

const router = Router();

// Initialize Stripe
const stripe = config.stripeApiKey
  ? new Stripe(config.stripeApiKey, { apiVersion: '2025-10-29.clover' })
  : null;

/**
 * Stripe Webhook Handler
 * POST /api/v1/webhooks/stripe
 *
 * Handles Stripe payment events:
 * - payment_intent.succeeded: Payment completed successfully
 * - payment_intent.payment_failed: Payment failed
 * - charge.refunded: Payment was refunded
 */
router.post(
  '/stripe',
  // Use express.raw() for this route - Stripe needs the raw body for signature verification
  // Note: This is configured in app.ts before JSON parsing
  async (req: Request, res: Response) => {
    if (!stripe || !config.stripeWebhookSecret) {
      logger.warn('Stripe webhook received but Stripe is not configured');
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    const sig = req.headers['stripe-signature'];

    if (!sig) {
      logger.warn('Stripe webhook received without signature');
      return res.status(400).json({ error: 'No signature provided' });
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature - req.body must be raw buffer
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        config.stripeWebhookSecret
      );
    } catch (err: unknown) {
      logger.error('Stripe webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    logger.info(`Stripe webhook received: ${event.type}`, { eventId: event.id });

    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await handlePaymentSuccess(paymentIntent);
          break;
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await handlePaymentFailure(paymentIntent);
          break;
        }

        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge;
          await handleRefund(charge);
          break;
        }

        default:
          logger.info(`Unhandled Stripe event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: unknown) {
      logger.error('Error processing Stripe webhook:', error);
      // Return 200 to prevent Stripe from retrying - we'll handle the error internally
      res.json({ received: true, error: error.message });
    }
  }
);

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const clientId = paymentIntent.metadata?.clientId;

  if (!clientId) {
    logger.warn('Payment succeeded but no clientId in metadata', {
      paymentIntentId: paymentIntent.id,
    });
    return;
  }

  logger.info(`Payment succeeded for client ${clientId}`, {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount / 100,
  });

  // Check if payment record already exists (created during initial payment)
  const existingPayment = await prisma.paymentRecord.findFirst({
    where: { transactionId: paymentIntent.id },
  });

  if (existingPayment) {
    // Payment record already created during the API call
    logger.info(`Payment record already exists for ${paymentIntent.id}`);
    return;
  }

  // Create payment record if it doesn't exist (fallback)
  await prisma.paymentRecord.create({
    data: {
      clientId,
      paymentAmount: paymentIntent.amount / 100,
      paymentDate: new Date(),
      paymentSource: 'Client',
      paymentMethod: 'Card',
      transactionId: paymentIntent.id,
      appliedPaymentsJson: [],
    } as any,
  });

  logger.info(`Created payment record from webhook for ${paymentIntent.id}`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const clientId = paymentIntent.metadata?.clientId;

  logger.warn(`Payment failed for client ${clientId || 'unknown'}`, {
    paymentIntentId: paymentIntent.id,
    error: paymentIntent.last_payment_error?.message,
  });

  // Could notify client or staff about failed payment
  // TODO: Send notification email about payment failure
}

/**
 * Handle refund
 */
async function handleRefund(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) {
    logger.warn('Refund processed but no payment_intent', { chargeId: charge.id });
    return;
  }

  logger.info(`Refund processed`, {
    chargeId: charge.id,
    paymentIntentId,
    refundedAmount: charge.amount_refunded / 100,
  });

  // Find the original payment record
  const originalPayment = await prisma.paymentRecord.findFirst({
    where: { transactionId: paymentIntentId },
  });

  if (!originalPayment) {
    logger.warn(`Original payment not found for refund`, { paymentIntentId });
    return;
  }

  // Create a negative payment record for the refund
  await prisma.paymentRecord.create({
    data: {
      clientId: originalPayment.clientId,
      paymentAmount: -(charge.amount_refunded / 100),
      paymentDate: new Date(),
      paymentSource: 'Client',
      paymentMethod: 'Refund',
      transactionId: `REFUND-${charge.id}`,
      appliedPaymentsJson: [],
    } as any,
  });

  logger.info(`Created refund record for payment ${paymentIntentId}`);
}

export default router;
