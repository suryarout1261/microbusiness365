import { useState } from 'react';
import { useTheme } from '../../hooks/use-theme';
import BrandLogo from '../ui/BrandLogo';

export default function LandingHeader() {
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();

  return (
    <header className="w-full sticky top-0 z-50 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-gray-200 dark:border-neutral-800">

      {/* INNER HEADER CONTAINER */}
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">

        {/* LOGO */}
        <a
          href="/"
          className="flex items-center shrink-0 gap-2"
          aria-label="MicroBusiness365"
        >
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent whitespace-nowrap">Micro Business 365</span>
        </a>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-7 text-sm font-medium text-gray-600 dark:text-neutral-300">
          <a
            href="/#features"
            className="hover:text-gray-900 dark:hover:text-white transition-colors whitespace-nowrap"
          >
            Features
          </a>

          <a
            href="/tools"
            className="hover:text-gray-900 dark:hover:text-white transition-colors whitespace-nowrap"
          >
            Tools
          </a>

          <a
            href="/pricing"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold text-indigo-600 dark:text-indigo-400 transition-colors whitespace-nowrap"
          >
            Pricing ⚡
          </a>

          <a
            href="/#about"
            className="hover:text-gray-900 dark:hover:text-white transition-colors whitespace-nowrap"
          >
            About
          </a>

          <a
            href="/terms"
            className="hover:text-gray-900 dark:hover:text-white transition-colors whitespace-nowrap"
          >
            Terms
          </a>

          <a
            href="/privacy"
            className="hover:text-gray-900 dark:hover:text-white transition-colors whitespace-nowrap"
          >
            Privacy
          </a>
        </nav>

        {/* ACTIONS */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

          <a
            href="/app"
            className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-md sm:shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 active:scale-95 transition-all whitespace-nowrap"
          >
            Dashboard
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

          {/* MOBILE MENU */}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer"
            aria-label="Open menu"
            aria-expanded={open}
          >
            {open ? '✕' : '☰'}
          </button>

        </div>
      </div>

      {/* MOBILE NAV */}
      {open && (
        <div className="md:hidden w-full border-t border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a]">
          <nav className="w-full max-w-[1280px] mx-auto px-6 py-4 flex flex-col gap-1 text-sm font-medium">

            <a
              href="/#features"
              onClick={() => setOpen(false)}
              className="py-3"
            >
              Features
            </a>

            <a
              href="/tools"
              onClick={() => setOpen(false)}
              className="py-3"
            >
              Tools
            </a>

            <a
              href="/pricing"
              onClick={() => setOpen(false)}
              className="py-3 font-semibold text-indigo-600 dark:text-indigo-400"
            >
              Pricing ⚡
            </a>

            <a
              href="/#about"
              onClick={() => setOpen(false)}
              className="py-3"
            >
              About
            </a>

            <a
              href="/terms"
              onClick={() => setOpen(false)}
              className="py-3"
            >
              Terms
            </a>

            <a
              href="/privacy"
              onClick={() => setOpen(false)}
              className="py-3"
            >
              Privacy
            </a>

            <a
              href="/app"
              onClick={() => setOpen(false)}
              className="py-3"
            >
              Dashboard
            </a>

          </nav>
        </div>
      )}
    </header>
  );
}