import { getSupabaseClient } from '../supabase/client';
import { authStore } from '../auth/authStore';
import { PLANS, type PlanDefinition, type PlanId, type BillingCycle } from './planConfig';

export interface SubscriptionState {
  planId: PlanId;
  plan: PlanDefinition;
  status: 'active' | 'past_due' | 'canceled' | 'expired';
  billingCycle: BillingCycle;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isLoading: boolean;
}

let state: SubscriptionState = {
  planId: 'free',
  plan: PLANS.free,
  status: 'active',
  billingCycle: 'monthly',
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  isLoading: false,
};

const listeners = new Set<(s: SubscriptionState) => void>();

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch (err) {
      console.error('Error in subscriptionStore listener:', err);
    }
  });
}

export const subscriptionStore = {
  getState: () => state,
  subscribe: (fn: (s: SubscriptionState) => void) => {
    listeners.add(fn);
    fn(state);
    return () => listeners.delete(fn);
  },
  setSubscription: (sub: Partial<SubscriptionState>) => {
    const planId = sub.planId || state.planId;
    state = {
      ...state,
      ...sub,
      planId,
      plan: PLANS[planId] || PLANS.free,
      isLoading: false,
    };
    notify();
  },
  reset: () => {
    state = {
      planId: 'free',
      plan: PLANS.free,
      status: 'active',
      billingCycle: 'monthly',
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      isLoading: false,
    };
    notify();
  },
};

export async function fetchUserSubscription() {
  const auth = authStore.getState();
  if (!auth.isAuthenticated || !auth.user) {
    subscriptionStore.reset();
    return;
  }

  const client = getSupabaseClient();
  if (!client) {
    subscriptionStore.reset();
    return;
  }

  subscriptionStore.setSubscription({ isLoading: true });

  try {
    const { data, error } = await client
      .from('subscriptions')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      subscriptionStore.setSubscription({
        planId: 'free',
        status: 'active',
        billingCycle: 'monthly',
      });
      return;
    }

    const planId = (data.plan_id as PlanId) in PLANS ? (data.plan_id as PlanId) : 'free';
    subscriptionStore.setSubscription({
      planId,
      status: data.status as any,
      billingCycle: (data.billing_cycle as BillingCycle) || 'monthly',
      currentPeriodStart: data.current_period_start,
      currentPeriodEnd: data.current_period_end,
      cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
    });
  } catch (err) {
    console.warn('Failed to fetch user subscription:', err);
    subscriptionStore.reset();
  }
}

// Subscribe to auth changes to reload subscription
authStore.subscribe((auth) => {
  if (auth.isAuthenticated) {
    fetchUserSubscription();
  } else {
    subscriptionStore.reset();
  }
});
