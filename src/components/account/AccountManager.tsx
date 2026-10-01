import { useState, useEffect } from 'react';
import { authStore, type AuthState } from '../../lib/auth/authStore';
import { signOutUser, updateAccountPassword } from '../../lib/auth/authService';
import { subscriptionStore, type SubscriptionState } from '../../lib/subscriptions/subscriptionStore';
import { syncStore } from '../../lib/sync/syncStore';
import { syncAll } from '../../lib/sync/syncEngine';
import UsageDashboard from '../usage/UsageDashboard';
import AuthModal from '../auth/AuthModal';
import { formatDate } from '../../lib/utils';

export default function AccountManager() {
  const [auth, setAuth] = useState<AuthState>(authStore.getState());
  const [sub, setSub] = useState<SubscriptionState>(subscriptionStore.getState());
  const [syncState, setSyncState] = useState(syncStore.getState());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    const unsubAuth = authStore.subscribe(setAuth);
    const unsubSub = subscriptionStore.subscribe(setSub);
    const unsubSync = syncStore.subscribe(setSyncState);
    return () => {
      unsubAuth();
      unsubSub();
      unsubSync();
    };
  }, []);

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out? Your local data will remain safe on this device.')) {
      await signOutUser();
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setChangingPass(true);
    try {
      await updateAccountPassword(newPassword);
      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err?.message || 'Failed to update password.' });
    } finally {
      setChangingPass(false);
    }
  };

  if (!auth.isAuthenticated || !auth.user) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-8 text-center space-y-4 shadow-sm max-w-xl mx-auto">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl font-bold">
            👤
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] dark:text-white">
              Cloud Account & Multi-Device Sync
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] dark:text-neutral-400 mt-1 max-w-md mx-auto">
              You are currently using MicroBusiness365 in <strong>Free Local Mode</strong>. Sign in or create an account to back up data and sync across multiple devices.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <button onClick={() => setAuthModalOpen(true)} className="app-btn-primary">
              Sign In / Create Account
            </button>
            <a href="/pricing" className="app-btn-secondary">
              Explore Cloud Plans
            </a>
          </div>
        </div>

        {/* Local Usage Dashboard */}
        <UsageDashboard />

        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Account Profile Card */}
      <div className="rounded-3xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] dark:border-neutral-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center text-xl font-extrabold shadow-md shadow-indigo-500/20">
              {auth.user.email ? auth.user.email[0].toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)] dark:text-white">
                  {auth.business?.name || 'My Business'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {sub.plan.name}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] dark:text-neutral-400 mt-0.5">
                {auth.user.email} • Role: <span className="capitalize font-semibold">{auth.business?.role || 'Owner'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => syncAll()}
              className="app-btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <span>🔄</span>
              <span>Sync Now</span>
            </button>
            <button
              onClick={handleSignOut}
              className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-semibold transition"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Subscription Status Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-[var(--color-surface)] dark:bg-neutral-900/50 border border-[var(--color-border)] dark:border-neutral-800 space-y-1">
            <div className="text-[var(--color-text-muted)] font-medium">Subscription Plan</div>
            <div className="text-base font-bold text-[var(--color-text-primary)] dark:text-white flex items-center justify-between">
              <span>{sub.plan.name}</span>
              <a href="/pricing" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Upgrade →
              </a>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--color-surface)] dark:bg-neutral-900/50 border border-[var(--color-border)] dark:border-neutral-800 space-y-1">
            <div className="text-[var(--color-text-muted)] font-medium">Billing Term</div>
            <div className="text-base font-bold text-[var(--color-text-primary)] dark:text-white capitalize">
              {sub.billingCycle} Cycle
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--color-surface)] dark:bg-neutral-900/50 border border-[var(--color-border)] dark:border-neutral-800 space-y-1">
            <div className="text-[var(--color-text-muted)] font-medium">Renewal / Validity</div>
            <div className="text-base font-bold text-[var(--color-text-primary)] dark:text-white">
              {sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : 'Active'}
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Resource Usage */}
      <UsageDashboard />

      {/* Security & Password Settings */}
      <div className="rounded-3xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-[var(--color-text-primary)] dark:text-white">
          Security & Password
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] dark:text-neutral-400">
          Update your cloud account password below.
        </p>

        {passwordMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-medium ${
              passwordMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200'
            }`}
          >
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="max-w-md space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
              New Password (Min 6 chars)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="app-input w-full"
            />
          </div>
          <button
            type="submit"
            disabled={changingPass}
            className="app-btn-secondary text-xs py-2 px-4"
          >
            {changingPass ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
