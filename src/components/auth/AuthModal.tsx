import { useState, useEffect } from 'react';
import { authStore } from '../../lib/auth/authStore';
import {
  signInWithPassword,
  signUpWithPassword,
  sendPasswordResetEmail,
  updateAccountPassword,
} from '../../lib/auth/authService';
import { isSupabaseConfigured } from '../../lib/supabase/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'signin' | 'signup' | 'forgot';
}

export default function AuthModal({ isOpen, onClose, initialTab = 'signin' }: AuthModalProps) {
  const [tab, setTab] = useState<'signin' | 'signup' | 'forgot' | 'reset'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setTab(initialTab);
    setError(null);
    setSuccessMsg(null);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithPassword(email, password);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!businessName.trim()) {
      setError('Please enter your business or store name.');
      return;
    }
    setLoading(true);
    try {
      await signUpWithPassword(email, password, businessName);
      setSuccessMsg('Account created successfully! Check your inbox to verify your email if required.');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(email);
      setSuccessMsg('Password reset link has been sent to your email address.');
    } catch (err: any) {
      setError(err?.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#121216] p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition"
          aria-label="Close modal"
        >
          ✕
        </button>

        {!isSupabaseConfigured ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl font-bold">
              ℹ️
            </div>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] dark:text-white">
              Cloud Setup Required
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] dark:text-neutral-400 leading-relaxed">
              Cloud synchronization and multi-device mode require Supabase environment variables (<code className="text-indigo-600 dark:text-indigo-400 font-mono">PUBLIC_SUPABASE_URL</code> & <code className="text-indigo-600 dark:text-indigo-400 font-mono">PUBLIC_SUPABASE_ANON_KEY</code>).
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              You can continue using all features in <strong>Free Local Mode</strong> with Dexie IndexedDB without signing in.
            </p>
            <div className="pt-2">
              <button onClick={onClose} className="app-btn-primary w-full">
                Continue Offline Local Mode
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-lg mb-2 shadow-md shadow-indigo-500/20">
                MB
              </div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] dark:text-white">
                {tab === 'signin' && 'Sign in to MicroBusiness365'}
                {tab === 'signup' && 'Create Cloud Account'}
                {tab === 'forgot' && 'Reset Your Password'}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] dark:text-neutral-400 mt-1">
                {tab === 'signin' && 'Access your business data across all your devices'}
                {tab === 'signup' && 'Enable automatic cloud backups & multi-device sync'}
                {tab === 'forgot' && 'Enter your email to receive a password reset link'}
              </p>
            </div>

            {/* Error / Success alerts */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400 font-medium">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {successMsg}
              </div>
            )}

            {/* Sign In Form */}
            {tab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@business.com"
                    className="app-input w-full"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setTab('forgot')}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="app-input w-full"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="app-btn-primary w-full py-2.5 mt-2 flex items-center justify-center gap-2"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
                <div className="text-center pt-2 text-xs text-[var(--color-text-secondary)] dark:text-neutral-400">
                  Don't have a cloud account?{' '}
                  <button
                    type="button"
                    onClick={() => setTab('signup')}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            )}

            {/* Sign Up Form */}
            {tab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Apex Retail Enterprises"
                    className="app-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@business.com"
                    className="app-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                    Create Password (Min 6 chars) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="app-input w-full"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="app-btn-primary w-full py-2.5 mt-2 flex items-center justify-center gap-2"
                >
                  {loading ? 'Creating Account...' : 'Create Account & Enable Cloud'}
                </button>
                <div className="text-center pt-2 text-xs text-[var(--color-text-secondary)] dark:text-neutral-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setTab('signin')}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            )}

            {/* Forgot Password Form */}
            {tab === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@business.com"
                    className="app-input w-full"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="app-btn-primary w-full py-2.5 mt-2 flex items-center justify-center gap-2"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <div className="text-center pt-2 text-xs text-[var(--color-text-secondary)] dark:text-neutral-400">
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => setTab('signin')}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
