import { useState, useEffect } from 'react';
import { detectLocalData, migrateLocalDataToCloud } from '../../lib/sync/syncEngine';
import { authStore } from '../../lib/auth/authStore';
import type { LocalDataSummary } from '../../lib/sync/syncTypes';
import { db } from '../../lib/db';

export default function MigrationModal() {
  const [open, setOpen] = useState(false);
  const [localData, setLocalData] = useState<LocalDataSummary | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [progressStep, setProgressStep] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return authStore.subscribe(async (auth) => {
      if (auth.isAuthenticated && auth.business?.id) {
        // Check if already migrated
        const meta = await db.syncMeta.get('last_migrated_at');
        if (!meta) {
          const summary = await detectLocalData();
          if (summary.hasData && summary.totalRecords > 0) {
            setLocalData(summary);
            setOpen(true);
          }
        }
      } else {
        setOpen(false);
      }
    });
  }, []);

  if (!open || !localData) return null;

  const handleMigrate = async () => {
    const auth = authStore.getState();
    if (!auth.business?.id) return;

    setMigrating(true);
    setError(null);
    try {
      await migrateLocalDataToCloud(auth.business.id, (step, percent) => {
        setProgressStep(step);
        setProgressPercent(percent);
      });
      setDone(true);
      setTimeout(() => {
        setOpen(false);
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Migration failed. You can retry anytime from Settings.');
    } finally {
      setMigrating(false);
    }
  };

  const handleSkip = async () => {
    const now = new Date().toISOString();
    await db.syncMeta.put({ key: 'last_migrated_at', value: now, updatedAt: now });
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#121216] p-6 shadow-2xl relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl">
            ☁️
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] dark:text-white">
              Sync Local Data to Cloud
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] dark:text-neutral-400">
              We detected existing business records stored on this device.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {done ? (
          <div className="py-6 text-center space-y-2">
            <div className="text-3xl">🎉</div>
            <h4 className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              Cloud Backup Complete!
            </h4>
            <p className="text-xs text-[var(--color-text-muted)]">
              All your local data has been synchronized securely with your cloud account.
            </p>
          </div>
        ) : migrating ? (
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-primary)] dark:text-white">
              <span>{progressStep || 'Uploading local records...'}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-center text-[var(--color-text-muted)]">
              Please keep this tab open while data is backing up.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[var(--color-text-secondary)] dark:text-neutral-300 leading-relaxed">
              Would you like to back up your local records to your cloud business so you can access them across multiple devices?
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[var(--color-surface)] dark:bg-neutral-900/60 border border-[var(--color-border)] dark:border-neutral-800 text-center text-xs">
              <div className="p-2">
                <div className="font-bold text-base text-[var(--color-text-primary)] dark:text-white">
                  {localData.productsCount}
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)]">Products</div>
              </div>
              <div className="p-2">
                <div className="font-bold text-base text-[var(--color-text-primary)] dark:text-white">
                  {localData.customersCount}
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)]">Customers</div>
              </div>
              <div className="p-2">
                <div className="font-bold text-base text-[var(--color-text-primary)] dark:text-white">
                  {localData.salesCount}
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)]">Sales</div>
              </div>
              <div className="p-2">
                <div className="font-bold text-base text-[var(--color-text-primary)] dark:text-white">
                  {localData.invoicesCount}
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)]">Invoices</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-700 dark:text-amber-300">
              🔒 <strong>Safe Sync Guarantee:</strong> Your local data will remain fully intact and available offline even after cloud sync.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleSkip}
                className="app-btn-secondary text-xs py-2 px-3.5"
              >
                Skip For Now
              </button>
              <button
                type="button"
                onClick={handleMigrate}
                className="app-btn-primary text-xs py-2 px-4 shadow-md shadow-indigo-500/20"
              >
                Back Up & Sync to Cloud
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
