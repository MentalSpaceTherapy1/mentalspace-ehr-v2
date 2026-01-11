import Stripe from 'stripe';
import logger from '../utils/logger';

// Initialize Stripe client
// Uses STRIPE_SECRET_KEY from environment
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  logger.warn('STRIPE_SECRET_KEY not configured - Stripe payments will be unavailable');
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    })
  : null;

// ============================================================================
// Type Definitions
// ============================================================================

export interface CreateCustomerParams {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentParams {
  amount: number; // Amount in cents
  currency: string;
  customerId: string;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
  description?: string;
}

export interface StripeCustomerResponse {
  id: string;
  email: string | null;
  name: string | null;
  created: number;
}

export interface StripePaymentIntentResponse {
  id: string;
  clientSecret: string | null;
  status: Stripe.PaymentIntent.Status;
  amount: number;
  currency: string;
}

export interface StripePaymentMethodResponse {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

// ============================================================================
// Stripe Service Functions
// ============================================================================

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  return stripe !== null;
}

/**
 * Create a Stripe customer
 */
export async function createCustomer(
  params: CreateCustomerParams
): Promise<StripeCustomerResponse> {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }

  try {
    const customer = await stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: params.metadata,
    });

    logger.info(`Stripe customer created: ${customer.id}`);

    return {
      id: customer.id,
      email: customer.email ?? null,
      name: customer.name ?? null,
      created: customer.created,
    };
  } catch (error) {
    logger.error('Failed to create Stripe customer:', error);
    throw error;
  }
}

/**
 * Retrieve a Stripe customer
 */
export async function getCustomer(customerId: string): Promise<StripeCustomerResponse | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }

  try {
    const customer = await stripe.customers.retrieve(customerId);

    if (customer.deleted) {
      return null;
    }

    return {
      id: customer.id,
      email: customer.email ?? null,
      name: customer.name ?? null,
      created: customer.created,
    };
  } catch (error) {
    logger.error(`Failed to retrieve Stripe customer ${customerId}:`, error);
    throw error;
  }
}

/**
 * Create a payment intent
 */
export async function createPaymentIntent(
  params: CreatePaymentIntentParams
): Promise<StripePaymentIntentResponse> {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }

  try {
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: params.amount,
      currency: params.currency,
      customer: params.customerId,
      metadata: params.metadata,
      description: params.description,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    };

    if (params.paymentMethodId) {
      paymentIntentParams.payment_method = params.paymentMethodId;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    logger.info(`Payment intent created: ${paymentIntent.id}`);

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  } catch (error) {
    logger.error('Failed to create payment intent:', error);
    throw error;
  }
}

/**
 * Confirm a payment intent
 */
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId: string
): Promise<StripePaymentIntentResponse> {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });

    logger.info(`Payment intent confirmed: ${paymentIntent.id}, status: ${paymentIntent.status}`);

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  } catch (error) {
    logger.error(`Failed to confirm payment intent ${paymentIntentId}:`, error);
    throw error;
  }
}

/**
 * Retrieve a payment intent
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<StripePaymentIntentResponse | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  } catch (error) {
    logger.error(`Failed to retrieve payment intent ${paymentIntentId}:`, error);
    throw error;
  }
}

/**
 * List payment methods for a customer
 */
export async function listPaymentMethods(
  customerId: string
): Promise<StripePaymentMethodResponse[]> {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }

  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data.map((pm) => ({
      id: pm.id,
      type: pm.type,
      card: pm.card
        ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          }
        : undefined,
    }));
  } catch (error) {
    logger.error(`Failed to list payment methods for customer ${customerId}:`, error);
    throw error;
  }
}

/**
 * Attach a payment method to a customer
 */
export async function attachPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<StripePaymentMethodResponse> {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }

  try {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    logger.info(`Payment method ${paymentMethodId} attached to customer ${customerId}`);

    return {
      id: paymentMethod.id,
      type: paymentMethod.type,
      card: paymentMethod.card
        ? {
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            expMonth: paymentMethod.card.exp_month,
            expYear: paymentMethod.card.exp_year,
          }
        : undefined,
    };
  } catch (error) {
    logger.error(`Failed to attach payment method ${paymentMethodId}:`, error);
    throw error;
  }
}

/**
 * Detach a payment method from a customer
 */
export async function detachPaymentMethod(paymentMethodId: string): Promise<boolean> {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }

  try {
    await stripe.paymentMethods.detach(paymentMethodId);
    logger.info(`Payment method ${paymentMethodId} detached`);
    return true;
  } catch (error) {
    logger.error(`Failed to detach payment method ${paymentMethodId}:`, error);
    throw error;
  }
}

/**
 * Construct webhook event from raw body and signature
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Get Stripe instance for advanced operations
 * Use sparingly - prefer the typed functions above
 */
export function getStripeClient(): Stripe | null {
  return stripe;
}

export default {
  isStripeConfigured,
  createCustomer,
  getCustomer,
  createPaymentIntent,
  confirmPaymentIntent,
  getPaymentIntent,
  listPaymentMethods,
  attachPaymentMethod,
  detachPaymentMethod,
  constructWebhookEvent,
  getStripeClient,
};
