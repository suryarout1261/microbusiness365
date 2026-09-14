const FEATURES = [
  { icon: '🛒', title: 'Sales', desc: 'Record sales in seconds. Inventory, customer balance and profit update automatically.' },
  { icon: '📦', title: 'Inventory', desc: 'Track stock, get low-stock alerts, and know exactly what your goods are worth.' },
  { icon: '👥', title: 'Customers', desc: 'Keep customers, their balances and contact details in one simple place.' },
  { icon: '💸', title: 'Expenses', desc: 'Categorise spending and see how costs eat into your real earnings.' },
  { icon: '🧾', title: 'Invoices', desc: 'Generate clean, printable invoices with automatic numbering. Print or save as PDF.' },
  { icon: '📊', title: 'Insights', desc: 'A calm dashboard that answers one question: how much did I make?' },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="bg-white dark:bg-[#0a0a0a] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full mb-4">Why MicroBusiness365</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">Everything your business needs, nothing it doesn't</h2>
          <p className="text-gray-500 dark:text-neutral-400 max-w-xl mx-auto">One calm, connected workspace — not a complicated ERP with settings you'll never touch.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/60 p-6 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:-translate-y-0.5 transition-all">
              <div className="w-11 h-11 rounded-xl bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 flex items-center justify-center text-xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 dark:text-neutral-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
