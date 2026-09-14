export default function LandingFooter() {
  return (
    <footer id="contact" className="w-full bg-[#0a0a0a] border-t border-neutral-800 text-neutral-300">
      <div className="mx-auto max-w-6xl px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <h4 className="font-bold text-white mb-3">MicroBusiness365</h4>
          <p className="text-sm text-neutral-400 leading-relaxed">Simple business tools for small shops, freelancers, and home businesses. No sign-up, no ads, no hassle.</p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3">Product</h4>
          <ul className="space-y-1.5 text-sm">
            <li><a href="/app" className="hover:text-white">Dashboard</a></li>
            <li><a href="/customers" className="hover:text-white">Customers</a></li>
            <li><a href="/inventory" className="hover:text-white">Inventory</a></li>
            <li><a href="/sales" className="hover:text-white">Sales</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3">Resources</h4>
          <ul className="space-y-1.5 text-sm">
            <li><a href="#blogs" className="hover:text-white">Blogs</a></li>
            <li><a href="#tools" className="hover:text-white">Free tools</a></li>
            <li><a href="#about" className="hover:text-white">About</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3">Legal</h4>
          <ul className="space-y-1.5 text-sm">
            <li><a href="#terms" className="hover:text-white">Terms</a></li>
            <li><a href="#privacy" className="hover:text-white">Privacy</a></li>
            <li><a href="#contact" className="hover:text-white">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-5 border-t border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-neutral-500">
        <span>© {new Date().getFullYear()} MicroBusiness365. Built for small businesses.</span>
        <span>Local-first • Ad-free • No sign-in required</span>
      </div>
    </footer>
  );
}
