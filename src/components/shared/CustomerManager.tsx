import { useEffect, useState } from 'react';
import { db, type Customer } from '../../lib/db';
import { generateId, sanitizeName, sanitizePhone, isValidPhone, isValidEmail } from '../../lib/utils';

export default function CustomerManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });

  useEffect(() => {
    db.customers.toArray().then((all) => { setCustomers(all); setLoading(false); });
  }, []);

  async function addCustomer() {
    if (!form.name.trim()) {
      alert('Please enter a customer name.');
      return;
    }
    if (form.phone && !isValidPhone(form.phone)) {
      alert('Phone number must be exactly 10 digits.');
      return;
    }
    if (form.email && !isValidEmail(form.email)) {
      alert('Please enter a valid email address.');
      return;
    }
    const now = new Date().toISOString();
    const c: Customer = { id: generateId(), name: form.name.trim(), phone: form.phone, email: form.email, address: form.address, openingBalance: 0, createdAt: now, updatedAt: now };
    await db.customers.put(c);
    setCustomers([c, ...customers]);
    setForm({ name: '', phone: '', email: '', address: '' });
  }

  async function removeCustomer(id: string) {
    await db.customers.delete(id);
    setCustomers(customers.filter((c) => c.id !== id));
  }

  const filtered = customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers…" className="flex-1 bg-[var(--color-surface-overlay)] dark:bg-neutral-900 border border-[var(--color-border)] dark:border-neutral-800 rounded-[6px] px-3 py-2 text-sm text-[var(--color-text-primary)] dark:text-white placeholder:text-[var(--color-text-muted)] dark:text-neutral-500 focus:outline-none focus:border-neutral-600" />
      </div>
      <div className="flex flex-col md:flex-row gap-3">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: sanitizeName(e.target.value) })} placeholder="Full name *" className="flex-1 bg-[var(--color-surface-overlay)] dark:bg-neutral-900 border border-[var(--color-border)] dark:border-neutral-800 rounded-[6px] px-3 py-2 text-sm" />
        <input value={form.phone} maxLength={10} onChange={(e) => setForm({ ...form, phone: sanitizePhone(e.target.value) })} placeholder="10-digit Phone" className="flex-1 bg-[var(--color-surface-overlay)] dark:bg-neutral-900 border border-[var(--color-border)] dark:border-neutral-800 rounded-[6px] px-3 py-2 text-sm" />
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" className="flex-1 bg-[var(--color-surface-overlay)] dark:bg-neutral-900 border border-[var(--color-border)] dark:border-neutral-800 rounded-[6px] px-3 py-2 text-sm" />
        <button onClick={addCustomer} className="px-4 py-2 bg-white text-black rounded-[6px] text-sm font-medium hover:bg-neutral-200">+ Add customer</button>
      </div>
      {loading ? (
        <p className="text-[var(--color-text-muted)] dark:text-neutral-500 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-neutral-950 p-8 text-center text-[var(--color-text-muted)] dark:text-neutral-500">
          <h3 className="text-lg font-medium text-[var(--color-text-primary)] dark:text-neutral-300 mb-2">No customers yet</h3>
          <p className="text-sm">Add your first customer to start tracking sales and payments.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] dark:border-neutral-800 overflow-hidden">
          <div className="app-table-container">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-[var(--color-surface-overlay)] dark:bg-neutral-900 text-[var(--color-text-secondary)] dark:text-neutral-400 text-left">
                <tr><th className="px-4 py-2 font-medium whitespace-nowrap">Name</th><th className="px-4 py-2 font-medium whitespace-nowrap">Phone</th><th className="px-4 py-2 font-medium whitespace-nowrap">Email</th><th className="px-4 py-2 text-right font-medium whitespace-nowrap">Balance</th><th className="px-4 py-2 whitespace-nowrap"></th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 text-[var(--color-text-primary)] dark:text-white whitespace-nowrap">{c.name}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)] dark:text-neutral-400 whitespace-nowrap">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)] dark:text-neutral-400 whitespace-nowrap">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-right text-neutral-200 whitespace-nowrap">₹{c.openingBalance.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap"><button onClick={() => removeCustomer(c.id)} className="text-[var(--color-text-muted)] dark:text-neutral-500 hover:text-red-400 text-xs">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
