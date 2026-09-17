export default function LandingFooter() {
  return (
    <footer id="contact" className="w-full bg-[var(--color-surface)] dark:bg-[#0a0a0a] border-t border-[var(--color-border)] text-[var(--color-text-secondary)]">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <h4 className="font-bold text-[var(--color-text-primary)] mb-3">MicroBusiness365</h4>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">Simple business tools for small shops, freelancers, and home businesses. No sign-up, no ads, no hassle.</p>
        </div>
        <div>
          <h4 className="font-semibold text-[var(--color-text-primary)] mb-3">Product</h4>
          <ul className="space-y-1.5 text-sm">
            <li><a href="/app" className="hover:text-[var(--color-text-primary)]">Dashboard</a></li>
            <li><a href="/customers" className="hover:text-[var(--color-text-primary)]">Customers</a></li>
            <li><a href="/inventory" className="hover:text-[var(--color-text-primary)]">Inventory</a></li>
            <li><a href="/sales" className="hover:text-[var(--color-text-primary)]">Sales</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-[var(--color-text-primary)] mb-3">Resources</h4>
          <ul className="space-y-1.5 text-sm">
            <li><a href="/blogs" className="hover:text-[var(--color-text-primary)]">Blogs</a></li>
            <li><a href="#tools" className="hover:text-[var(--color-text-primary)]">Free tools</a></li>
            <li><a href="#about" className="hover:text-[var(--color-text-primary)]">About</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-[var(--color-text-primary)] mb-3">Legal</h4>
          <ul className="space-y-1.5 text-sm">
            <li><a href="/terms" className="hover:text-[var(--color-text-primary)]">Terms</a></li>
            <li><a href="/privacy" className="hover:text-[var(--color-text-primary)]">Privacy</a></li>
            <li><a href="/contact" className="hover:text-[var(--color-text-primary)]">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-5 border-t border-[var(--color-border)] flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
        <span>© {new Date().getFullYear()} MicroBusiness365. Built for small businesses.</span>
        <span>Local-first • Ad-free • No sign-in required</span>
      </div>
    </footer>
  );
}
