import crypto from 'node:crypto';
import Razorpay from 'razorpay';

const keyId = import.meta.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '';
const keySecret = import.meta.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '';
const webhookSecret = import.meta.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET || '';

export const isRazorpayConfigured = Boolean(
  keyId && keySecret && keyId !== 'rzp_test_placeholder' && keySecret !== 'placeholder'
);

let _razorpayInstance: Razorpay | null = null;

export function getRazorpayInstance(): Razorpay | null {
  if (!_razorpayInstance && isRazorpayConfigured) {
    try {
      _razorpayInstance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    } catch (err) {
      console.warn('Failed to initialize Razorpay server instance:', err);
      _razorpayInstance = null;
    }
  }
  return _razorpayInstance;
}

export interface CreateOrderParams {
  amountInPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export async function createRazorpayOrder(params: CreateOrderParams) {
  const rzp = getRazorpayInstance();
  if (!rzp) {
    throw new Error('Razorpay is not configured on the server. Please check your environment variables.');
  }

  const order = await rzp.orders.create({
    amount: params.amountInPaise,
    currency: params.currency || 'INR',
    receipt: params.receipt,
    notes: params.notes || {},
  });

  return order;
}

export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  if (!keySecret) return false;

  const body = `${params.orderId}|${params.paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body.toString())
    .digest('hex');

  return expectedSignature === params.signature;
}

export function verifyRazorpayWebhookSignature(params: {
  rawBody: string;
  signature: string;
}): boolean {
  const secret = webhookSecret || keySecret;
  if (!secret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(params.rawBody)
    .digest('hex');

  return expectedSignature === params.signature;
}
