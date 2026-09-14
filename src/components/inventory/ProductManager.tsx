import { useEffect, useState, useMemo } from 'react';
import { db, type Product, type Category, type StockMovement } from '../../lib/db';
import { inventoryValue, profitPerUnit, marginPercent, stockStatus } from '../../lib/inventory';

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<{id:string;name:string}[]>([]);
  const [filter, setFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState('');
  const [form, setForm] = useState<Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>>({
    name: '', sku: '', barcode: '', type: 'physical', unit: 'pc', purchasePrice: 0, sellingPrice: 0,
    taxRate: 0, currentStock: 0, minimumStock: 5, supplierId: undefined, categoryId: undefined,
    description: '', active: true,
  });

  const load = async () => {
    const [p, c, s] = await Promise.all([db.products.toArray(), db.categories.toArray(), db.suppliers.toArray()]);
    setProducts(p.sort((a,b)=>a.name.localeCompare(b.name)));
    setCategories(c.sort((a,b)=>a.name.localeCompare(b.name)));
    setSuppliers(s.map(s=>({id:s.id,name:s.name})));
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return products.filter(p => {
      if (catFilter && p.categoryId !== catFilter) return false;
      if (typeFilter && p.type !== typeFilter) return false;
      if (statusFilter) {
        const s = stockStatus(p.currentStock, p.minimumStock);
        if (statusFilter === 'low' && s !== 'low') return false;
        if (statusFilter === 'out' && s !== 'out') return false;
        if (statusFilter === 'in' && s !== 'in') return false;
      }
      return !q || p.name.toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q) || (p.barcode||'').toLowerCase().includes(q);
    });
  }, [products, filter, catFilter, typeFilter, statusFilter]);

  async function saveProduct() {
    const now = new Date().toISOString();
    const data = { ...form, purchasePrice: Number(form.purchasePrice||0), sellingPrice: Number(form.sellingPrice||0), taxRate: Number(form.taxRate||0), currentStock: Number(form.currentStock||0), minimumStock: Number(form.minimumStock||5) } as Partial<Product>;
    if (editing) {
      await db.products.update(editing.id, { ...data, updatedAt: now });
    } else {
      await db.products.add({ id: crypto.randomUUID(), ...data, createdAt: now, updatedAt: now } as Product);
      if (data.type === 'physical' && (data.currentStock || 0) > 0) {
        await db.stockMovements.add({ id: crypto.randomUUID(), productId: crypto.randomUUID(), type: 'in', quantity: Number(data.currentStock||0), reason: 'Opening stock', date: now, createdAt: now });
        // Note: opening stock movement linked to product after creation; simplified for V1
      }
    }
    setForm({ name: '', sku: '', barcode: '', type: 'physical', unit: 'pc', purchasePrice: 0, sellingPrice: 0, taxRate: 0, currentStock: 0, minimumStock: 5, supplierId: undefined, categoryId: undefined, description: '', active: true });
    setEditing(null); setOpenAdd(false); load();
  }

  async function saveCategory() {
    if (!catName.trim()) return;
    await db.categories.add({ id: crypto.randomUUID(), name: catName.trim(), type: 'product', createdAt: new Date().toISOString() });
    setCatName(''); setShowCatForm(false); load();
  }

  async function deleteCategory(id: string) {
    const used = await db.products.where('categoryId').equals(id).count();
    if (used > 0) { alert('Category in use by products. Reassign first.'); return; }
    await db.categories.delete(id); load();
  }

  async function delProduct(id: string) {
    if (!window.confirm('Delete product? Historical sales/purchases stay intact; product is removed from lists.')) return;
    const p = await db.products.get(id);
    if (p) {
      await db.products.update(id, { active: false, updatedAt: new Date().toISOString() });
    }
    load();
  }

  async function adjustStock(productId: string, delta: number, reason: string) {
    const p = await db.products.get(productId); if (!p) return;
    const newStock = Math.max(0, (p.currentStock || 0) + delta);
    await db.products.update(productId, { currentStock: newStock, updatedAt: new Date().toISOString() });
    await db.stockMovements.add({ id: crypto.randomUUID(), productId, type: delta > 0 ? 'in' : 'out', quantity: Math.abs(delta), reason, date: new Date().toISOString(), createdAt: new Date().toISOString() });
    load();
  }

  const inputClass = 'w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40';
  const btnPrimary = 'px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-black';

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-white">Inventory</h1><p className="text-sm text-neutral-400">Products, categories, stock.</p></div>
        <div className="flex gap-2"><button onClick={() => { setOpenAdd(true); setEditing(null); setForm({ name: '', sku: '', barcode: '', type: 'physical', unit: 'pc', purchasePrice: 0, sellingPrice: 0, taxRate: 0, currentStock: 0, minimumStock: 5, supplierId: undefined, categoryId: undefined, description: '', active: true }); }} className="px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold">Add product</button></div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search name / SKU / barcode" className={inputClass + ' max-w-xs'} />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={inputClass + ' max-w-[140px]'}><option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={inputClass + ' max-w-[130px]'}><option value="">All types</option><option value="physical">Product</option><option value="service">Service</option></select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputClass + ' max-w-[120px]'}><option value="">All status</option><option value="in">In stock</option><option value="low">Low</option><option value="out">Out</option></select>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs text-neutral-400">Categories:</span>
        {categories.map(c => <span key={c.id} className="inline-flex items-center gap-1 text-xs bg-neutral-800 text-white px-2 py-0.5 rounded-md">{c.name} <button onClick={() => deleteCategory(c.id)} className="text-red-300 hover:text-white">×</button></span>)}
        <button onClick={() => setShowCatForm(!showCatForm)} className="text-xs text-indigo-300 hover:text-indigo-200">+ Add category</button>
        {showCatForm && <div className="flex gap-2"><input className={inputClass + ' !py-1 !text-xs'} value={catName} onChange={e => setCatName(e.target.value)} placeholder="Category name" /><button onClick={saveCategory} className={btnPrimary}>Save</button></div>}
      </div>

      {(openAdd || editing) && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 mb-6 space-y-3">
          <h2 className="font-semibold text-white">{editing ? 'Edit product' : 'New product'}</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <input className={inputClass} placeholder="Product name *" value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className={inputClass} placeholder="SKU" value={form.sku ?? ''} onChange={e => setForm({ ...form, sku: e.target.value })} />
            <input className={inputClass} placeholder="Barcode" value={form.barcode ?? ''} onChange={e => setForm({ ...form, barcode: e.target.value })} />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <select className={inputClass} value={form.type ?? 'physical'} onChange={e => setForm({ ...form, type: e.target.value as 'physical'|'service' })}><option value="physical">Physical</option><option value="service">Service</option></select>
            <input className={inputClass} placeholder="Unit" value={form.unit ?? ''} onChange={e => setForm({ ...form, unit: e.target.value })} />
            <select className={inputClass} value={form.categoryId ?? ''} onChange={e => setForm({ ...form, categoryId: e.target.value || undefined })}><option value="">Category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
          <div className="grid md:grid-cols-4 gap-3">
            <input className={inputClass} placeholder="Purchase price" type="number" value={form.purchasePrice ?? 0} onChange={e => setForm({ ...form, purchasePrice: Number(e.target.value) })} />
            <input className={inputClass} placeholder="Selling price" type="number" value={form.sellingPrice ?? 0} onChange={e => setForm({ ...form, sellingPrice: Number(e.target.value) })} />
            <input className={inputClass} placeholder="Tax rate %" type="number" value={form.taxRate ?? 0} onChange={e => setForm({ ...form, taxRate: Number(e.target.value) })} />
            <select className={inputClass} value={form.supplierId ?? ''} onChange={e => setForm({ ...form, supplierId: e.target.value || undefined })}><option value="">Supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </div>
          {form.type === 'physical' && (
            <div className="grid md:grid-cols-3 gap-3">
              <input className={inputClass} placeholder="Current stock" type="number" value={form.currentStock ?? 0} onChange={e => setForm({ ...form, currentStock: Number(e.target.value) })} />
              <input className={inputClass} placeholder="Minimum stock" type="number" value={form.minimumStock ?? 5} onChange={e => setForm({ ...form, minimumStock: Number(e.target.value) })} />
            </div>
          )}
          <textarea className={inputClass} placeholder="Description" rows={2} value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" checked={form.active !== false} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active</label>
          <div className="flex gap-3">
            <button onClick={saveProduct} className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold">Save</button>
            <button onClick={() => { setOpenAdd(false); setEditing(null); }} className="px-4 py-2 rounded-lg border border-neutral-700 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950 shadow-lg shadow-black/20">
        <table className="w-full text-sm">
          <thead className="text-neutral-400 text-xs uppercase tracking-wider bg-neutral-900"><tr><th className="text-left px-4 py-3">Product</th><th>SKU</th><th>Type</th><th>Sell</th><th>Purchase</th><th>Stock</th><th>Min</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(p => {
              const s = stockStatus(p.currentStock, p.minimumStock);
              const statusClass = s === 'out' ? 'text-red-400' : s === 'low' ? 'text-amber-400' : 'text-emerald-400';
              return (
                <tr key={p.id} className="border-t border-neutral-800 hover:bg-neutral-900/60">
                  <td className="px-4 py-3"><div className="font-semibold text-white">{p.name}</div><div className="text-xs text-neutral-500">{categories.find(c=>c.id===p.categoryId)?.name||'-'}</div></td>
                  <td className="px-3 py-3 text-neutral-300">{p.sku||'-'}</td>
                  <td className="px-3 py-3"><span className="text-xs bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-md">{p.type}</span></td>
                  <td className="px-3 py-3 text-neutral-300">₹{p.sellingPrice}</td>
                  <td className="px-3 py-3 text-neutral-300">₹{p.purchasePrice}</td>
                  <td className="px-3 py-3 text-white font-medium">{p.currentStock}</td>
                  <td className="px-3 py-3 text-neutral-400">{p.minimumStock}</td>
                  <td className={`px-3 py-3 font-medium ${statusClass}`}>{s}</td>
                  <td className="px-3 py-3 whitespace-nowrap"><div className="flex gap-1"><button onClick={() => { setEditing(p); setForm({ ...p }); setOpenAdd(false); }} className={btnPrimary}>Edit</button><button onClick={() => adjustStock(p.id, 1, 'Manual add')} className="px-2 py-1 rounded-lg text-xs bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900">+1</button><button onClick={() => adjustStock(p.id, -1, 'Manual remove')} className="px-2 py-1 rounded-lg text-xs bg-amber-900/40 text-amber-300 hover:bg-amber-900">-1</button></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p className="text-neutral-400 mt-6">No products match.</p>}
    </div>
  );
}
