import { useEffect, useState } from 'react';
import { db, type Product } from '../../lib/db';
import { generateId } from '../../lib/utils';

const EMPTY = { name: '', type: 'physical' as const, unit: 'pcs', purchasePrice: 0, sellingPrice: 0, taxRate: 0, currentStock: 0, minimumStock: 0, active: true };

export default function InventoryManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof EMPTY & { id?: string }>(EMPTY);

  useEffect(() => {
    db.products.toArray().then((all) => { setProducts(all); setLoading(false); });
  }, []);

  async function save() {
    if (!form.name.trim()) return;
    const now = new Date().toISOString();
    const record: Product = {
      id: form.id || generateId(), name: form.name.trim(), type: form.type, unit: form.unit,
      purchasePrice: Number(form.purchasePrice) || 0, sellingPrice: Number(form.sellingPrice) || 0,
      taxRate: Number(form.taxRate) || 0, currentStock: Number(form.currentStock) || 0,
      minimumStock: Number(form.minimumStock) || 0, active: true, createdAt: now, updatedAt: now,
    };
    await db.products.put(record);
    setProducts(form.id ? products.map((p) => (p.id === form.id ? record : p)) : [record, ...products]);
    setForm(EMPTY);
  }

  function edit(p: Product) {
    setForm({ id: p.id, name: p.name, type: p.type, unit: p.unit, purchasePrice: p.purchasePrice, sellingPrice: p.sellingPrice, taxRate: p.taxRate, currentStock: p.currentStock, minimumStock: p.minimumStock });
  }

  async function remove(id: string) {
    await db.products.delete(id);
    setProducts(products.filter((p) => p.id !== id));
  }

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const lowStock = products.filter((p) => p.type !== 'service' && p.currentStock <= p.minimumStock).length;

  return (
    <div className="space-y-6">
      {lowStock > 0 && (
        <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
          ⚠ {lowStock} product{lowStock > 1 ? 's are' : ' is'} running low.
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="flex-1 bg-neutral-900 border border-neutral-800 rounded-[6px] px-3 py-2 text-sm" />
        <button onClick={save} className="px-4 py-2 bg-white text-black rounded-[6px] text-sm font-medium hover:bg-neutral-200">+ New product</button>
      </div>
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name *" className="col-span-2 bg-neutral-900 border border-neutral-800 rounded-[6px] px-3 py-2 text-sm" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className="bg-neutral-900 border border-neutral-800 rounded-[6px] px-3 py-2 text-sm">
          <option value="physical">Physical</option><option value="service">Service</option>
        </select>
        <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Unit" className="bg-neutral-900 border border-neutral-800 rounded-[6px] px-3 py-2 text-sm" />
        <input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} placeholder="Cost ₹" className="bg-neutral-900 border border-neutral-800 rounded-[6px] px-3 py-2 text-sm" />
        <input type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} placeholder="Sell ₹" className="bg-neutral-900 border border-neutral-800 rounded-[6px] px-3 py-2 text-sm" />
        <input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} placeholder="Tax %" className="bg-neutral-900 border border-neutral-800 rounded-[6px] px-3 py-2 text-sm" />
        <input type="number" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })} placeholder="Stock" className="bg-neutral-900 border border-neutral-800 rounded-[6px] px-3 py-2 text-sm" />
        <input type="number" value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: Number(e.target.value) })} placeholder="Min stock" className="bg-neutral-900 border border-neutral-800 rounded-[6px] px-3 py-2 text-sm" />
      </div>
      {loading ? <p className="text-neutral-500 text-sm">Loading…</p> : filtered.length === 0 ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-8 text-center text-neutral-500">
          <h3 className="text-lg font-medium text-neutral-300">No products yet</h3>
          <p className="text-sm">Add products to manage stock and sales.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-neutral-400 text-left">
              <tr><th className="px-4 py-2 font-medium">Product</th><th className="px-4 py-2 font-medium">Type</th><th className="px-4 py-2 text-right font-medium">Cost</th><th className="px-4 py-2 text-right font-medium">Sell</th><th className="px-4 py-2 text-right font-medium">Stock</th><th className="px-4 py-2"></th></tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filtered.map((p) => {
                const low = p.type !== 'service' && p.currentStock <= p.minimumStock;
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-white">{p.name}</td>
                    <td className="px-4 py-3 text-neutral-400">{p.type}</td>
                    <td className="px-4 py-3 text-right text-neutral-400">₹{p.purchasePrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-neutral-200">₹{p.sellingPrice.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right ${low ? 'text-amber-400 font-medium' : 'text-neutral-200'}`}>{p.type === 'service' ? '—' : p.currentStock}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => edit(p)} className="text-neutral-500 hover:text-white text-xs">Edit</button>
                      <button onClick={() => remove(p.id)} className="text-neutral-500 hover:text-red-400 text-xs">Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
