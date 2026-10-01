export type PlanId = 'free' | 'starter' | 'pro' | 'business';
export type BillingCycle = 'monthly' | 'annual' | '2year' | '3year';

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  regularPriceMonthly: number;
  offerPriceMonthly: number;
  isPopular?: boolean;
  limits: {
    storageBytes: number; // e.g. 100MB = 104857600
    storageLabel: string;
    transactions: number;
    customers: number;
    products: number;
    invoices: number;
    users: number;
    devices: number;
    branches: number;
  };
  features: string[];
}

export interface BillingCycleConfig {
  id: BillingCycle;
  label: string;
  months: number;
  discountPercentage: number;
  badge?: string;
}

export const BILLING_CYCLES: BillingCycleConfig[] = [
  { id: 'monthly', label: 'Monthly', months: 1, discountPercentage: 0 },
  { id: 'annual', label: 'Annual (1 Year)', months: 12, discountPercentage: 20, badge: 'Save 20%' },
  { id: '2year', label: '2 Years', months: 24, discountPercentage: 30, badge: 'Save 30%' },
  { id: '3year', label: '3 Years', months: 36, discountPercentage: 40, badge: 'Best Value • Save 40%' },
];

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free Local',
    tagline: 'Ideal for single-device offline micro businesses',
    regularPriceMonthly: 0,
    offerPriceMonthly: 0,
    limits: {
      storageBytes: 0,
      storageLabel: '0 MB (Offline Dexie)',
      transactions: 999999999,
      customers: 999999999,
      products: 999999999,
      invoices: 999999999,
      users: 1,
      devices: 1,
      branches: 1,
    },
    features: [
      '100% Free forever with zero lock-in',
      'Full offline Dexie / IndexedDB storage',
      'Unlimited local sales & purchase orders',
      'Point of sale checkout & receipt printer',
      'Stock tracking & inventory alerts',
      'Basic business overview reports',
      'No cloud account or credit card required',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter Cloud',
    tagline: 'Best for growing shops needing cloud backup',
    regularPriceMonthly: 299,
    offerPriceMonthly: 149,
    limits: {
      storageBytes: 104857600, // 100 MB
      storageLabel: '100 MB Cloud Storage',
      transactions: 1000,
      customers: 500,
      products: 500,
      invoices: 1000,
      users: 1,
      devices: 2,
      branches: 1,
    },
    features: [
      '100 MB Encrypted Cloud Storage',
      '1,000 Cloud Transactions per month',
      '500 Customers & 500 Products in Cloud',
      'Automatic Cloud Backup & Recovery',
      'Sync across 2 devices (e.g. Phone + PC)',
      'GST invoice generation & PDF exports',
      'Standard email support',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro Cloud',
    tagline: 'Perfect for retail stores, supermarkets & distributors',
    regularPriceMonthly: 499,
    offerPriceMonthly: 249,
    isPopular: true,
    limits: {
      storageBytes: 524288000, // 500 MB
      storageLabel: '500 MB Cloud Storage',
      transactions: 5000,
      customers: 2500,
      products: 2500,
      invoices: 5000,
      users: 3,
      devices: 5,
      branches: 2,
    },
    features: [
      '500 MB Encrypted Cloud Storage',
      '5,000 Cloud Transactions per month',
      '2,500 Customers & 2,500 Products',
      'Multi-Device Real-time Sync (Up to 5 devices)',
      '3 Team Member logins with permissions',
      'Multi-branch management (2 locations)',
      'Custom invoice branding & quotations',
      'Comprehensive financial analytics & reports',
      'Priority email & WhatsApp support',
    ],
  },
  business: {
    id: 'business',
    name: 'Business Scale',
    tagline: 'For multi-branch enterprises & fast-scaling retailers',
    regularPriceMonthly: 699,
    offerPriceMonthly: 349,
    limits: {
      storageBytes: 2147483648, // 2 GB
      storageLabel: '2 GB Cloud Storage',
      transactions: 20000,
      customers: 10000,
      products: 10000,
      invoices: 20000,
      users: 10,
      devices: 10,
      branches: 5,
    },
    features: [
      '2 GB Ultra-fast Cloud Storage',
      '20,000 Cloud Transactions per month',
      '10,000 Customers & 10,000 Products',
      'Up to 5 branch locations & warehouses',
      '10 Staff / Cashier / Manager accounts',
      'Advanced Audit Log & Security Controls',
      'Automated daily cloud backups',
      'Custom domain & PDF receipt customization',
      'Dedicated 24/7 VIP priority support',
    ],
  },
};

export interface PlanPriceCalculation {
  planId: PlanId;
  billingCycle: BillingCycle;
  months: number;
  regularMonthly: number;
  offerMonthly: number;
  effectiveMonthly: number;
  totalRegularAmount: number;
  totalBilledAmount: number;
  totalSavings: number;
  hasDiscount: boolean;
}

export function calculatePlanPrice(planId: PlanId, cycleId: BillingCycle): PlanPriceCalculation {
  const plan = PLANS[planId] || PLANS.free;
  const cycle = BILLING_CYCLES.find((c) => c.id === cycleId) || BILLING_CYCLES[0];

  if (plan.id === 'free') {
    return {
      planId: 'free',
      billingCycle: cycleId,
      months: cycle.months,
      regularMonthly: 0,
      offerMonthly: 0,
      effectiveMonthly: 0,
      totalRegularAmount: 0,
      totalBilledAmount: 0,
      totalSavings: 0,
      hasDiscount: false,
    };
  }

  // Base monthly rate using the promotional offer price
  const baseMonthly = plan.offerPriceMonthly;
  const regularMonthly = plan.regularPriceMonthly;

  // Apply extra cycle discount (e.g. 20% for annual)
  const cycleDiscount = cycle.discountPercentage / 100;
  const effectiveMonthly = Math.round(baseMonthly * (1 - cycleDiscount));

  const totalBilledAmount = effectiveMonthly * cycle.months;
  const totalRegularAmount = regularMonthly * cycle.months;
  const totalSavings = Math.max(0, totalRegularAmount - totalBilledAmount);

  return {
    planId,
    billingCycle: cycleId,
    months: cycle.months,
    regularMonthly,
    offerMonthly: baseMonthly,
    effectiveMonthly,
    totalRegularAmount,
    totalBilledAmount,
    totalSavings,
    hasDiscount: totalSavings > 0,
  };
}
