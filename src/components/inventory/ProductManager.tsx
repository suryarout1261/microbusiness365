import { useEffect, useState, useMemo } from 'react';
import { db, type Product, type Category, type StockMovement } from '../../lib/db';
import { inventoryValue, profitPerUnit, marginPercent, stockStatus } from '../../lib/inventory';
import { blockDecimalKey, blockNegativeKey, sanitizeInteger, sanitizeAmount, sanitizePercentage } from '../../lib/utils';

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
    name: '', sku: '', barcode: '', type: 'physical', unit: 'pc', purchasePrice: undefined as any, sellingPrice: undefined as any,
    taxRate: undefined as any, currentStock: undefined as any, minimumStock: undefined as any, supplierId: undefined, categoryId: undefined,
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
    if (!form.name || !form.name.trim()) {
      alert('Product name is required.');
      return;
    }
    const now = new Date().toISOString();
    const data = {
      ...form,
      name: form.name.trim(),
      purchasePrice: form.purchasePrice === '' || form.purchasePrice === undefined || form.purchasePrice === null ? 0 : Math.max(0, Number(form.purchasePrice)),
      sellingPrice: form.sellingPrice === '' || form.sellingPrice === undefined || form.sellingPrice === null ? 0 : Math.max(0, Number(form.sellingPrice)),
      taxRate: form.taxRate === '' || form.taxRate === undefined || form.taxRate === null ? 0 : Math.min(100, Math.max(0, Number(form.taxRate))),
      currentStock: form.currentStock === '' || form.currentStock === undefined || form.currentStock === null ? 0 : Math.max(0, Math.floor(Number(form.currentStock))),
      minimumStock: form.minimumStock === '' || form.minimumStock === undefined || form.minimumStock === null ? 0 : Math.max(0, Math.floor(Number(form.minimumStock))),
    } as Partial<Product>;
    if (editing) {
      await db.products.update(editing.id, { ...data, updatedAt: now });
    } else {
      await db.products.add({ id: crypto.randomUUID(), ...data, createdAt: now, updatedAt: now } as Product);
      if (data.type === 'physical' && (data.currentStock || 0) > 0) {
        await db.stockMovements.add({ id: crypto.randomUUID(), productId: crypto.randomUUID(), type: 'in', quantity: Number(data.currentStock||0), reason: 'Opening stock', date: now, createdAt: now });
      }
    }
    setForm({ name: '', sku: '', barcode: '', type: 'physical', unit: 'pc', purchasePrice: undefined as any, sellingPrice: undefined as any, taxRate: undefined as any, currentStock: undefined as any, minimumStock: 5, supplierId: undefined, categoryId: undefined, description: '', active: true });
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
    if (p) { await db.products.update(id, { active: false, updatedAt: new Date().toISOString() }); }
    load();
  }

  async function adjustStock(productId: string, delta: number, reason: string) {
    const p = await db.products.get(productId); if (!p) return;
    const newStock = Math.max(0, (p.currentStock || 0) + delta);
    await db.products.update(productId, { currentStock: newStock, updatedAt: new Date().toISOString() });
    await db.stockMovements.add({ id: crypto.randomUUID(), productId, type: delta > 0 ? 'in' : 'out', quantity: Math.abs(delta), reason, date: new Date().toISOString(), createdAt: new Date().toISOString() });
    load();
  }

  // Spreadsheet-style automatic empty row behavior
  const [sheetRows, setSheetRows] = useState<Product[]>([]);
  useEffect(() => {
    setSheetRows([...filtered]);
    if (filtered.length === 0) return;
    const last = filtered[filtered.length-1];
    if (!last.name && !last.sku && !last.barcode && !last.purchasePrice) {
      // last row empty — ensure exactly one empty after filled
      setSheetRows(prev => {
        const filled = prev.filter(r => r.name || r.sku || (r.purchasePrice && r.purchasePrice !== 0));
        // always keep one empty at end if last filled
        const hasEmpty = prev[prev.length-1]?.name === '' && prev[prev.length-1]?.sku === '';
        if (!hasEmpty && filled.length > 0) return [...prev, { id: 'empty', name: '', sku: '', barcode: '', type: 'physical', unit: 'pc', purchasePrice: undefined as any, sellingPrice: undefined as any, taxRate: undefined as any, currentStock: undefined as any, minimumStock: 5, supplierId: undefined, categoryId: undefined, description: '', active: true, createdAt: '', updatedAt: '' } as any];
        return prev;
      });
    }
  }, [filtered]);

  const inputClass = 'w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition';
  const btnPrimary = 'px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-black hover:bg-neutral-200 transition';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0c15] via-[#12122a] to-[#0b0c15] text-[var(--color-text-primary)]">
      <header className="sticky top-0 z-50 bg-[#0b0c15]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Inventory</h1>
            <p className="text-sm text-neutral-400 mt-1">Products, stock levels, categories and suppliers.</p>
          </div>
          <button onClick={() => { setOpenAdd(true); setEditing(null); setForm({ name: '', sku: '', barcode: '', type: 'physical', unit: 'pc', purchasePrice: undefined as any, sellingPrice: undefined as any, taxRate: undefined as any, currentStock: undefined as any, minimumStock: 5, supplierId: undefined, categoryId: undefined, description: '', active: true }); }} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 hover:brightness-110 transition">+ Add product</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Filters */}
        <section className="mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search name / SKU / barcode" className={inputClass + ' max-w-xs bg-neutral-900/60 border-neutral-700'} />
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={inputClass + ' max-w-[140px] bg-neutral-900/60 border-neutral-700'}>
              <option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={inputClass + ' max-w-[130px] bg-neutral-900/60 border-neutral-700'}>
              <option value="">All types</option><option value="physical">Product</option><option value="service">Service</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputClass + ' max-w-[120px] bg-neutral-900/60 border-neutral-700'}>
              <option value="">All status</option><option value="in">In stock</option><option value="low">Low</option><option value="out">Out</option>
            </select>
          </div>
        </section>

        {/* Categories */}
        <section className="mb-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Categories</span>
            {categories.map(c => (
              <span key={c.id} className="inline-flex items-center gap-1.5 text-xs bg-gradient-to-br from-indigo-900/60 to-violet-900/60 text-indigo-100 px-3 py-1 rounded-full border border-indigo-500/20">
                {c.name}
                <button onClick={() => deleteCategory(c.id)} className="text-red-300 hover:text-white ml-0.5" aria-label="Delete category">×</button>
              </span>
            ))}
            <button onClick={() => setShowCatForm(!showCatForm)} className="text-xs text-indigo-300 hover:text-white font-medium">+ Add category</button>
          </div>

          {showCatForm && (
            <div className="flex gap-2 mt-3">
              <input className={inputClass + ' !py-2 !text-xs bg-neutral-900/60 border-neutral-700'} value={catName} onChange={e => setCatName(e.target.value)} placeholder="Category name" />
              <button onClick={saveCategory} className={btnPrimary}>Save</button>
            </div>
          )}
        </section>

        {/* Add/Edit Form */}
        {(openAdd || editing) && (
          <section className="rounded-3xl border border-neutral-700/60 bg-gradient-to-br from-neutral-900 to-[#12122a] p-6 md:p-8 shadow-2xl shadow-black/40 mb-8">
            <h2 className="text-xl font-extrabold text-white mb-5">{editing ? 'Edit product' : 'New product'}</h2>
            <div className="grid md:grid-cols-3 gap-3 mb-3">
              <input className={inputClass + ' bg-neutral-950 border-neutral-700'} placeholder="Product name *" value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input className={inputClass + ' bg-neutral-950 border-neutral-700'} placeholder="SKU" value={form.sku ?? ''} onChange={e => setForm({ ...form, sku: e.target.value })} />
              <input className={inputClass + ' bg-neutral-950 border-neutral-700'} placeholder="Barcode" value={form.barcode ?? ''} onChange={e => setForm({ ...form, barcode: e.target.value })} />
            </div>
            <div className="grid md:grid-cols-3 gap-3 mb-3">
              <select className={inputClass + ' bg-neutral-950 border-neutral-700'} value={form.type ?? 'physical'} onChange={e => setForm({ ...form, type: e.target.value as 'physical'|'service' })}><option value="physical">Physical</option><option value="service">Service</option></select>
              <input className={inputClass + ' bg-neutral-950 border-neutral-700'} placeholder="Unit (e.g. pc)" value={form.unit ?? ''} onChange={e => setForm({ ...form, unit: e.target.value })} />
              <select className={inputClass + ' bg-neutral-950 border-neutral-700'} value={form.categoryId ?? ''} onChange={e => setForm({ ...form, categoryId: e.target.value || undefined })}><option value="">Category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </div>
            <div className="grid md:grid-cols-4 gap-3 mb-3">
              <input className={inputClass + ' bg-neutral-950 border-neutral-700'} placeholder="Purchase price (e.g. ₹50)" type="number" min="0" step="any" value={form.purchasePrice === undefined || form.purchasePrice === null || form.purchasePrice === '' ? '' : form.purchasePrice} onKeyDown={blockNegativeKey} onChange={e => setForm({ ...form, purchasePrice: sanitizeAmount(e.target.value) })} />
              <input className={inputClass + ' bg-neutral-950 border-neutral-700'} placeholder="Selling price (e.g. ₹75)" type="number" min="0" step="any" value={form.sellingPrice === undefined || form.sellingPrice === null || form.sellingPrice === '' ? '' : form.sellingPrice} onKeyDown={blockNegativeKey} onChange={e => setForm({ ...form, sellingPrice: sanitizeAmount(e.target.value) })} />
              <input className={inputClass + ' bg-neutral-950 border-neutral-700'} placeholder="Tax rate %" type="number" min="0" max="100" step="any" value={form.taxRate === undefined || form.taxRate === null || form.taxRate === '' ? '' : form.taxRate} onKeyDown={blockNegativeKey} onChange={e => setForm({ ...form, taxRate: sanitizePercentage(e.target.value) })} />
              <select className={inputClass + ' bg-neutral-950 border-neutral-700'} value={form.supplierId ?? ''} onChange={e => setForm({ ...form, supplierId: e.target.value || undefined })}><option value="">Supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </div>
            {form.type === 'physical' && (
              <div className="grid md:grid-cols-3 gap-3 mb-3">
                <input className={inputClass + ' bg-neutral-950 border-neutral-700'} placeholder="Current stock (e.g. 100)" type="number" step="1" min="0" value={form.currentStock === undefined || form.currentStock === null || form.currentStock === '' || form.currentStock === 0 ? '' : form.currentStock} onKeyDown={blockDecimalKey} onChange={e => { const c = sanitizeInteger(e.target.value); setForm({ ...form, currentStock: c === '' ? '' : parseInt(c, 10) }); }} />
                <input className={inputClass + ' bg-neutral-950 border-neutral-700'} placeholder="Minimum stock (e.g. 10)" type="number" step="1" min="0" value={form.minimumStock === undefined || form.minimumStock === null || form.minimumStock === '' || form.minimumStock === 0 ? '' : form.minimumStock} onKeyDown={blockDecimalKey} onChange={e => { const c = sanitizeInteger(e.target.value); setForm({ ...form, minimumStock: c === '' ? '' : parseInt(c, 10) }); }} />
              </div>
            )}
            <textarea className={inputClass + ' bg-neutral-950 border-neutral-700'} placeholder="Description" rows={2} value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            <label className="flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" checked={form.active !== false} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active</label>
            <div className="flex gap-3 pt-2">
              <button onClick={saveProduct} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:brightness-110 transition">Save</button>
              <button onClick={() => { setOpenAdd(false); setEditing(null); }} className="px-5 py-2.5 rounded-xl border border-neutral-600 text-sm text-neutral-300 hover:bg-neutral-900 transition">Cancel</button>
            </div>
          </section>
        )}     )}

        {/* Table */}
        <section className="rounded-3xl border border-neutral-700/60 bg-gradient-to-br from-neutral-900/60 to-[#12122a] shadow-2xl shadow-black/30 overflow-hidden">
          <div className="app-table-container">
            <table className="w-full text-sm min-w-[850px]">
              <thead className="bg-gradient-to-r from-indigo-900/40 to-violet-900/40 text-neutral-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3.5 font-bold whitespace-nowrap">Product</th>
                  <th className="text-left px-3 py-3.5 font-bold whitespace-nowrap">SKU</th>
                  <th className="text-left px-3 py-3.5 font-bold whitespace-nowrap">Category</th>
                  <th className="text-center px-3 py-3.5 font-bold whitespace-nowrap">Stock</th>
                  <th className="text-right px-3 py-3.5 font-bold whitespace-nowrap">Sell</th>
                  <th className="text-right px-3 py-3.5 font-bold whitespace-nowrap">Purchase</th>
                  <th className="text-center px-3 py-3.5 font-bold whitespace-nowrap">Status</th>
                  <th className="text-left px-3 py-3.5 font-bold whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const s = stockStatus(p.currentStock, p.minimumStock);
                  const statusClass = s === 'out' ? 'text-red-400 font-bold' : s === 'low' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold';
                  return (
                    <tr key={p.id} className="border-t border-white/5 hover:bg-white/5 transition">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-white">{p.name}</div>
                        <div className="text-xs text-neutral-500">{categories.find(c=>c.id===p.categoryId)?.name||'-'} • {p.type}</div>
                      </td>
                      <td className="px-3 py-3.5 text-neutral-300 font-mono text-xs whitespace-nowrap">{p.sku||'-'}</td>
                      <td className="px-3 py-3.5 text-neutral-300 whitespace-nowrap">{categories.find(c=>c.id===p.categoryId)?.name||'-'}</td>
                      <td className="px-3 py-3.5 text-center text-neutral-800 dark:text-white font-medium whitespace-nowrap">{p.currentStock ?? 0}</td>
                      <td className="px-3 py-3.5 text-right text-emerald-300 font-medium whitespace-nowrap">₹{p.sellingPrice ?? 0}</td>
                      <td className="px-3 py-3.5 text-right text-neutral-300 whitespace-nowrap">₹{p.purchasePrice ?? 0}</td>
                      <td className={`px-3 py-3.5 text-center whitespace-nowrap ${statusClass}`}>{s}</td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <div className="flex gap-1.5">
                          <button onClick={() => { setEditing(p); setForm({ ...p, purchasePrice: p.purchasePrice ?? '', sellingPrice: p.sellingPrice ?? '', taxRate: p.taxRate ?? '', currentStock: p.currentStock ?? '' } as any); setOpenAdd(false); }} className={btnPrimary}>Edit</button>
                          <button onClick={() => adjustStock(p.id, 1, 'Manual add')} className="px-2 py-1 rounded-lg text-xs bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900 transition font-medium">+1</button>
                          <button onClick={() => adjustStock(p.id, -1, 'Manual remove')} className="px-2 py-1 rounded-lg text-xs bg-amber-900/40 text-amber-300 hover:bg-amber-900 transition font-medium">-1</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <p className="text-neutral-400 py-8 text-center">No products match.</p>}
        </section>

        {/* Stats row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/60 to-violet-950/40 p-5 text-center shadow-xl shadow-indigo-500/10">
            <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-400 mb-1">Products</p>
            <p className="text-3xl font-extrabold text-white">{products.filter(p=>p.active!==false).length}</p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/60 to-orange-950/40 p-5 text-center shadow-xl shadow-amber-500/10">
            <p className="text-xs font-extrabold uppercase tracking-widest text-amber-400 mb-1">Low Stock</p>
            <p className="text-3xl font-extrabold text-white">{products.filter(p => p.active !== false && stockStatus(p.currentStock, p.minimumStock) === 'low').length}</p>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-950/60 to-rose-950/40 p-5 text-center shadow-xl shadow-red-500/10">
            <p className="text-xs font-extrabold uppercase tracking-widest text-red-400 mb-1">Out of Stock</p>
            <p className="text-3xl font-extrabold text-white">{products.filter(p => p.active !== false && stockStatus(p.currentStock, p.minimumStock) === 'out').length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/60 to-teal-950/40 p-5 text-center shadow-xl shadow-emerald-500/10">
            <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 mb-1">Inventory Value</p>
            <p className="text-3xl font-extrabold text-white">₹{inventoryValue(products).toFixed(0)}</p>
          </div>
        </section>
      </main>
    </div>
  );
}
