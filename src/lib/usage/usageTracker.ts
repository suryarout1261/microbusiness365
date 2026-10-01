import { db } from '../db';
import { subscriptionStore } from '../subscriptions/subscriptionStore';
import { PLANS } from '../subscriptions/planConfig';

export interface UsageMetric {
  current: number;
  limit: number;
  percentage: number;
  isApproaching: boolean; // >= 80%
  isExceeded: boolean;    // >= 100%
  label: string;
  unit?: string;
}

export interface CloudUsageReport {
  storage: UsageMetric;
  transactions: UsageMetric;
  customers: UsageMetric;
  products: UsageMetric;
  invoices: UsageMetric;
  users: UsageMetric;
  hasApproachingLimit: boolean;
  hasExceededLimit: boolean;
  affectedLimitLabels: string[];
}

export async function computeCurrentUsage(): Promise<CloudUsageReport> {
  const subState = subscriptionStore.getState();
  const plan = PLANS[subState.planId] || PLANS.free;
  const limits = plan.limits;

  const [cCount, pCount, sCount, purCount, payCount, invCount] = await Promise.all([
    db.customers.count(),
    db.products.count(),
    db.sales.count(),
    db.purchases.count(),
    db.payments.count(),
    db.invoices.count(),
  ]);

  const transactionsCount = sCount + purCount + payCount;

  // Approximate storage estimate based on Dexie records (average ~1.5KB per transaction/entity)
  const totalEntities = cCount + pCount + sCount + purCount + payCount + invCount;
  const estimatedStorageBytes = totalEntities * 1500;

  function buildMetric(current: number, limit: number, label: string, unit?: string): UsageMetric {
    if (limit === 0 || limit >= 999999999) {
      return {
        current,
        limit,
        percentage: 0,
        isApproaching: false,
        isExceeded: false,
        label,
        unit,
      };
    }
    const pct = Math.min(100, Math.round((current / limit) * 100));
    return {
      current,
      limit,
      percentage: pct,
      isApproaching: pct >= 80 && pct < 100,
      isExceeded: current >= limit,
      label,
      unit,
    };
  }

  const storageMetric = buildMetric(
    estimatedStorageBytes,
    limits.storageBytes,
    'Cloud Storage',
    'MB'
  );

  const transactionsMetric = buildMetric(
    transactionsCount,
    limits.transactions,
    'Transactions'
  );

  const customersMetric = buildMetric(
    cCount,
    limits.customers,
    'Customers'
  );

  const productsMetric = buildMetric(
    pCount,
    limits.products,
    'Products'
  );

  const invoicesMetric = buildMetric(
    invCount,
    limits.invoices,
    'Invoices'
  );

  const usersMetric = buildMetric(
    1,
    limits.users,
    'Team Users'
  );

  const allMetrics = [storageMetric, transactionsMetric, customersMetric, productsMetric, invoicesMetric, usersMetric];
  const approaching = allMetrics.filter((m) => m.isApproaching);
  const exceeded = allMetrics.filter((m) => m.isExceeded);

  return {
    storage: storageMetric,
    transactions: transactionsMetric,
    customers: customersMetric,
    products: productsMetric,
    invoices: invoicesMetric,
    users: usersMetric,
    hasApproachingLimit: approaching.length > 0,
    hasExceededLimit: exceeded.length > 0,
    affectedLimitLabels: [...exceeded, ...approaching].map((m) => m.label),
  };
}
