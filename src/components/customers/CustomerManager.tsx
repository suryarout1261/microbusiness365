import { useEffect, useState, useMemo } from 'react';
import { db, type Customer } from '../../lib/db';
import { generateId } from '../../lib/utils';

export default function CustomerManager() {
  const [items, setItems] = useState<Customer[]>([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState<Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>>({
    name: '', phone: '', email: '', address: '', gstin: '', notes: '', openingBalance: '', creditLimit: '',
  });

  const load = async () => {
    const all = await db.customers.toArray();
    setItems(all.sort((a, b) => a.name.localeCompare(b.name)));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return items.filter((c) => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').includes(q));
  }, [items, filter]);

  async function save() {
    if (!form.name || !form.name.trim()) { alert("Name is required"); return; }
    const now = new Date().toISOString();
    const payload = {
      ...form,
      openingBalance: form.openingBalance === '' ? 0 : Number(form.openingBalance) || 0,
      creditLimit: form.creditLimit === '' ? 0 : Number(form.creditLimit) || 0,
    };
    if (editing) {
      await db.customers.update(editing.id, { ...payload, updatedAt: now } as Partial<Customer>);
    } else {
      await db.customers.add({ id: crypto.randomUUID(), ...payload, createdAt: now, updatedAt: now } as Customer);
    }
    setForm({ name: '', phone: '', email: '', address: '', gstin: '', notes: '', openingBalance: '', creditLimit: '' });
    setEditing(null); setOpenAdd(false); load();
  }

  async function del(id: string) {
    if (!window.confirm('Delete this customer?')) return;
    await db.customers.delete(id);
    await db.sales.where('customerId').equals(id).delete();
    await db.payments.where({ customerId: id, direction: 'in' }).delete();
    load();
  }

  const inputClass = 'w-full h-12 rounded-xl bg-[var(--color-surface-raised)] dark:bg-[#1a1a1a] border-2 border-[var(--color-border)] dark:border-neutral-700 px-4 py-3 text-[15px] leading-none text-[var(--color-text-primary)] dark:text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-neutral-400 dark:hover:border-neutral-500 transition';
  const btnPrimary = 'px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:brightness-110 transition shadow-lg shadow-indigo-500/20 whitespace-nowrap';
  const btnSecondary = 'px-5 py-3 rounded-xl border-2 border-[var(--color-border)] dark:border-neutral-700 text-[var(--color-text-secondary)] dark:text-neutral-300 text-sm font-medium hover:bg-[var(--color-surface-overlay)] dark:hover:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-500 transition';

  return (
    <div className="customer-section space-y-8 max-w-5xl mx-auto p-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] dark:text-white">Customers</h1>
        <p className="text-base md:text-lg text-[var(--color-text-secondary)] dark:text-neutral-400 mt-2">Manage clients, balances, and contacts.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch">
        <div className="flex-1 relative">
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Search by name, phone, email..."
            className={inputClass + ' pl-11'}
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" /></svg>
        </div>
        <button onClick={() => { setOpenAdd(true); setEditing(null); setForm({ name: '', phone: '', email: '', address: '', gstin: '', notes: '', openingBalance: '', creditLimit: '' }); }} className={btnPrimary}>
          + Add customer
        </button>
      </div>

      {/* Visible input section (always shown like inventory) */}
      <div className="rounded-2xl border-2 border-[var(--color-border)] dark:border-neutral-700 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-6 shadow-md space-y-3">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] dark:text-white">Add customer</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input className={inputClass} placeholder="Name *" value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className={inputClass} placeholder="Phone" value={form.phone ?? ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <input className={inputClass} placeholder="Email" value={form.email ?? ''} onChange={e => setForm({ ...form, email: e.target.value })} />
          <input className={inputClass} placeholder="Address" value={form.address ?? ''} onChange={e => setForm({ ...form, address: e.target.value })} />
          <input className={inputClass + ' appearance-none'} placeholder="Opening balance" type="number" value={form.openingBalance ?? ''} onChange={e => setForm({ ...form, openingBalance: e.target.value })} />
          <input className={inputClass + ' appearance-none'} placeholder="Credit limit" type="number" value={form.creditLimit ?? ''} onChange={e => setForm({ ...form, creditLimit: e.target.value })} />
          <input className={inputClass} placeholder="GSTIN" value={form.gstin ?? ''} onChange={e => setForm({ ...form, gstin: e.target.value })} />
          <textarea className={inputClass + ' resize-y min-h-[80px] sm:col-span-2 lg:col-span-3'} placeholder="Notes" rows={2} value={form.notes ?? ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={save} className={btnPrimary}>Save customer</button>
          <button onClick={() => setForm({ name: '', phone: '', email: '', address: '', gstin: '', notes: '', openingBalance: '', creditLimit: '' })} className={btnSecondary}>Clear</button>
        </div>
      </div>

      {(openAdd || editing) && (
        <div className="rounded-2xl border-2 border-[var(--color-border)] dark:border-neutral-700 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-6 shadow-md space-y-4">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] dark:text-white">{editing ? 'Edit customer' : 'New customer'}</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <input className={inputClass} placeholder="Name *" value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className={inputClass} placeholder="Phone" value={form.phone ?? ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input className={inputClass} placeholder="Email" value={form.email ?? ''} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <input className={inputClass} placeholder="Address" value={form.address ?? ''} onChange={e => setForm({ ...form, address: e.target.value })} />
            <input className={inputClass + ' appearance-none'} placeholder="Opening balance" type="number" value={form.openingBalance ?? ''} onChange={e => setForm({ ...form, openingBalance: e.target.value })} />
            <input className={inputClass + ' appearance-none'} placeholder="Credit limit" type="number" value={form.creditLimit ?? ''} onChange={e => setForm({ ...form, creditLimit: e.target.value })} />
          </div>
          <input className={inputClass} placeholder="GSTIN" value={form.gstin ?? ''} onChange={e => setForm({ ...form, gstin: e.target.value })} />
          <textarea className={inputClass + ' resize-y min-h-[100px]'} placeholder="Notes" rows={2} value={form.notes ?? ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-3 pt-1">
            <button onClick={save} className={btnPrimary}>Save</button>
            <button onClick={() => { setOpenAdd(false); setEditing(null); }} className={btnSecondary}>Cancel</button>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="rounded-2xl border-2 border-[var(--color-border)] dark:border-neutral-700 bg-[var(--color-surface-raised)] dark:bg-[#111111] shadow-md overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface-overlay)] dark:bg-neutral-900 text-[var(--color-text-secondary)] dark:text-neutral-400 text-left uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5 text-right">Balance</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] dark:divide-neutral-800">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--color-surface-overlay)] dark:hover:bg-neutral-900/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-[var(--color-text-primary)] dark:text-white text-base">{c.name}</div>
                      <div className="text-xs text-[var(--color-text-muted)] dark:text-neutral-500 mt-0.5">{c.address || '—'}</div>
                      {c.gstin && <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 font-medium">GSTIN: {c.gstin}</div>}
                    </td>
                    <td className="px-5 py-4 text-[var(--color-text-secondary)] dark:text-neutral-300">{c.phone || '—'}</td>
                    <td className="px-5 py-4 text-[var(--color-text-secondary)] dark:text-neutral-300">{c.email || '—'}</td>
                    <td className="px-5 py-4 text-right font-bold text-[var(--color-text-primary)] dark:text-white">₹{(c.openingBalance ?? 0).toFixed(2)}</td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <button onClick={() => { setEditing(c); setForm({ ...c, openingBalance: c.openingBalance === 0 ? '' : String(c.openingBalance), creditLimit: c.creditLimit === 0 ? '' : String(c.creditLimit ?? '') }); setOpenAdd(false); }} className="text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:text-indigo-800 dark:hover:text-indigo-300">Edit</button>
                      <button onClick={() => del(c.id)} className="text-red-500 dark:text-red-400 text-xs font-bold hover:text-red-700 dark:hover:text-red-300">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-[var(--color-border)] dark:divide-neutral-800">
            {filtered.map((c) => (
              <div key={c.id} className="p-5 hover:bg-[var(--color-surface-overlay)] dark:hover:bg-neutral-900/60 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-[var(--color-text-primary)] dark:text-white truncate">{c.name}</h3>
                    <p className="text-xs text-[var(--color-text-muted)] dark:text-neutral-500 mt-0.5">{c.phone || 'No phone'} · {c.email || 'No email'}</p>
                    <p className="text-sm text-[var(--color-text-secondary)] dark:text-neutral-300 mt-1">Balance: <span className="font-bold text-[var(--color-text-primary)] dark:text-white">₹{(c.openingBalance ?? 0).toFixed(2)}</span></p>
                    {c.address && <p className="text-xs text-[var(--color-text-muted)] dark:text-neutral-500 mt-0.5 truncate">{c.address}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setEditing(c); setForm({ ...c, openingBalance: c.openingBalance === 0 ? '' : String(c.openingBalance), creditLimit: c.creditLimit === 0 ? '' : String(c.creditLimit ?? '') }); setOpenAdd(false); }} className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold">Edit</button>
                    <button onClick={() => del(c.id)} className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-xs font-bold">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && !openAdd && (
        <div className="rounded-2xl border-2 border-[var(--color-border)] dark:border-neutral-700 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-10 text-center shadow-md">
          <h3 className="text-xl font-bold text-[var(--color-text-primary)] dark:text-white mb-3">No customers yet</h3>
          <p className="text-[var(--color-text-secondary)] dark:text-neutral-400">Add your first customer to start managing contacts and balances.</p>
          <button onClick={() => { setOpenAdd(true); setEditing(null); setForm({ name: '', phone: '', email: '', address: '', gstin: '', notes: '', openingBalance: '', creditLimit: '' }); }} className={btnPrimary + ' mt-6'}>
            + Add customer
          </button>
        </div>
      )}

      <div className="pt-4 border-t-2 border-[var(--color-border)] dark:border-neutral-700 flex items-center justify-between text-sm text-[var(--color-text-muted)] dark:text-neutral-500">
        <span>Customer records secured.</span>
        <span className="font-medium">{filtered.length} contact{filtered.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
