import type { NavLink } from '../../types';

interface SidebarProps {
  links: NavLink[];
  currentPath: string;
}

export default function Sidebar({ links, currentPath }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-neutral-900 border-r border-neutral-800 z-20 hidden md:flex">
      <div className="flex h-full flex-col p-6 space-y-4">
        <div className="mb-6">
          <span className="text-xl font-semibold">MicroBusiness365</span>
        </div>
        <nav className="flex-1 space-y-2">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium 
                         ${currentPath === link.href
                           ? 'bg-neutral-800 text-white'
                           : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto border-t border-neutral-800 pt-4 text-xs text-neutral-500">
          v0.1.0
        </div>
      </div>
    </aside>
  );
}
