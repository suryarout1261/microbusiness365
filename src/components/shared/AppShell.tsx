import type { ReactNode } from 'react';
import type { NavLink } from '../../types';
import Sidebar from './Sidebar';
import Header from './Header';

interface AppShellProps {
  children: ReactNode;
  links: NavLink[];
  currentPath: string;
}

export default function AppShell({ children, links, currentPath }: AppShellProps) {
  return (
    <div className="flex h-screen bg-black">
      <Sidebar links={links} currentPath={currentPath} />
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <Header currentPath={currentPath} />
        <main className="flex-1 overflow-auto p-6 bg-black">
          {children}
        </main>
      </div>
    </div>
  );
}
