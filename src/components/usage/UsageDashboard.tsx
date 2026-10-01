import { useState, useEffect } from 'react';
import { computeCurrentUsage, type CloudUsageReport } from '../../lib/usage/usageTracker';
import { subscriptionStore } from '../../lib/subscriptions/subscriptionStore';

export default function UsageDashboard() {
  const [usage, setUsage] = useState<CloudUsageReport | null>(null);
  const [sub, setSub] = useState(subscriptionStore.getState());

  const loadUsage = async () => {
    try {
      const u = await computeCurrentUsage();
      setUsage(u);
    } catch (e) {
      console.warn('Failed to load usage report:', e);
    }
  };

  useEffect(() => {
    loadUsage();
    const unsubSub = subscriptionStore.subscribe((s) => {
      setSub(s);
      loadUsage();
    });
    return () => unsubSub();
  }, []);

  if (!usage) {
    return (
      <div className="p-4 rounded-xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] text-xs text-[var(--color-text-muted)] animate-pulse">
        Loading cloud usage metrics...
      </div>
    );
  }

  const isFree = sub.planId === 'free';
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Approaching or Exceeded Banners */}
      {usage.hasExceededLimit && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="font-bold text-sm flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Cloud Limit Reached</span>
            </div>
            <p className="text-xs opacity-90">
              You've reached the {usage.affectedLimitLabels.join(', ')} limit on your current plan. Upgrade to maintain unrestricted multi-device cloud synchronization.
            </p>
          </div>
          <a
            href="/pricing"
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition shadow-sm whitespace-nowrap shrink-0"
          >
            Upgrade Plan
          </a>
        </div>
      )}

      {usage.hasApproachingLimit && !usage.hasExceededLimit && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="font-bold text-sm flex items-center gap-1.5">
              <span>⚡</span>
              <span>Approaching Plan Limit</span>
            </div>
            <p className="text-xs opacity-90">
              You're approaching your plan limit ({usage.affectedLimitLabels.join(', ')}). Upgrade to avoid cloud sync interruptions.
            </p>
          </div>
          <a
            href="/pricing"
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition shadow-sm whitespace-nowrap shrink-0"
          >
            View Plans
          </a>
        </div>
      )}

      {/* Cloud Usage Card */}
      <div className="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] dark:border-neutral-800 pb-3">
          <div>
            <h3 className="font-bold text-sm text-[var(--color-text-primary)] dark:text-white flex items-center gap-2">
              <span>Cloud Resource Usage</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                {sub.plan.name}
              </span>
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Current storage and entity quota utilization
            </p>
          </div>
          <a
            href="/pricing"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Change Plan →
          </a>
        </div>

        {isFree ? (
          <div className="py-4 text-center space-y-2">
            <p className="text-xs text-[var(--color-text-secondary)] dark:text-neutral-300">
              You are currently on the <strong>Free Local Plan</strong>. All business operations are saved locally in your browser's Dexie database with unlimited local records.
            </p>
            <div className="pt-2">
              <a
                href="/pricing"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/40 transition"
              >
                <span>Upgrade to Cloud Sync (from ₹149/mo)</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {/* Storage Progress */}
            <div className="space-y-1.5 p-3 rounded-xl bg-[var(--color-surface)] dark:bg-neutral-900/40 border border-[var(--color-border)] dark:border-neutral-800">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[var(--color-text-secondary)] dark:text-neutral-400">Cloud Storage</span>
                <span className="font-bold text-[var(--color-text-primary)] dark:text-white">
                  {formatBytes(usage.storage.current)} / {formatBytes(usage.storage.limit)}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    usage.storage.isExceeded ? 'bg-rose-500' : usage.storage.isApproaching ? 'bg-amber-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${usage.storage.percentage}%` }}
                />
              </div>
              <div className="text-[10px] text-right text-[var(--color-text-muted)]">
                {usage.storage.percentage}% used
              </div>
            </div>

            {/* Transactions Progress */}
            <div className="space-y-1.5 p-3 rounded-xl bg-[var(--color-surface)] dark:bg-neutral-900/40 border border-[var(--color-border)] dark:border-neutral-800">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[var(--color-text-secondary)] dark:text-neutral-400">Transactions</span>
                <span className="font-bold text-[var(--color-text-primary)] dark:text-white">
                  {usage.transactions.current.toLocaleString()} / {usage.transactions.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    usage.transactions.isExceeded ? 'bg-rose-500' : usage.transactions.isApproaching ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${usage.transactions.percentage}%` }}
                />
              </div>
              <div className="text-[10px] text-right text-[var(--color-text-muted)]">
                {usage.transactions.percentage}% used
              </div>
            </div>

            {/* Customers Progress */}
            <div className="space-y-1.5 p-3 rounded-xl bg-[var(--color-surface)] dark:bg-neutral-900/40 border border-[var(--color-border)] dark:border-neutral-800">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[var(--color-text-secondary)] dark:text-neutral-400">Customers</span>
                <span className="font-bold text-[var(--color-text-primary)] dark:text-white">
                  {usage.customers.current.toLocaleString()} / {usage.customers.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    usage.customers.isExceeded ? 'bg-rose-500' : usage.customers.isApproaching ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${usage.customers.percentage}%` }}
                />
              </div>
              <div className="text-[10px] text-right text-[var(--color-text-muted)]">
                {usage.customers.percentage}% used
              </div>
            </div>

            {/* Products Progress */}
            <div className="space-y-1.5 p-3 rounded-xl bg-[var(--color-surface)] dark:bg-neutral-900/40 border border-[var(--color-border)] dark:border-neutral-800">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[var(--color-text-secondary)] dark:text-neutral-400">Products</span>
                <span className="font-bold text-[var(--color-text-primary)] dark:text-white">
                  {usage.products.current.toLocaleString()} / {usage.products.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    usage.products.isExceeded ? 'bg-rose-500' : usage.products.isApproaching ? 'bg-amber-500' : 'bg-violet-500'
                  }`}
                  style={{ width: `${usage.products.percentage}%` }}
                />
              </div>
              <div className="text-[10px] text-right text-[var(--color-text-muted)]">
                {usage.products.percentage}% used
              </div>
            </div>

            {/* Invoices Progress */}
            <div className="space-y-1.5 p-3 rounded-xl bg-[var(--color-surface)] dark:bg-neutral-900/40 border border-[var(--color-border)] dark:border-neutral-800">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[var(--color-text-secondary)] dark:text-neutral-400">Invoices</span>
                <span className="font-bold text-[var(--color-text-primary)] dark:text-white">
                  {usage.invoices.current.toLocaleString()} / {usage.invoices.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    usage.invoices.isExceeded ? 'bg-rose-500' : usage.invoices.isApproaching ? 'bg-amber-500' : 'bg-fuchsia-500'
                  }`}
                  style={{ width: `${usage.invoices.percentage}%` }}
                />
              </div>
              <div className="text-[10px] text-right text-[var(--color-text-muted)]">
                {usage.invoices.percentage}% used
              </div>
            </div>

            {/* Users / Devices */}
            <div className="space-y-1.5 p-3 rounded-xl bg-[var(--color-surface)] dark:bg-neutral-900/40 border border-[var(--color-border)] dark:border-neutral-800">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[var(--color-text-secondary)] dark:text-neutral-400">Team Users / Devices</span>
                <span className="font-bold text-[var(--color-text-primary)] dark:text-white">
                  {sub.plan.limits.users} User / {sub.plan.limits.devices} Devices
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-neutral-800 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: '33%' }} />
              </div>
              <div className="text-[10px] text-right text-[var(--color-text-muted)]">
                {sub.plan.limits.branches > 1 ? `${sub.plan.limits.branches} Branches supported` : '1 Branch'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
