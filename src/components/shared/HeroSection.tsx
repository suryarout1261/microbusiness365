import SearchBar from './SearchBar';

export default function HeroSection() {
  return (
    <section className="relative bg-gradient-to-b from-[#0f0f12] via-[#12121a] to-[#0a0a0a] dark:from-[#0f0f12] dark:via-[#12121a] dark:to-[#0a0a0a] z-20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 pb-16 md:pt-36 md:pb-24 text-center relative z-20">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
          Simple tools for <br />
          <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">small businesses.</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-[var(--color-text-secondary)] dark:text-neutral-300 max-w-2xl mx-auto mb-10 leading-relaxed px-2">
          Manage sales, inventory, customers, expenses and invoices — <strong className="text-white font-medium">with no sign in, no ads, no hassle.</strong> Your data stays on this device.
        </p>
        <SearchBar />
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-[var(--color-text-muted)] dark:text-neutral-500">
          <span>✓ No account needed</span>
          <span>✓ Works offline</span>
          <span>✓ Free forever</span>
        </div>
      </div>
    </section>
  );
}
