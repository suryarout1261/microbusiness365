import { computeCurrentUsage, type CloudUsageReport } from './usageTracker';
import { subscriptionStore } from '../subscriptions/subscriptionStore';
import { authStore } from '../auth/authStore';

export interface LimitCheckResult {
  allowed: boolean;
  metricLabel?: string;
  current?: number;
  limit?: number;
  message?: string;
}

export async function checkActionAllowed(
  actionType: 'customer' | 'product' | 'transaction' | 'invoice'
): Promise<LimitCheckResult> {
  const auth = authStore.getState();
  // Local unauthenticated mode has no limits
  if (!auth.isAuthenticated) {
    return { allowed: true };
  }

  const sub = subscriptionStore.getState();
  if (sub.planId === 'free') {
    // Free local mode in cloud account allows local operations
    return { allowed: true };
  }

  const usage = await computeCurrentUsage();

  switch (actionType) {
    case 'customer':
      if (usage.customers.isExceeded) {
        return {
          allowed: false,
          metricLabel: 'Customers',
          current: usage.customers.current,
          limit: usage.customers.limit,
          message: `You've reached your plan customer limit (${usage.customers.current} / ${usage.customers.limit}). Upgrade to add more customers to cloud sync.`,
        };
      }
      break;
    case 'product':
      if (usage.products.isExceeded) {
        return {
          allowed: false,
          metricLabel: 'Products',
          current: usage.products.current,
          limit: usage.products.limit,
          message: `You've reached your plan product limit (${usage.products.current} / ${usage.products.limit}). Upgrade to add more products to cloud sync.`,
        };
      }
      break;
    case 'transaction':
      if (usage.transactions.isExceeded) {
        return {
          allowed: false,
          metricLabel: 'Transactions',
          current: usage.transactions.current,
          limit: usage.transactions.limit,
          message: `You've reached your monthly cloud transaction limit (${usage.transactions.current} / ${usage.transactions.limit}). Upgrade your plan to continue cloud syncing.`,
        };
      }
      break;
    case 'invoice':
      if (usage.invoices.isExceeded) {
        return {
          allowed: false,
          metricLabel: 'Invoices',
          current: usage.invoices.current,
          limit: usage.invoices.limit,
          message: `You've reached your plan invoice limit (${usage.invoices.current} / ${usage.invoices.limit}). Upgrade to create more invoices in cloud.`,
        };
      }
      break;
  }

  return { allowed: true };
}
