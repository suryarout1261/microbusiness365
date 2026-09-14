import { useState } from 'react';
import BrandLogo from '../ui/BrandLogo';
import { useTheme } from '../../hooks/use-theme';

export default function LandingHeader() {
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-gray-200 dark:border-neutral-800">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2"><BrandLogo size="sm" /></a>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-neutral-300">
          <a href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">Features</a>
          <a href="#tools" className="hover:text-gray-900 dark:hover:text-white transition-colors">Tools</a>
          <a href="#about" className="hover:text-gray-900 dark:hover:text-white transition-colors">About</a>
          <a href="#blogs" className="hover:text-gray-900 dark:hover:text-white transition-colors">Blogs</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="/app" className="hidden sm:inline-flex text-sm font-medium text-gray-700 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white">Dashboard</a>
          <a href="#tools" className="inline-flex px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all">Get started</a>
          <button onClick={toggle} aria-label="Toggle dark mode" className="p-2 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-gray-700 dark:text-neutral-300" aria-label="Menu">☰</button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a] px-6 py-4 space-y-2 text-sm font-medium">
          <a href="#features" onClick={() => setOpen(false)} className="block py-2">Features</a>
          <a href="#tools" onClick={() => setOpen(false)} className="block py-2">Tools</a>
          <a href="#about" onClick={() => setOpen(false)} className="block py-2">About</a>
          <a href="#blogs" onClick={() => setOpen(false)} className="block py-2">Blogs</a>
          <a href="/app" className="block py-2">Dashboard</a>
        </div>
      )}
    </header>
  );
}
