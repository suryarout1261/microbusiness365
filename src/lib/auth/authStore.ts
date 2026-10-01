import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client';
import { fetchUserBusiness, type BusinessProfile } from './authService';

export interface AuthState {
  isConfigured: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    id: string;
    email: string;
    createdAt?: string;
  } | null;
  business: BusinessProfile | null;
}

let state: AuthState = {
  isConfigured: isSupabaseConfigured,
  isAuthenticated: false,
  isLoading: true,
  user: null,
  business: null,
};

const listeners = new Set<(s: AuthState) => void>();

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch (e) {
      console.error('Error in auth listener:', e);
    }
  });
}

export const authStore = {
  getState: () => state,
  subscribe: (fn: (s: AuthState) => void) => {
    listeners.add(fn);
    fn(state);
    return () => listeners.delete(fn);
  },
  setUser: (user: AuthState['user'], business: BusinessProfile | null) => {
    state = {
      ...state,
      isAuthenticated: Boolean(user),
      isLoading: false,
      user,
      business,
    };
    notify();
  },
  setLoading: (loading: boolean) => {
    state = { ...state, isLoading: loading };
    notify();
  },
};

// Initialize auth state listener in browser
let initialized = false;

export function initAuth() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const client = getSupabaseClient();
  if (!client) {
    authStore.setUser(null, null);
    return;
  }

  // Get current session
  client.auth.getSession().then(async ({ data: { session } }) => {
    if (session?.user) {
      const biz = await fetchUserBusiness(session.user.id);
      authStore.setUser(
        {
          id: session.user.id,
          email: session.user.email || '',
          createdAt: session.user.created_at,
        },
        biz
      );
    } else {
      authStore.setUser(null, null);
    }
  }).catch((err) => {
    console.warn('Failed to retrieve initial auth session:', err);
    authStore.setUser(null, null);
  });

  // Listen to auth changes
  client.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const biz = await fetchUserBusiness(session.user.id);
      authStore.setUser(
        {
          id: session.user.id,
          email: session.user.email || '',
          createdAt: session.user.created_at,
        },
        biz
      );
    } else {
      authStore.setUser(null, null);
    }
  });
}

// Auto-initialize when loaded on client
if (typeof window !== 'undefined') {
  initAuth();
}
