import { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck, Wallet, FileText,
  Receipt, FileUp, BarChart3, Wrench, Settings, Menu, ChevronLeft, ChevronRight
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

export default function AppSidebar({ pathname = '/' }: { pathname?: string }) {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true); // desktop: true = show text (expanded), false = icon-only (collapsed)
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile: true = overlay open

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth < 1024);
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  const handleToggle = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarExpanded(!sidebarExpanded);
    }
  };

  const isActive = (href: string) => {
    // Handle special case: /app is also the dashboard
    if (pathname === '/dashboard' && href === '/app') return true;
    return pathname === href;
  };

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-4 py-4">
        <a href="/" className="flex items-center gap-2.5 font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent whitespace-nowrap">
          MicroBusiness365
        </a>
        <button
          onClick={handleToggle}
          aria-label={isMobile ? (sidebarOpen ? 'Close sidebar' : 'Open sidebar') : (sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar')}
          className="p-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
        >
          {isMobile ? (sidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />) : (sidebarExpanded ? <ChevronRight size={18} /> : <Menu size={18} />)}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
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
              title={!isMobile && !sidebarExpanded ? label : undefined} // Show tooltip on desktop when collapsed
            >
              <Icon size={20} strokeWidth={2} className="shrink-0" />
              {!isMobile && sidebarExpanded && <span className="truncate">{label}</span>}
              {isMobile && <span className="truncate">{label}</span>}
            </a>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-gray-200 dark:border-neutral-800 flex items-center gap-2">
        <a href="/" className="text-xs font-medium text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 whitespace-nowrap truncate">Back to site</a>
      </div>
    </>
  );

  return (
    <>
      {/* Hamburger button (visible on both desktop and mobile) */}
      <button
        onClick={handleToggle}
        aria-label={isMobile ? (sidebarOpen ? 'Close sidebar' : 'Open sidebar') : (sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar')}
        className={`fixed top-4 left-4 z-[60] p-2.5 rounded-xl bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-md shadow-lg border border-gray-200 dark:border-neutral-800 text-gray-800 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors ${
          isMobile ? '' : 'lg:hidden'
        }`}
      >
        {isMobile ? (sidebarOpen ? <ChevronLeft size={22} /> : <Menu size={22} />) : (sidebarExpanded ? <ChevronRight size={22} /> : <Menu size={22} />)}
      </button>

      {/* Desktop sidebar (always visible) */}
      {!isMobile && (
        <aside
          className={`flex-col sticky top-0 h-screen z-50 border-r border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-[#0a0a0a]/90 backdrop-blur-xl transition-all duration-300 ${
            sidebarExpanded ? 'w-64' : 'w-16'
          } shadow-xl shadow-black/5`}
        >
          {sidebarContent}
        </aside>
      )}

      {/* Mobile overlay drawer */}
      {isMobile && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-[70] lg:hidden transition-opacity duration-200 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setSidebarOpen(false)}
            aria-hidden={!sidebarOpen}
          >
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />
          </div>
          {/* Drawer */}
          <aside
            onClick={e => e.stopPropagation()}
            className={`absolute top-0 left-0 h-full w-[256px] bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-2xl border-r border-gray-200 dark:border-neutral-800 shadow-2xl shadow-black/20 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="flex items-center justify-between px-4 py-4">
              <a href="/" className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">MicroBusiness365</a>
              <button onClick={handleToggle} aria-label="Close sidebar" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800">
                <Menu size={18} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
              {modules.map(({ label, href, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <a key={label} href={href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-gradient-to-r from-indigo-600/20 to-violet-600/10 text-indigo-700 dark:text-indigo-200' : 'text-gray-600 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800'}`}>
                    <Icon size={20} strokeWidth={2} />
                    <span>{label}</span>
                  </a>
                );
              })}
            </nav>
            <div className="px-3 py-3 border-t border-gray-200 dark:border-neutral-800"><a href="/" className="text-xs font-medium text-gray-500 dark:text-neutral-400 hover:text-gray-700">Back to site</a></div>
          </aside>
        </>
      )}
    </>
  );
}