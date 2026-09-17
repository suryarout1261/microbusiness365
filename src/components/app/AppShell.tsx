import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck, Wallet, FileText,
  Receipt, FileUp, BarChart3, Wrench, Settings, ChevronLeft, ChevronRight, Menu, X
} from 'lucide-react';

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
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function AppShell({ pathname = '/', children }: { pathname?: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isActive = useCallback((href: string) => {
    if (pathname === '/dashboard' && href === '/app') return true;
    return pathname === href;
  }, [pathname]);

  const SidebarContent = (
    <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 min-h-0">
      {modules.map(({ label, href, icon: Icon }) => {
        const active = isActive(href);
        return (
          <a
            key={label}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              active
                ? 'bg-gradient-to-r from-indigo-600/20 to-violet-600/10 text-indigo-700 dark:text-indigo-200 shadow-sm shadow-indigo-500/10 border border-indigo-200/40 dark:border-indigo-800/30'
                : 'text-gray-600 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={2} className="shrink-0" />
            <span className={`${expanded ? 'truncate' : 'sr-only lg:hidden'} truncate`}>{label}</span>
            <span className={`${expanded ? 'hidden lg:hidden' : 'sr-only'} truncate`}>{label}</span>
          </a>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-surface)] dark:bg-[#0a0a0a] text-[var(--color-text-primary)]">
      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar (always visible, sticky, scrollable) */}
        <aside
          className={`hidden lg:flex flex-col sticky top-0 h-screen z-40 border-r border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-[#0a0a0a]/90 backdrop-blur-xl shadow-xl shadow-black/5 transition-[width] duration-300 ${
            expanded ? 'w-72' : 'w-16'
          }`}
        >
          {/* Brand + toggle */}
          <div className="flex items-center justify-between px-3 py-4 shrink-0 gap-2">
            <a href="/" className={`font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent whitespace-nowrap ${expanded ? '' : 'w-0 overflow-hidden'}`} aria-label="MicroBusiness365">MicroBusiness365</a>
            <button
              onClick={() => setExpanded(s => !s)}
              aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-neutral-300 transition-colors shrink-0"
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>

          {SidebarContent}

          <div className="px-3 py-3 border-t border-gray-200 dark:border-neutral-800 shrink-0">
            <a href="/" className={`text-xs font-medium text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 whitespace-nowrap truncate ${expanded ? '' : 'w-0 overflow-hidden'}`}>Back to site</a>
          </div>
        </aside>

        {/* Mobile icon rail — only icons by default */}
        <aside className="lg:hidden flex flex-col sticky top-0 h-screen z-30 border-r border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-[#0a0a0a]/90 backdrop-blur-xl w-16 shadow-xl shadow-black/5">
          <button
            onClick={() => setMobileOpen(s => !s)}
            aria-label="Open menu"
            className="p-2 m-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-md shadow-indigo-500/25 hover:brightness-110 transition-all cursor-pointer"
          >
            <Menu size={20} />
          </button>
          <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 min-h-0">
            {modules.map(({ label, href, icon: Icon }) => {
              const active = isActive(href);
              return (
                <a
                  key={label}
                  href={href}
                  className={`flex items-center justify-center p-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-gradient-to-r from-indigo-600/20 to-violet-600/10 text-indigo-700 dark:text-indigo-200'
                      : 'text-gray-600 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800'
                  }`}
                  title={label}
                >
                  <Icon size={22} strokeWidth={2} />
                  <span className="sr-only">{label}</span>
                </a>
              );
            })}
          </nav>
        </aside>

        {/* Mobile expanded panel (open/close) */}
        <aside
          className={`lg:hidden fixed top-0 left-0 h-full w-[260px] z-[60] bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-2xl border-r border-gray-200 dark:border-neutral-800 shadow-2xl shadow-black/20 flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center justify-between px-4 py-4 shrink-0">
            <a href="/" className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">MicroBusiness365</a>
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-neutral-300">
              <X size={20} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 min-h-0">
            {modules.map(({ label, href, icon: Icon }) => {
              const active = isActive(href);
              return (
                <a key={label} href={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-gradient-to-r from-indigo-600/20 to-violet-600/10 text-indigo-700 dark:text-indigo-200' : 'text-gray-600 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800'}`}>
                  <Icon size={20} strokeWidth={2} />
                  <span className="truncate">{label}</span>
                </a>
              );
            })}
          </nav>
          <div className="px-3 py-3 border-t border-gray-200 dark:border-neutral-800 shrink-0"><a href="/" className="text-xs font-medium text-gray-500 dark:text-neutral-400 hover:text-gray-700">Back to site</a></div>
        </aside>

        {/* Mobile overlay */}
        <div className={`fixed inset-0 z-[55] lg:hidden transition-opacity duration-200 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} bg-black/40 dark:bg-black/60 backdrop-blur-sm`} onClick={() => setMobileOpen(false)} aria-hidden={!mobileOpen} />

        {/* Main content area */}
        <main className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 relative">
            {children}
          </div>
        </main>
      </div>

      {/* Footer always inside main flow, never covered */}
      <footer className="w-full border-t border-gray-200 dark:border-neutral-800 bg-white/70 dark:bg-[#0a0a0a]/70 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h4 className="font-bold text-[var(--color-text-primary)] mb-2">MicroBusiness365</h4>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">Simple business tools for small shops, freelancers, and home businesses.</p>
          </div>
          <div>
            <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">Product</h4>
            <ul className="space-y-1 text-sm"><li><a href="/app" className="hover:text-[var(--color-text-primary)]">Overview</a></li><li><a href="/sales" className="hover:text-[var(--color-text-primary)]">Sales</a></li><li><a href="/inventory" className="hover:text-[var(--color-text-primary)]">Inventory</a></li><li><a href="/customers" className="hover:text-[var(--color-text-primary)]">Customers</a></li></ul>
          </div>
          <div>
            <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">Resources</h4>
            <ul className="space-y-1 text-sm"><li><a href="/reports" className="hover:text-[var(--color-text-primary)]">Reports</a></li><li><a href="/tools" className="hover:text-[var(--color-text-primary)]">Tools</a></li></ul>
          </div>
          <div>
            <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">Legal</h4>
            <ul className="space-y-1 text-sm"><li><a href="#terms" className="hover:text-[var(--color-text-primary)]">Terms</a></li><li><a href="#privacy" className="hover:text-[var(--color-text-primary)]">Privacy</a></li></ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-t border-gray-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
          <span>© {new Date().getFullYear()} MicroBusiness365. Built for small businesses.</span>
          <span>Local-first • Ad-free • No sign-in required</span>
        </div>
      </footer>
    </div>
  );
}
