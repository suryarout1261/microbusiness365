import { useEffect, useState, useMemo } from 'react';
import { db, type Customer } from '../../lib/db';
import { sanitizeName, sanitizePhone, isValidPhone, isValidEmail, sanitizeGSTIN, blockNegativeKey } from '../../lib/utils';

export default function CustomerManager() {
  const [items, setItems] = useState<Customer[]>([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>>({
    name: '', phone: '', email: '', address: '', gstin: '', notes: '', openingBalance: '', creditLimit: '',
  });

  const load = async () => {
    try {
      const all = await db.customers.toArray();
      setItems(all.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return items;
    return items.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.gstin || '').toLowerCase().includes(q)
    );
  }, [items, filter]);

  async function save() {
    if (!form.name || !form.name.trim()) {
      alert("Name is required.");
      return;
    }
    if (form.phone && !isValidPhone(form.phone)) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }
    if (form.email && !isValidEmail(form.email)) {
      alert("Please enter a valid email address (e.g. name@example.com).");
      return;
    }
    const now = new Date().toISOString();
    const payload = {
      ...form,
      name: form.name.trim(),
      phone: form.phone?.trim() || '',
      email: form.email?.trim() || '',
      gstin: form.gstin?.trim().toUpperCase() || '',
      openingBalance: form.openingBalance === '' ? 0 : Math.max(0, Number(form.openingBalance) || 0),
      creditLimit: form.creditLimit === '' ? 0 : Math.max(0, Number(form.creditLimit) || 0),
    };
    if (editing) {
      await db.customers.update(editing.id, { ...payload, updatedAt: now } as Partial<Customer>);
    } else {
      await db.customers.add({ id: crypto.randomUUID(), ...payload, createdAt: now, updatedAt: now } as Customer);
    }
    setForm({ name: '', phone: '', email: '', address: '', gstin: '', notes: '', openingBalance: '', creditLimit: '' });
    setEditing(null);
    setOpenAdd(false);
    load();
  }

  async function del(id: string) {
    if (!window.confirm('Delete this customer? Associated sales will also be deleted.')) return;
    await db.customers.delete(id);
    await db.sales.where('customerId').equals(id).delete();
    await db.payments.where({ customerId: id, direction: 'in' }).delete();
    load();
  }

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-between">
        <div className="flex-1 relative">
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Search customers by name, phone, email, GSTIN..."
            className="app-input app-search-input pl-11"
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
          </svg>
        </div>
        <button
          onClick={() => {
            setOpenAdd(!openAdd);
            setEditing(null);
            setForm({ name: '', phone: '', email: '', address: '', gstin: '', notes: '', openingBalance: '', creditLimit: '' });
          }}
          className="app-btn-primary"
        >
          {openAdd ? '✕ Close Form' : '+ Add Customer'}
        </button>
      </div>

      {/* Add / Edit Form Card */}
      {(openAdd || editing) && (
        <div className="app-card space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] dark:border-neutral-800 pb-3">
            <h2 className="text-base font-bold text-[var(--color-text-primary)] dark:text-white">
              {editing ? `Edit Customer: ${editing.name}` : 'New Customer'}
            </h2>
            <button
              onClick={() => { setOpenAdd(false); setEditing(null); }}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Name *
              </label>
              <input
                className="app-input"
                placeholder="e.g. John Doe"
                value={form.name ?? ''}
                onChange={(e) => setForm({ ...form, name: sanitizeName(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Phone (10 Digits)
              </label>
              <input
                className="app-input"
                type="tel"
                maxLength={10}
                placeholder="10-digit number"
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: sanitizePhone(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                className="app-input"
                type="email"
                placeholder="name@example.com"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Address
              </label>
              <input
                className="app-input"
                placeholder="Street, City, State"
                value={form.address ?? ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Opening Balance (₹)
              </label>
              <input
                className="app-input"
                placeholder="Opening Balance (₹)"
                type="number"
                min="0"
                step="any"
                onKeyDown={blockNegativeKey}
                value={form.openingBalance === 0 ? '' : form.openingBalance ?? ''}
                onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Credit Limit (₹)
              </label>
              <input
                className="app-input"
                placeholder="Credit Limit (₹)"
                type="number"
                min="0"
                step="any"
                onKeyDown={blockNegativeKey}
                value={form.creditLimit === 0 ? '' : form.creditLimit ?? ''}
                onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                GSTIN / Tax ID
              </label>
              <input
                className="app-input"
                maxLength={15}
                placeholder="22AAAAA0000A1Z5 (15 chars)"
                value={form.gstin ?? ''}
                onChange={(e) => setForm({ ...form, gstin: sanitizeGSTIN(e.target.value) })}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Notes
              </label>
              <textarea className="app-input resize-y min-h-[70px]" placeholder="Customer preferences, payment terms..." rows={2} value={form.notes ?? ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setOpenAdd(false); setEditing(null); }} className="app-btn-secondary">
              Cancel
            </button>
            <button onClick={save} className="app-btn-primary">
              Save Customer
            </button>
          </div>
        </div>
      )}

      {/* Customer List */}
      {loading ? (
        <div className="py-12 text-center text-[var(--color-text-muted)]">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2"></div>
          <p className="text-sm">Loading customers...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="app-card p-10 text-center">
          <p className="text-base font-semibold text-[var(--color-text-primary)] dark:text-white mb-1">
            {items.length === 0 ? 'No customers registered yet' : 'No matching customers'}
          </p>
          <p className="text-sm text-[var(--color-text-muted)] dark:text-neutral-400 mb-4">
            {items.length === 0 ? 'Add your first customer to start tracking sales and balances.' : 'Try adjusting your search query.'}
          </p>
        </div>
      ) : (
        <div className="app-card p-0 overflow-hidden">
          <div className="app-table-container">
            <table className="w-full text-sm min-w-[650px]">
              <thead className="bg-[var(--color-surface-overlay)] dark:bg-neutral-900 text-[var(--color-text-secondary)] dark:text-neutral-400 text-left uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3 whitespace-nowrap">Name</th>
                  <th className="px-5 py-3 whitespace-nowrap">Phone</th>
                  <th className="px-5 py-3 whitespace-nowrap">Email</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Balance</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] dark:divide-neutral-800">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--color-surface-overlay)]/50 transition">
                    <td className="px-5 py-3.5 font-semibold text-[var(--color-text-primary)] dark:text-white whitespace-nowrap">
                      {c.name}
                      {c.gstin && (
                        <span className="block text-[11px] font-mono text-[var(--color-text-muted)] font-normal mt-0.5">
                          GST: {c.gstin}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)] dark:text-neutral-300 whitespace-nowrap">
                      {c.phone || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)] dark:text-neutral-300 whitespace-nowrap">
                      {c.email || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-[var(--color-text-primary)] dark:text-white whitespace-nowrap">
                      ₹{(c.openingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditing(c);
                          setForm({ ...c });
                          setOpenAdd(false);
                        }}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--color-border)] dark:border-neutral-700 hover:bg-[var(--color-surface-overlay)] dark:hover:bg-neutral-800 text-[var(--color-text-secondary)] dark:text-neutral-300 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => del(c.id)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                      >
                        Delete
                      </button>
                    </td>
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
