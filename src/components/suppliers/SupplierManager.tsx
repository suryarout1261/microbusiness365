import { useEffect, useState, useMemo } from 'react';
import { db, type Supplier, type Category, recalcSupplierBalance } from '../../lib/db';
import { sanitizeName, sanitizePhone, isValidPhone, isValidEmail, sanitizeGSTIN, blockNegativeKey } from '../../lib/utils';

export default function SupplierManager() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    notes: '',
    openingBalance: '' as any,
    creditLimit: '' as any,
    supplyTypes: [],
  });
  const [quickName, setQuickName] = useState('');

  const load = async () => {
    try {
      const [allSuppliers, allCategories] = await Promise.all([
        db.suppliers.toArray(),
        db.categories.toArray(),
      ]);
      setItems(allSuppliers.sort((a, b) => a.name.localeCompare(b.name)));
      const productCategories = allCategories.filter(c => c.type === 'product' || !c.type);
      setCategories(productCategories.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.gstin || '').toLowerCase().includes(q)
    );
  }, [items, filter]);

  const categoryMap = useMemo(() => {
    return new Map(categories.map(cat => [cat.id, cat.name]));
  }, [categories]);

  async function save() {
    if (!form.name || !form.name.trim()) {
      alert('Supplier name is required.');
      return;
    }
    if (form.phone && !isValidPhone(form.phone)) {
      alert('Phone number must be exactly 10 digits.');
      return;
    }
    if (form.email && !isValidEmail(form.email)) {
      alert('Please enter a valid email address (e.g. vendor@example.com).');
      return;
    }
    const now = new Date().toISOString();
    const payload = {
      ...form,
      name: form.name.trim(),
      phone: form.phone?.trim() || '',
      email: form.email?.trim() || '',
      gstin: form.gstin?.trim().toUpperCase() || '',
      openingBalance: Math.max(0, Number(form.openingBalance) || 0),
      creditLimit: Math.max(0, Number(form.creditLimit) || 0),
      supplyTypes: form.supplyTypes || [],
    };

    if (editing) {
      await db.suppliers.update(editing.id, { ...payload, updatedAt: now } as Partial<Supplier>);
      await recalcSupplierBalance(editing.id);
    } else {
      const newId = crypto.randomUUID();
      await db.suppliers.add({
        id: newId,
        ...payload,
        createdAt: now,
        updatedAt: now,
      } as Supplier);
      await recalcSupplierBalance(newId);
    }

    setForm({
      name: '',
      phone: '',
      email: '',
      address: '',
      gstin: '',
      notes: '',
      openingBalance: '' as any,
      creditLimit: '' as any,
      supplyTypes: [],
    });
    setEditing(null);
    setOpenAdd(false);
    load();
  }

  async function del(id: string) {
    if (!window.confirm('Are you sure you want to delete this supplier? Associated purchases will also be deleted.')) return;
    await db.suppliers.delete(id);
    await db.purchases.where('supplierId').equals(id).delete();
    await db.payments.where({ supplierId: id, direction: 'out' }).delete();
    load();
  }

  async function quickAdd() {
    if (!quickName.trim()) {
      alert('Supplier name is required.');
      return;
    }
    const now = new Date().toISOString();
    const newId = crypto.randomUUID();
    await db.suppliers.add({
      id: newId,
      name: quickName.trim(),
      phone: '',
      email: '',
      address: '',
      gstin: '',
      notes: '',
      openingBalance: 0,
      creditLimit: 0,
      supplyTypes: [],
      createdAt: now,
      updatedAt: now,
    });
    setQuickName('');
    load();
  }

  const inputClass = 'app-input';
  const btnPrimary = 'app-btn-primary';
  const btnSecondary = 'app-btn-secondary';

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-between">
        <div className="flex-1 relative">
          <input
            className="app-input app-search-input pl-11"
            placeholder="Search suppliers by name, phone, email, GSTIN..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
          </svg>
        </div>
        <button
          onClick={() => {
            setOpenAdd(true);
            setEditing(null);
            setForm({
              name: '',
              phone: '',
              email: '',
              address: '',
              gstin: '',
              notes: '',
              openingBalance: '' as any,
              creditLimit: '' as any,
              supplyTypes: [],
            });
          }}
          className={btnPrimary}
        >
          + Add Supplier
        </button>
      </div>

      {/* Quick Add Bar */}
      <div className="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-4 flex flex-col sm:flex-row items-center gap-3 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] whitespace-nowrap">
          Quick Add:
        </span>
        <input
          className={inputClass}
          placeholder="Type vendor name and press Add..."
          value={quickName}
          onChange={e => setQuickName(sanitizeName(e.target.value))}
          onKeyDown={e => { if (e.key === 'Enter') quickAdd(); }}
        />
        <button onClick={quickAdd} className={btnPrimary}>
          Add
        </button>
      </div>

      {/* Add / Edit Form Modal / Card */}
      {(openAdd || editing) && (
        <div className="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#121212] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] dark:border-neutral-800 pb-3">
            <h2 className="font-bold text-lg text-[var(--color-text-primary)] dark:text-white">
              {editing ? `Edit Supplier: ${editing.name}` : 'New Supplier'}
            </h2>
            <button
              onClick={() => { setOpenAdd(false); setEditing(null); }}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Supplier Name *
              </label>
              <input
                className={inputClass}
                placeholder="e.g. Acme Supplies Ltd"
                value={form.name ?? ''}
                onChange={(e) => setForm({ ...form, name: sanitizeName(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Phone Number (10 Digits)
              </label>
              <input
                className={inputClass}
                type="tel"
                maxLength={10}
                placeholder="10-digit number"
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: sanitizePhone(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                className={inputClass}
                type="email"
                placeholder="vendor@example.com"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                GSTIN / Tax ID
              </label>
              <input
                className={inputClass}
                maxLength={15}
                placeholder="22AAAAA0000A1Z5 (15 chars)"
                value={form.gstin ?? ''}
                onChange={(e) => setForm({ ...form, gstin: sanitizeGSTIN(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
              Types of Supplies (Categories)
            </label>
            {categories.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {categories.map(cat => {
                  const selected = (form.supplyTypes || []).includes(cat.id);
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => {
                        const current = form.supplyTypes || [];
                        const next = selected ? current.filter(id => id !== cat.id) : [...current, cat.id];
                        setForm({ ...form, supplyTypes: next });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        selected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-[var(--color-surface-overlay)] dark:bg-neutral-800 text-[var(--color-text-secondary)] dark:text-neutral-300 border-[var(--color-border)] dark:border-neutral-700 hover:border-indigo-400'
                      }`}
                    >
                      {cat.name} {selected ? '✓' : '+'}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)] italic">No product categories defined yet. Add categories in Settings/Inventory.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
              Address
            </label>
            <input
              className={inputClass}
              placeholder="e.g. 12 Industrial Area, Phase 2, Mumbai"
              value={form.address ?? ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Opening Balance (₹)
              </label>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="any"
                onKeyDown={blockNegativeKey}
                placeholder="Opening Balance (₹)"
                value={form.openingBalance === 0 ? '' : form.openingBalance ?? ''}
                onChange={(e) => setForm({ ...form, openingBalance: e.target.value === '' ? '' as any : Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Credit Limit (₹)
              </label>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="any"
                onKeyDown={blockNegativeKey}
                placeholder="Credit Limit (₹)"
                value={form.creditLimit === 0 ? '' : form.creditLimit ?? ''}
                onChange={(e) => setForm({ ...form, creditLimit: e.target.value === '' ? '' as any : Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
              Notes
            </label>
            <textarea
              className={inputClass + ' resize-y min-h-[70px]'}
              placeholder="Payment terms, delivery schedules, representative contact..."
              rows={2}
              value={form.notes ?? ''}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setOpenAdd(false); setEditing(null); }} className={btnSecondary}>
              Cancel
            </button>
            <button onClick={save} className={btnPrimary}>
              Save Supplier
            </button>
          </div>
        </div>
      )}

      {/* Supplier List */}
      {loading ? (
        <div className="py-12 text-center text-[var(--color-text-muted)]">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2"></div>
          <p className="text-sm">Loading suppliers...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-10 text-center">
          <p className="text-base font-semibold text-[var(--color-text-primary)] dark:text-white mb-1">
            {items.length === 0 ? 'No suppliers registered yet' : 'No matching suppliers'}
          </p>
          <p className="text-sm text-[var(--color-text-muted)] dark:text-neutral-400 mb-4">
            {items.length === 0
              ? 'Add your first supplier above to organize purchase orders and inventory deliveries.'
              : 'Try searching with a different name, phone, or email.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-5 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)] dark:text-white">
                      {s.name}
                    </h3>
                    {s.gstin && (
                      <span className="inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[var(--color-text-muted)] dark:text-neutral-400 mt-1">
                        GST: {s.gstin}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setEditing(s);
                        setForm({ ...s });
                        setOpenAdd(false);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--color-border)] dark:border-neutral-700 hover:bg-[var(--color-surface-overlay)] dark:hover:bg-neutral-800 text-[var(--color-text-secondary)] dark:text-neutral-300 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => del(s.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-sm text-[var(--color-text-secondary)] dark:text-neutral-300">
                  {s.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--color-text-muted)] text-xs">📞</span>
                      <span>{s.phone}</span>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--color-text-muted)] text-xs">✉️</span>
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--color-text-muted)] text-xs">📍</span>
                      <span className="text-xs text-[var(--color-text-muted)] line-clamp-1">{s.address}</span>
                    </div>
                  )}
                </div>

                {s.supplyTypes && s.supplyTypes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.supplyTypes.map((typeId) => {
                      const catName = categoryMap.get(typeId);
                      return catName ? (
                        <span
                          key={typeId}
                          className="px-2.5 py-0.5 text-xs rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/30"
                        >
                          {catName}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {(s.openingBalance || s.creditLimit) ? (
                <div className="mt-4 pt-3 border-t border-[var(--color-border)] dark:border-neutral-800/80 flex items-center justify-between text-xs">
                  {s.openingBalance ? (
                    <span className="text-[var(--color-text-muted)]">
                      Opening: <strong className="text-[var(--color-text-primary)] dark:text-neutral-200 font-medium">₹{s.openingBalance.toLocaleString()}</strong>
                    </span>
                  ) : <span />}
                  {s.creditLimit ? (
                    <span className="text-[var(--color-text-muted)]">
                      Credit Limit: <strong className="text-[var(--color-text-primary)] dark:text-neutral-200 font-medium">₹{s.creditLimit.toLocaleString()}</strong>
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
