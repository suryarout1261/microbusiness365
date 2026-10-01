import { useState, useEffect } from 'react';
import {
  PLANS,
  BILLING_CYCLES,
  calculatePlanPrice,
  type PlanId,
  type BillingCycle,
} from '../../lib/subscriptions/planConfig';
import { subscriptionStore } from '../../lib/subscriptions/subscriptionStore';
import { authStore } from '../../lib/auth/authStore';
import { openRazorpayCheckout } from '../../lib/payments/razorpayClient';
import AuthModal from '../auth/AuthModal';

export default function PricingCards() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [currentPlanId, setCurrentPlanId] = useState<PlanId>(subscriptionStore.getState().planId);
  const [isAuth, setIsAuth] = useState(authStore.getState().isAuthenticated);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<PlanId | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const unsubSub = subscriptionStore.subscribe((s) => setCurrentPlanId(s.planId));
    const unsubAuth = authStore.subscribe((a) => setIsAuth(a.isAuthenticated));
    return () => {
      unsubSub();
      unsubAuth();
    };
  }, []);

  const handleSelectPlan = async (planId: PlanId) => {
    if (planId === 'free') {
      window.location.href = '/app';
      return;
    }

    if (!isAuth) {
      setAuthModalOpen(true);
      return;
    }

    const auth = authStore.getState();
    if (!auth.user || !auth.business?.id) {
      setAuthModalOpen(true);
      return;
    }

    setProcessingPlanId(planId);
    setNotification(null);

    try {
      // 1. Create order on server
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle,
          businessId: auth.business.id,
          userId: auth.user.id,
          userEmail: auth.user.email,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize payment order.');
      }

      // 2. Open Razorpay Checkout Modal
      await openRazorpayCheckout({
        keyId: data.keyId,
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency,
        name: 'MicroBusiness365',
        description: `Subscription: ${PLANS[planId].name} (${billingCycle})`,
        userEmail: auth.user.email,
        onSuccess: async (payRes) => {
          try {
            // 3. Verify payment signature on server
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: payRes.razorpay_order_id,
                paymentId: payRes.razorpay_payment_id,
                signature: payRes.razorpay_signature,
                planId,
                billingCycle,
                businessId: auth.business!.id,
                userId: auth.user!.id,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Payment signature verification failed.');
            }

            // Update client subscription store
            subscriptionStore.setSubscription({
              planId,
              status: 'active',
              billingCycle,
            });

            setNotification({
              type: 'success',
              message: `🎉 Success! Your ${PLANS[planId].name} plan is now active. Enjoy cloud sync & premium features!`,
            });
          } catch (err: any) {
            setNotification({
              type: 'error',
              message: err?.message || 'Payment verification failed. Please contact support.',
            });
          } finally {
            setProcessingPlanId(null);
          }
        },
        onError: (err: any) => {
          setNotification({
            type: 'error',
            message: err?.description || err?.message || 'Payment was cancelled or failed.',
          });
          setProcessingPlanId(null);
        },
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.message || 'Unable to start checkout. Please try again.',
      });
      setProcessingPlanId(null);
    }
  };

  const planKeys: PlanId[] = ['free', 'starter', 'pro', 'business'];

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-sm font-medium flex items-center justify-between gap-3 animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-black/10 transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Billing Cycle Switcher */}
      <div className="flex flex-col items-center justify-center space-y-3">
        <div className="inline-flex p-1.5 rounded-2xl bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow-inner flex-wrap justify-center gap-1">
          {BILLING_CYCLES.map((cycle) => {
            const isSelected = billingCycle === cycle.id;
            return (
              <button
                key={cycle.id}
                type="button"
                onClick={() => setBillingCycle(cycle.id)}
                className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-[#151515] text-[var(--color-text-primary)] dark:text-white shadow-md shadow-black/5'
                    : 'text-[var(--color-text-secondary)] dark:text-neutral-400 hover:text-[var(--color-text-primary)]'
                }`}
              >
                <span>{cycle.label}</span>
                {cycle.badge && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {cycle.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          All multi-year plans include locked-in discount pricing for the entire subscription term.
        </p>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {planKeys.map((planKey) => {
          const plan = PLANS[planKey];
          const price = calculatePlanPrice(planKey, billingCycle);
          const isCurrent = currentPlanId === planKey;
          const isProcessing = processingPlanId === planKey;

          return (
            <div
              key={planKey}
              className={`rounded-3xl border transition-all duration-300 flex flex-col justify-between relative p-6 ${
                plan.isPopular
                  ? 'border-indigo-500/80 dark:border-indigo-500/80 bg-gradient-to-b from-indigo-500/[0.04] to-[var(--color-surface-raised)] dark:to-[#121216] shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/20'
                  : 'border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#121216] shadow-sm hover:shadow-lg'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[11px] font-extrabold tracking-wider uppercase shadow-md shadow-indigo-500/30">
                  Most Popular
                </div>
              )}

              <div className="space-y-4">
                {/* Plan Title & Tagline */}
                <div>
                  <h3 className="text-xl font-bold text-[var(--color-text-primary)] dark:text-white">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] dark:text-neutral-400 mt-1 min-h-[32px]">
                    {plan.tagline}
                  </p>
                </div>

                {/* Price Display */}
                <div className="pt-2 border-t border-[var(--color-border)] dark:border-neutral-800">
                  {plan.id === 'free' ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-[var(--color-text-primary)] dark:text-white">₹0</span>
                      <span className="text-xs text-[var(--color-text-muted)]">/ forever</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        {price.regularMonthly > price.effectiveMonthly && (
                          <span className="text-sm font-semibold line-through text-[var(--color-text-muted)]">
                            ₹{price.regularMonthly}
                          </span>
                        )}
                        <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                          ₹{price.effectiveMonthly}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">/ month</span>
                      </div>

                      <div className="text-[11px] text-[var(--color-text-secondary)] dark:text-neutral-400">
                        Billed as ₹{price.totalBilledAmount.toLocaleString()} for {price.months}{' '}
                        {price.months === 1 ? 'month' : 'months'}
                      </div>

                      {price.totalSavings > 0 && (
                        <div className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          You save ₹{price.totalSavings.toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Resource Limits List */}
                <div className="py-3 border-y border-[var(--color-border)] dark:border-neutral-800 text-xs space-y-2">
                  <div className="flex items-center justify-between text-[var(--color-text-secondary)] dark:text-neutral-300">
                    <span>Cloud Storage</span>
                    <span className="font-bold text-[var(--color-text-primary)] dark:text-white">
                      {plan.limits.storageLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[var(--color-text-secondary)] dark:text-neutral-300">
                    <span>Transactions</span>
                    <span className="font-bold text-[var(--color-text-primary)] dark:text-white">
                      {plan.limits.transactions >= 999999999 ? 'Unlimited local' : `${plan.limits.transactions.toLocaleString()}/mo`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[var(--color-text-secondary)] dark:text-neutral-300">
                    <span>Device Access</span>
                    <span className="font-bold text-[var(--color-text-primary)] dark:text-white">
                      {plan.limits.devices} {plan.limits.devices === 1 ? 'device' : 'devices'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[var(--color-text-secondary)] dark:text-neutral-300">
                    <span>Team Users</span>
                    <span className="font-bold text-[var(--color-text-primary)] dark:text-white">
                      {plan.limits.users} {plan.limits.users === 1 ? 'user' : 'users'}
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Features included
                  </div>
                  <ul className="space-y-1.5 text-xs text-[var(--color-text-secondary)] dark:text-neutral-300">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-default"
                  >
                    <span>✓ Current Plan</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleSelectPlan(planKey)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                      plan.isPopular
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-500/25'
                        : 'bg-gray-900 hover:bg-black dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white'
                    }`}
                  >
                    {isProcessing ? (
                      <span>Processing...</span>
                    ) : (
                      <span>{plan.id === 'free' ? 'Continue Free' : 'Upgrade to ' + plan.name}</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
