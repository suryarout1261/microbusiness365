export const prerender = false;

import type { APIRoute } from 'astro';
import { verifyRazorpayPaymentSignature } from '../../../lib/payments/razorpayService';
import { getServerSupabaseClient } from '../../../lib/supabase/server';
import { BILLING_CYCLES, type PlanId, type BillingCycle } from '../../../lib/subscriptions/planConfig';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      orderId,
      paymentId,
      signature,
      planId,
      billingCycle,
      businessId,
      userId,
    } = body as {
      orderId: string;
      paymentId: string;
      signature: string;
      planId: PlanId;
      billingCycle: BillingCycle;
      businessId: string;
      userId: string;
    };

    if (!orderId || !paymentId || !signature || !planId || !businessId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters for verification.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isValid = verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid payment signature. Verification failed.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Calculate subscription period dates
    const cycleConfig = BILLING_CYCLES.find((c) => c.id === billingCycle) || BILLING_CYCLES[0];
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + cycleConfig.months);

    const serverSupabase = getServerSupabaseClient();
    if (serverSupabase) {
      // 1. Update payment_transactions status
      await serverSupabase
        .from('payment_transactions')
        .update({
          status: 'paid',
          razorpay_payment_id: paymentId,
        })
        .eq('razorpay_order_id', orderId);

      // 2. Upsert active subscription record
      await serverSupabase.from('subscriptions').upsert(
        {
          user_id: userId,
          business_id: businessId,
          plan_id: planId,
          status: 'active',
          billing_cycle: billingCycle,
          current_period_start: startDate.toISOString(),
          current_period_end: endDate.toISOString(),
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'user_id,business_id' }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        planId,
        status: 'active',
        currentPeriodEnd: endDate.toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('API /api/payments/verify error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Failed to verify payment.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
