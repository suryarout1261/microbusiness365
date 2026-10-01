import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck, Wallet, FileText,
  Receipt, FileUp, BarChart3, Wrench, Settings, ChevronLeft, ChevronRight
} from 'lucide-react';
import { sidebarStore } from '../../lib/sidebarStore';

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
  const [desktopExpanded, setDesktopExpanded] = useState(sidebarStore.isDesktopExpanded());
  const [mobileExpanded, setMobileExpanded] = useState(sidebarStore.isMobileExpanded());

  useEffect(() => {
    return sidebarStore.subscribe(() => {
      setDesktopExpanded(sidebarStore.isDesktopExpanded());
      setMobileExpanded(sidebarStore.isMobileExpanded());
    });
  }, []);

  const isActive = useCallback((href: string) => {
    if (pathname === '/dashboard' && href === '/app') return true;
    if ((pathname === '/payment' || pathname === '/payments') && (href === '/payment' || href === '/payments')) return true;
    return pathname === href || pathname === `${href}/`;
  }, [pathname]);

  return (
    <aside
      className={`flex flex-col sticky top-16 h-[calc(100vh-4rem)] z-30 border-r border-gray-200 dark:border-neutral-800 bg-white/95 dark:bg-[#0c0c10]/95 backdrop-blur-xl shadow-lg shadow-black/5 transition-[width] duration-300 ease-in-out shrink-0 overflow-hidden ${
        mobileExpanded ? 'w-56' : 'w-14'
      } ${
        desktopExpanded ? 'lg:w-64' : 'lg:w-16'
      }`}
    >
      {/* Sidebar Top / Toggle Header */}
      <div className="flex items-center justify-between px-3 py-3.5 border-b border-gray-100 dark:border-neutral-800/80 shrink-0 h-13">
        {/* Title shown when expanded */}
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
            onClick={() => sidebarStore.toggleDesktop()}
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
  );
}