import type { SyncState, SyncStatus } from './syncTypes';

let state: SyncState = {
  status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced',
  lastSyncedAt: null,
  pendingCount: 0,
  errorMessage: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
};

const listeners = new Set<(s: SyncState) => void>();

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch (err) {
      console.error('Error in syncStore listener:', err);
    }
  });
}

export const syncStore = {
  getState: () => state,
  subscribe: (fn: (s: SyncState) => void) => {
    listeners.add(fn);
    fn(state);
    return () => listeners.delete(fn);
  },
  setStatus: (status: SyncStatus, errorMessage?: string | null) => {
    state = {
      ...state,
      status,
      errorMessage: errorMessage !== undefined ? errorMessage : state.errorMessage,
    };
    notify();
  },
  setLastSynced: (timestamp: string) => {
    state = {
      ...state,
      status: 'synced',
      lastSyncedAt: timestamp,
      errorMessage: null,
    };
    notify();
  },
  setPendingCount: (count: number) => {
    state = { ...state, pendingCount: count };
    notify();
  },
  setOnline: (isOnline: boolean) => {
    state = {
      ...state,
      isOnline,
      status: !isOnline ? 'offline' : state.pendingCount > 0 ? 'syncing' : state.status === 'offline' ? 'synced' : state.status,
    };
    notify();
  },
};
