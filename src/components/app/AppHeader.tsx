import { useState, useEffect } from 'react';
import { Menu, LayoutDashboard } from 'lucide-react';
import { useTheme } from '../../hooks/use-theme';
import { sidebarStore } from '../../lib/sidebarStore';
import SyncStatusBadge from '../sync/SyncStatusBadge';

export default function AppHeader({ pathname = '/' }: { pathname?: string }) {
  const [mobileExpanded, setMobileExpanded] = useState(sidebarStore.isMobileExpanded());
  const { theme, toggle } = useTheme();

  useEffect(() => {
    return sidebarStore.subscribe(() => {
      setMobileExpanded(sidebarStore.isMobileExpanded());
    });
  }, []);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-3 sm:px-6 h-16 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-gray-200 dark:border-neutral-800 shadow-sm shrink-0">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile sidebar toggle button */}
        <button
          type="button"
          onClick={() => sidebarStore.toggleMobile()}
          aria-label="Open sidebar menu"
          className="lg:hidden p-2 rounded-xl bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 hover:bg-gray-200 dark:hover:bg-neutral-700 active:scale-95 transition-all cursor-pointer"
        >
          <Menu size={20} />
        </button>

        {/* Home page button / Logo */}
        <a
          href="/"
          className="flex items-center gap-2 group"
          aria-label="MicroBusiness365 Home"
        >
          <img src="/favicon.svg" alt="" className="h-7 w-7 transition-transform group-hover:scale-105" />
          <span className="font-extrabold text-sm sm:text-lg tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent whitespace-nowrap">
            MicroBusiness365
          </span>
        </a>
      </div>

      {/* Right controls: Sync badge, Pricing, Dashboard button & Dark mode button */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <SyncStatusBadge />

        <a
          href="/pricing"
          className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition whitespace-nowrap"
          title="View cloud subscription plans"
        >
          <span>⚡ Pricing</span>
        </a>

        <a
          href="/account"
          className="p-2 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 hover:bg-gray-200 dark:hover:bg-neutral-700 transition"
          title="Account & Subscription"
          aria-label="Account & Subscription"
        >
          <span className="text-xs font-bold">👤</span>
        </a>

        <a
          href="/app"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/40 active:scale-95 transition-all whitespace-nowrap"
          title="Go to Dashboard"
        >
          <LayoutDashboard size={14} className="shrink-0" />
          <span>Dashboard</span>
        </a>

        <button
          type="button"
          onClick={toggle}
          aria-label="Toggle dark mode"
          className="p-2 sm:p-2.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </header>
  );
}
