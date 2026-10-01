import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck, Wallet, FileText,
  Receipt, FileUp, BarChart3, Wrench, Settings, ChevronLeft, ChevronRight,
  Menu, User, Sparkles
} from 'lucide-react';
import { useTheme } from '../../hooks/use-theme';
import SyncStatusBadge from '../sync/SyncStatusBadge';
import MigrationModal from '../auth/MigrationModal';

const modules = [
  { label: 'Overview', href: '/app', icon: LayoutDashboard },
  { label: 'Sales', href: '/sales', icon: ShoppingCart },
  { label: 'Inventory', href: '/inventory', icon: Package },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Suppliers', href: '/suppliers', icon: Truck },
  { label: 'Expenses', href: '/expenses', icon: Wallet },
  { label: 'Purchases', href: '/purchases', icon: FileUp },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Payments', href: '/payment', icon: Receipt },
  { label: 'Quotations', href: '/quotation', icon: FileUp },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Tools', href: '/tools', icon: Wrench },
  { label: 'Account', href: '/account', icon: User },
  { label: 'Pricing', href: '/pricing', icon: Sparkles },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function AppShell({ pathname = '/', children }: { pathname?: string; children: React.ReactNode }) {
  const [desktopExpanded, setDesktopExpanded] = useState(true);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mb365_sidebar_expanded');
      if (saved !== null) {
        setDesktopExpanded(saved === 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleDesktop = () => {
    setDesktopExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('mb365_sidebar_expanded', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleMobile = () => {
    setMobileExpanded((prev) => !prev);
  };

  const isActive = useCallback((href: string) => {
    if (pathname === '/dashboard' && href === '/app') return true;
    if ((pathname === '/payment' || pathname === '/payments') && (href === '/payment' || href === '/payments')) return true;
    return pathname === href;
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-surface)] dark:bg-[#0a0a0a] text-[var(--color-text-primary)]">
      {/* Top Header: Home page button & Dark mode button */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-3.5 sm:px-6 h-16 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-gray-200 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile sidebar toggle button: toggles between expanded (labels) and collapsed (icons only) */}
          <button
            type="button"
            onClick={toggleMobile}
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
            <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent whitespace-nowrap">
              MicroBusiness365
            </span>
          </a>
        </div>

        {/* Right controls: Sync badge, Migration Modal & Dark mode button */}
        <div className="flex items-center gap-2">
          <SyncStatusBadge />
          <MigrationModal />

          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="p-2.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-[calc(100vh-4rem)]">
        {/* Responsive Left Sidebar: supports collapse & expand on both mobile & desktop */}
        <aside
          className={`flex flex-col sticky top-16 h-[calc(100vh-4rem)] z-30 border-r border-gray-200 dark:border-neutral-800 bg-white/95 dark:bg-[#0c0c10]/95 backdrop-blur-xl shadow-lg shadow-black/5 transition-[width] duration-300 ease-in-out shrink-0 overflow-hidden ${
            mobileExpanded ? 'w-56' : 'w-14'
          } ${
            desktopExpanded ? 'lg:w-64' : 'lg:w-16'
          }`}
        >
          {/* Sidebar Top / Toggle Header */}
          <div className="flex items-center justify-between px-3 py-3.5 border-b border-gray-100 dark:border-neutral-800/80 shrink-0 h-13">
            {/* Title/Badge shown when expanded */}
            <div className={`overflow-hidden whitespace-nowrap ${mobileExpanded ? 'block' : 'hidden'} ${desktopExpanded ? 'lg:block' : 'lg:hidden'}`}>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
                Workspace
              </span>
            </div>

            {/* Compact MB badge shown when collapsed */}
            <div className={`mx-auto font-bold text-xs text-indigo-600 dark:text-indigo-400 ${mobileExpanded ? 'hidden' : 'block'} ${desktopExpanded ? 'lg:hidden' : 'lg:block'}`}>
              MB
            </div>

            {/* Desktop collapse/expand button */}
            <div className="hidden lg:block ml-auto">
              <button
                type="button"
                onClick={toggleDesktop}
                aria-label={desktopExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                title={desktopExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                {desktopExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-1.5 sm:px-2 py-3 space-y-1 min-h-0">
            {modules.map(({ label, href, icon: Icon }) => {
              const active = isActive(href);
              return (
                <a
                  key={label}
                  href={href}
                  title={label}
                  className={`flex items-center rounded-xl text-sm font-medium transition-all ${
                    mobileExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5'
                  } ${
                    desktopExpanded ? 'lg:gap-3 lg:px-3 lg:py-2.5' : 'lg:justify-center lg:p-2.5'
                  } ${
                    active
                      ? 'bg-gradient-to-r from-indigo-600/15 to-violet-600/10 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-200/50 dark:border-indigo-800/40 font-semibold'
                      : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800/70'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={19} strokeWidth={active ? 2.3 : 1.8} className="shrink-0" />
                  <span
                    className={`truncate whitespace-nowrap ${
                      mobileExpanded ? 'inline' : 'hidden'
                    } ${
                      desktopExpanded ? 'lg:inline' : 'lg:hidden'
                    }`}
                  >
                    {label}
                  </span>
                </a>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-2 sm:p-3 border-t border-gray-200 dark:border-neutral-800 shrink-0">
            <a
              href="/"
              title="Back to Home"
              className={`flex items-center rounded-lg text-xs font-medium text-gray-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
                mobileExpanded ? 'justify-start px-2 py-1.5' : 'justify-center p-1.5'
              } ${
                desktopExpanded ? 'lg:justify-start lg:px-2 lg:py-1.5' : 'lg:justify-center lg:p-1.5'
              }`}
            >
              <span className={`${mobileExpanded ? 'inline' : 'hidden'} ${desktopExpanded ? 'lg:inline' : 'lg:hidden'}`}>
                Back to Home
              </span>
              <span className={`${mobileExpanded ? 'hidden' : 'inline'} ${desktopExpanded ? 'lg:hidden' : 'lg:inline'}`}>
                ←
              </span>
            </a>
          </div>
        </aside>

        {/* Main Content Workspace: Automatically takes remaining available width */}
        <main className="flex-1 min-w-0 w-full overflow-x-hidden">
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 relative">
            {children}
          </div>
        </main>
      </div>

      {/* App Shell Footer */}
      <footer className="w-full border-t border-gray-200 dark:border-neutral-800 bg-white/70 dark:bg-[#0a0a0a]/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-text-muted)]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--color-text-primary)]">MicroBusiness365</span>
            <span>•</span>
            <span>Local-first Business Operating System</span>
          </div>
          <div className="flex items-center gap-4 text-gray-500 dark:text-neutral-400">
            <a href="/tools" className="hover:text-indigo-600 transition-colors">Tools</a>
            <a href="/terms" className="hover:text-indigo-600 transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy</a>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
