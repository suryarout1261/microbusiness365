export const prerender = false;

import type { APIRoute } from 'astro';
import { verifyRazorpayWebhookSignature } from '../../../lib/payments/razorpayService';
import { getServerSupabaseClient } from '../../../lib/supabase/server';
import { BILLING_CYCLES, type PlanId, type BillingCycle } from '../../../lib/subscriptions/planConfig';

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing x-razorpay-signature header' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isValid = verifyRazorpayWebhookSignature({ rawBody, signature });
    if (!isValid) {
      console.warn('Razorpay webhook signature verification failed.');
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(rawBody);
    const serverSupabase = getServerSupabaseClient();

    if (!serverSupabase) {
      return new Response(JSON.stringify({ received: true, note: 'Database client unconfigured' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const eventType = event.event;
    const payload = event.payload;

    switch (eventType) {
      case 'order.paid':
      case 'payment.captured': {
        const payment = payload.payment?.entity;
        const notes = payment?.notes || {};
        const { planId, billingCycle, businessId, userId } = notes;

        if (userId && businessId && planId) {
          const cycleConfig = BILLING_CYCLES.find((c) => c.id === billingCycle) || BILLING_CYCLES[0];
          const startDate = new Date();
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + cycleConfig.months);

          await serverSupabase.from('subscriptions').upsert(
            {
              user_id: userId,
              business_id: businessId,
              plan_id: planId as PlanId,
              status: 'active',
              billing_cycle: (billingCycle as BillingCycle) || 'monthly',
              current_period_start: startDate.toISOString(),
              current_period_end: endDate.toISOString(),
              razorpay_order_id: payment.order_id,
              razorpay_payment_id: payment.id,
              updated_at: new Date().toISOString(),
            } as any,
            { onConflict: 'user_id,business_id' }
          );

          await serverSupabase
            .from('payment_transactions')
            .update({
              status: 'paid',
              razorpay_payment_id: payment.id,
            })
            .eq('razorpay_order_id', payment.order_id);
        }
        break;
      }
      case 'payment.failed': {
        const payment = payload.payment?.entity;
        if (payment?.order_id) {
          await serverSupabase
            .from('payment_transactions')
            .update({
              status: 'failed',
            })
            .eq('razorpay_order_id', payment.order_id);
        }
        break;
      }
      case 'subscription.cancelled': {
        const sub = payload.subscription?.entity;
        if (sub?.id) {
          await serverSupabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('razorpay_subscription_id', sub.id);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ status: 'ok', event: eventType }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('API /api/payments/webhook error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Webhook error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
