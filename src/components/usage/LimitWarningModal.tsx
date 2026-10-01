import { useState, useEffect } from 'react';
import { subscriptionStore } from '../../lib/subscriptions/subscriptionStore';

interface LimitWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricLabel: string;
  current: number;
  limit: number;
  message?: string;
}

export default function LimitWarningModal({
  isOpen,
  onClose,
  metricLabel,
  current,
  limit,
  message,
}: LimitWarningModalProps) {
  const [sub, setSub] = useState(subscriptionStore.getState());

  useEffect(() => {
    return subscriptionStore.subscribe(setSub);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-[var(--color-surface-raised)] dark:bg-[#121216] p-6 shadow-2xl relative space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
        >
          ✕
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl font-bold">
            ⚠️
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)] dark:text-white">
              {metricLabel} Limit Reached
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              {sub.plan.name} Plan Quota: {current.toLocaleString()} / {limit.toLocaleString()}
            </p>
          </div>
        </div>

        <p className="text-xs text-[var(--color-text-secondary)] dark:text-neutral-300 leading-relaxed">
          {message ||
            `You have reached the ${metricLabel.toLowerCase()} limit on your current ${sub.plan.name} plan. Upgrade your plan to expand cloud capacity.`}
        </p>

        <div className="p-3 rounded-xl bg-gray-50 dark:bg-neutral-900/60 border border-gray-200 dark:border-neutral-800 text-[11px] text-[var(--color-text-muted)]">
          🔒 <strong>Note:</strong> Your existing data is 100% safe and will never be deleted. Local operations remain fully functional offline.
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onClose} className="app-btn-secondary text-xs py-2 px-3.5">
            Continue Locally
          </button>
          <a
            href="/pricing"
            className="app-btn-primary text-xs py-2 px-4 shadow-md shadow-indigo-500/20"
          >
            Upgrade Plan →
          </a>
        </div>
      </div>
    </div>
  );
}
