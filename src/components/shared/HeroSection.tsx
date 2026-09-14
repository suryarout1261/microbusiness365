import SearchBar from './SearchBar';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0f0f12] via-[#12121a] to-[#0a0a0a] dark:from-[#0f0f12] dark:via-[#12121a] dark:to-[#0a0a0a]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
      <div className="mx-auto max-w-6xl px-6 pt-24 pb-16 md:pt-36 md:pb-24 text-center relative">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
          Simple tools for <br />
          <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">small businesses.</span>
        </h1>
        <p className="text-lg md:text-xl text-neutral-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Manage sales, inventory, customers, expenses and invoices — <strong className="text-white font-medium">with no sign in, no ads, no hassle.</strong> Your data stays on this device.
        </p>
        <SearchBar />
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-neutral-500">
          <span>✓ No account needed</span>
          <span>✓ Works offline</span>
          <span>✓ Free forever</span>
        </div>
      </div>
    </section>
  );
}
