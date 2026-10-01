import { useState, useEffect } from 'react';
import { syncStore } from '../../lib/sync/syncStore';
import { authStore } from '../../lib/auth/authStore';
import { syncAll } from '../../lib/sync/syncEngine';
import type { SyncState } from '../../lib/sync/syncTypes';
import AuthModal from '../auth/AuthModal';

export default function SyncStatusBadge() {
  const [syncState, setSyncState] = useState<SyncState>(syncStore.getState());
  const [isAuth, setIsAuth] = useState(authStore.getState().isAuthenticated);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const unsubSync = syncStore.subscribe(setSyncState);
    const unsubAuth = authStore.subscribe((a) => setIsAuth(a.isAuthenticated));
    return () => {
      unsubSync();
      unsubAuth();
    };
  }, []);

  if (!isAuth) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAuthModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 border border-gray-200 dark:border-neutral-700 transition cursor-pointer"
          title="Running locally on this device. Click to sign in or enable multi-device cloud backup."
        >
          <span className="w-2 h-2 rounded-full bg-gray-400"></span>
          <span>Local Mode</span>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold underline">Cloud Sync</span>
        </button>
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </>
    );
  }

  const { status, isOnline, pendingCount } = syncState;

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => syncAll()}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
          status === 'syncing'
            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
            : !isOnline || status === 'offline'
            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            : status === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        }`}
        title="Click to trigger cloud synchronization"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            status === 'syncing'
              ? 'bg-indigo-500 animate-ping'
              : !isOnline || status === 'offline'
              ? 'bg-amber-500'
              : status === 'error'
              ? 'bg-rose-500'
              : 'bg-emerald-500'
          }`}
        />
        <span>
          {status === 'syncing'
            ? 'Syncing...'
            : !isOnline || status === 'offline'
            ? pendingCount > 0 ? `Offline (${pendingCount} queued)` : 'Offline'
            : status === 'error'
            ? 'Sync Retry'
            : 'Cloud Synced'}
        </span>
      </button>
    </div>
  );
}
