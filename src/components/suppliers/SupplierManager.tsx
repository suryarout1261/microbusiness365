import { useEffect, useState, useMemo } from 'react';
import { db, type Supplier, type Category } from '../../lib/db';

export default function SupplierManager() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState<Partial<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>>>({
    name: '', phone: '', email: '', address: '', gstin: '', notes: '', openingBalance: 0, creditLimit: 0, supplyTypes: [],
  }));
  const [quickName, setQuickName] = useState('');

  const load = async () => {
    const [allSuppliers, allCategories] = await Promise.all([
      db.suppliers.toArray(),
      db.categories.where('type').equals('product').toArray()
    ]);
    setItems(allSuppliers.sort((a, b) => a.name.localeCompare(b.name)));
    setCategories(allCategories.sort((a, b) => a.name.localeCompare(b.name)));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return items.filter((s) => s.name.toLowerCase().includes(q) || (s.phone || '').includes(q) || (s.email || '').includes(q));
  }, [items, filter]);

  // Create a map for quick category name lookup
  const categoryMap = useMemo(() => {
    return new Map(categories.map(cat => [cat.id, cat.name]));
  }, [categories]);

  async function save() {
    const now = new Date().toISOString();
    if (editing) {
      await db.suppliers.update(editing.id, { ...form, updatedAt: now } as Partial<Supplier>);
    } else {
      await db.suppliers.add({ id: crypto.randomUUID(), ...form, openingBalance: Number(form.openingBalance ?? 0), createdAt: now, updatedAt: now } as Supplier);
    }
    setForm({ name: '', phone: '', email: '', address: '', gstin: '', notes: '', openingBalance: 0, creditLimit: 0, supplyTypes: [] });
    setEditing(null); setOpenAdd(false); load();
  }

  async function del(id: string) {
    if (!window.confirm('Delete supplier?')) return;
    await db.suppliers.delete(id);
    await db.purchases.where('supplierId').equals(id).delete();
    await db.payments.where({ supplierId: id, direction: 'out' }).delete();
    load();
  }

  const inputClass = 'w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40';

  async function quickAdd() {
    if (!quickName.trim()) {
      alert('Supplier name is required.');
      return;
    }
    await db.suppliers.add({ id: crypto.randomUUID(), name: quickName.trim(), phone: '', email: '', address: '', gstin: '', notes: '', openingBalance: 0, creditLimit: 0, supplyTypes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setQuickName('');
    load();
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-[var(--color-text-primary)] dark:text-white">Suppliers</h1>
          <p className="text-base text-[var(--color-text-secondary)] dark:text-neutral-400 leading-relaxed">Manage vendors, balances, and contacts.</p>
        </div>
        <button onClick={() => { setOpenAdd(true); setEditing(null); setForm({ name: '', phone: '', email: '', address: '', gstin: '', notes: '', openingBalance: 0, creditLimit: 0 }); }} className="px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold">Add supplier</button>
      </div>

      <div className="mb-4 flex gap-2">
        <input className={inputClass} placeholder="Supplier name *" value={quickName} onChange={e => setQuickName(e.target.value)} />
        <button onClick={quickAdd} className="px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold">Add</button>
      </div>

      <div className="mb-4">
        <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search by name, phone, email..." className={inputClass + ' max-w-md'} />
      </div>

      {(openAdd || editing) && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 mb-6 space-y-3">
          <h2 className="font-semibold text-white">{editing ? 'Edit' : 'New supplier'}</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <input className={inputClass} placeholder="Name *" value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className={inputClass} placeholder="Phone" value={form.phone ?? ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input className={inputClass} placeholder="Email" value={form.email ?? ''} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input className={inputClass} placeholder="GSTIN" value={form.gstin ?? ''} onChange={e => setForm({ ...form, gstin: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-white mb-1">Types of Supplies</label>
            <select
              multiple
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              value={form.supplyTypes ?? []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map(option => option.value);
                setForm({ ...form, supplyTypes: selected });
              }}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
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
        {filtered.map((s) => (
          <div key={s.id} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 hover:border-neutral-700 transition">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{s.name}</h3>
                <div className="text-sm text-neutral-400 mt-1">Phone: {s.phone || '-'} · Email: {s.email || '-'}</div>
                <div className="text-xs text-neutral-500 mt-1">{s.address || ''}</div>
                {s.supplyTypes && s.supplyTypes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.supplyTypes.map((typeId) => {
                      const categoryName = categoryMap.get(typeId);
                      return categoryName ? (
                        <span key={typeId} className="px-2 py-1 text-xs rounded bg-indigo-600/20 text-indigo-300">
                          {categoryName}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(s); setForm({ ...s }); setOpenAdd(false); }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 text-white hover:bg-neutral-700">Edit</button>
                <button onClick={() => del(s.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-900/40 text-red-300 hover:bg-red-900/60">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-neutral-400 mt-6">No suppliers match.</p>}
    </div>
  );
}
