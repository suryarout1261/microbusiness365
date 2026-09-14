import { useEffect, useState, useMemo } from 'react';
import { db, type Customer } from '../../lib/db';

export default function CustomerManager() {
  const [items, setItems] = useState<Customer[]>([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState<Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>>({
    name: '', phone: '', email: '', address: '', gstin: '', notes: '', openingBalance: 0, creditLimit: 0,
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
    const now = new Date().toISOString();
    if (editing) {
      await db.customers.update(editing.id, { ...form, updatedAt: now } as Partial<Customer>);
    } else {
      await db.customers.add({ id: crypto.randomUUID(), ...form, openingBalance: Number(form.openingBalance ?? 0), createdAt: now, updatedAt: now } as Customer);
    }
    setForm({ name: '', phone: '', email: '', address: '', gstin: '', notes: '', openingBalance: 0, creditLimit: 0 });
    setEditing(null); setOpenAdd(false); load();
  }

  async function del(id: string) {
    if (!window.confirm('Delete this customer?')) return;
    await db.customers.delete(id);
    await db.sales.where('customerId').equals(id).delete();
    await db.payments.where({ customerId: id, direction: 'in' }).delete();
    load();
  }

  const inputClass = 'w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40';

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-sm text-neutral-400">Manage clients and balances.</p>
        </div>
        <button onClick={() => { setOpenAdd(true); setEditing(null); setForm({ name: '', phone: '', email: '', address: '', gstin: '', notes: '', openingBalance: 0, creditLimit: 0 }); }} className="px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold">Add customer</button>
      </div>

      <div className="mb-4">
        <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search by name, phone, email..." className={inputClass + ' max-w-md'} />
      </div>

      {(openAdd || editing) && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 mb-6 space-y-3">
          <h2 className="font-semibold text-white">{editing ? 'Edit' : 'New customer'}</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <input className={inputClass} placeholder="Name *" value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className={inputClass} placeholder="Phone" value={form.phone ?? ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input className={inputClass} placeholder="Email" value={form.email ?? ''} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input className={inputClass} placeholder="GSTIN" value={form.gstin ?? ''} onChange={e => setForm({ ...form, gstin: e.target.value })} />
          </div>
          <input className={inputClass} placeholder="Address" value={form.address ?? ''} onChange={e => setForm({ ...form, address: e.target.value })} />
          <div className="grid md:grid-cols-2 gap-3">
            <input className={inputClass} placeholder="Opening balance" type="number" value={form.openingBalance ?? 0} onChange={e => setForm({ ...form, openingBalance: Number(e.target.value) })} />
            <input className={inputClass} placeholder="Credit limit" type="number" value={form.creditLimit ?? 0} onChange={e => setForm({ ...form, creditLimit: Number(e.target.value) })} />
          </div>
          <textarea className={inputClass} placeholder="Notes" rows={2} value={form.notes ?? ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-3">
            <button onClick={save} className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold">Save</button>
            <button onClick={() => { setOpenAdd(false); setEditing(null); }} className="px-4 py-2 rounded-lg border border-neutral-700 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map((c) => (
          <div key={c.id} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 hover:border-neutral-700 transition">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{c.name}</h3>
                <div className="text-sm text-neutral-400 mt-1">Phone: {c.phone || '-'} · Email: {c.email || '-'}</div>
                <div className="text-xs text-neutral-500 mt-1">{c.address || ''}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(c); setForm({ ...c }); setOpenAdd(false); }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 text-white hover:bg-neutral-700">Edit</button>
                <button onClick={() => del(c.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-900/40 text-red-300 hover:bg-red-900/60">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-neutral-400 mt-6">No customers match.</p>}
    </div>
  );
}
