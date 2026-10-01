export const prerender = false;

import type { APIRoute } from 'astro';
import { calculatePlanPrice, type PlanId, type BillingCycle } from '../../../lib/subscriptions/planConfig';
import { createRazorpayOrder, isRazorpayConfigured } from '../../../lib/payments/razorpayService';
import { getServerSupabaseClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { planId, billingCycle, businessId, userId, userEmail } = body as {
      planId: PlanId;
      billingCycle: BillingCycle;
      businessId: string;
      userId: string;
      userEmail?: string;
    };

    if (!planId || !billingCycle || !businessId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: planId, billingCycle, businessId, userId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (planId === 'free') {
      return new Response(
        JSON.stringify({ error: 'Free plan does not require payment processing.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const priceCalc = calculatePlanPrice(planId, billingCycle);
    const amountInPaise = priceCalc.totalBilledAmount * 100;

    if (!isRazorpayConfigured) {
      return new Response(
        JSON.stringify({
          error: 'Razorpay is not yet configured with valid server credentials (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET).',
          code: 'RAZORPAY_NOT_CONFIGURED',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const receipt = `rcpt_${planId}_${Date.now()}`.slice(0, 40);
    const order = await createRazorpayOrder({
      amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        planId,
        billingCycle,
        businessId,
        userId,
        userEmail: userEmail || '',
      },
    });

    // Record initial transaction in Supabase if server client is available
    const serverSupabase = getServerSupabaseClient();
    if (serverSupabase) {
      await serverSupabase.from('payment_transactions').insert({
        user_id: userId,
        business_id: businessId,
        razorpay_order_id: order.id,
        amount: priceCalc.totalBilledAmount,
        currency: 'INR',
        status: 'created',
        receipt,
        raw_payload: order as any,
      });
    }

    const keyId = import.meta.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '';

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
        planId,
        billingCycle,
        totalBilledAmount: priceCalc.totalBilledAmount,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('API /api/payments/create-order error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Failed to create payment order.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
