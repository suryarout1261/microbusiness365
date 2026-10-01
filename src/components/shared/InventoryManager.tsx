import { useEffect, useState } from 'react';
import { db, type Product } from '../../lib/db';
import { generateId, blockDecimalKey, blockNegativeKey, sanitizeInteger, sanitizeAmount, sanitizePercentage } from '../../lib/utils';

const EMPTY = {
  name: '',
  type: 'physical' as const,
  unit: 'pcs',
  purchasePrice: '',
  sellingPrice: '',
  taxRate: '',
  currentStock: '',
  minimumStock: '',
  active: true,
};

export default function InventoryManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<typeof EMPTY & { id?: string }>(EMPTY);

  const load = async () => {
    try {
      const all = await db.products.toArray();
      setProducts(all.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name.trim()) {
      alert('Product name is required.');
      return;
    }
    const now = new Date().toISOString();
    const record: Product = {
      id: form.id || generateId(),
      name: form.name.trim(),
      type: form.type,
      unit: form.unit || 'pcs',
      purchasePrice: form.purchasePrice === '' ? 0 : Math.max(0, Number(form.purchasePrice) || 0),
      sellingPrice: form.sellingPrice === '' ? 0 : Math.max(0, Number(form.sellingPrice) || 0),
      taxRate: form.taxRate === '' ? 0 : Math.min(100, Math.max(0, Number(form.taxRate) || 0)),
      currentStock: form.currentStock === '' ? 0 : Math.max(0, Math.floor(Number(form.currentStock) || 0)),
      minimumStock: form.minimumStock === '' ? 0 : Math.max(0, Math.floor(Number(form.minimumStock) || 0)),
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.products.put(record);
    setForm(EMPTY);
    setOpenForm(false);
    load();
  }

  function edit(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      type: p.type,
      unit: p.unit,
      purchasePrice: p.purchasePrice === 0 ? '' : String(p.purchasePrice),
      sellingPrice: p.sellingPrice === 0 ? '' : String(p.sellingPrice),
      taxRate: p.taxRate === 0 ? '' : String(p.taxRate),
      currentStock: p.currentStock === 0 ? '' : String(p.currentStock),
      minimumStock: p.minimumStock === 0 ? '' : String(p.minimumStock),
      active: p.active,
    });
    setOpenForm(true);
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this product? Historical sales will be preserved.')) return;
    await db.products.delete(id);
    load();
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase().trim())
  );
  const lowStock = products.filter(
    (p) => p.type !== 'service' && p.currentStock <= p.minimumStock
  ).length;

  return (
    <div className="space-y-6">
      {lowStock > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300 font-medium flex items-center gap-2">
          <span>⚠</span>
          <span>
            {lowStock} product{lowStock > 1 ? 's are' : ' is'} below minimum safety stock levels.
          </span>
        </div>
      )}

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-between">
        <div className="flex-1 relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by title or unit..."
            className="app-input app-search-input pl-11"
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
          </svg>
        </div>
        <button
          onClick={() => {
            setOpenForm(!openForm);
            setForm(EMPTY);
          }}
          className="app-btn-primary"
        >
          {openForm ? '✕ Close Form' : '+ New Product'}
        </button>
      </div>

      {/* Form Card */}
      {openForm && (
        <div className="app-card space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] dark:border-neutral-800 pb-3">
            <h2 className="text-base font-bold text-[var(--color-text-primary)] dark:text-white">
              {form.id ? 'Edit Product' : 'Add New Inventory Item'}
            </h2>
            <button
              onClick={() => { setOpenForm(false); setForm(EMPTY); }}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Product Name *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Copper Wire Reel"
                className="app-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Item Type
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className="app-input"
              >
                <option value="physical">Physical Item</option>
                <option value="service">Service / Labour</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Unit of Measure
              </label>
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="e.g. pcs, kg, mtrs"
                className="app-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Cost Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.purchasePrice === 0 ? '' : form.purchasePrice}
                onKeyDown={blockNegativeKey}
                onChange={(e) => setForm({ ...form, purchasePrice: sanitizeAmount(e.target.value) })}
                placeholder="Cost Price (₹)"
                className="app-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Selling Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.sellingPrice === 0 ? '' : form.sellingPrice}
                onKeyDown={blockNegativeKey}
                onChange={(e) => setForm({ ...form, sellingPrice: sanitizeAmount(e.target.value) })}
                placeholder="Selling Price (₹)"
                className="app-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                GST / Tax %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                value={form.taxRate === 0 ? '' : form.taxRate}
                onKeyDown={blockNegativeKey}
                onChange={(e) => setForm({ ...form, taxRate: sanitizePercentage(e.target.value) })}
                placeholder="GST % (e.g. 18)"
                className="app-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Current Stock Qty
              </label>
              <input
                type="number"
                step="1"
                min="0"
                disabled={form.type === 'service'}
                value={form.currentStock === 0 ? '' : form.currentStock}
                onKeyDown={blockDecimalKey}
                onChange={(e) => setForm({ ...form, currentStock: sanitizeInteger(e.target.value) })}
                placeholder="Stock Qty"
                className="app-input disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Minimum Alert Level
              </label>
              <input
                type="number"
                step="1"
                min="0"
                disabled={form.type === 'service'}
                value={form.minimumStock === 0 ? '' : form.minimumStock}
                onKeyDown={blockDecimalKey}
                onChange={(e) => setForm({ ...form, minimumStock: sanitizeInteger(e.target.value) })}
                placeholder="Min Alert Qty"
                className="app-input disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setOpenForm(false); setForm(EMPTY); }} className="app-btn-secondary">
              Cancel
            </button>
            <button onClick={save} className="app-btn-primary">
              Save Product
            </button>
          </div>
        </div>
      )}

      {/* Product Table */}
      {loading ? (
        <div className="py-12 text-center text-[var(--color-text-muted)]">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2"></div>
          <p className="text-sm">Loading inventory...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="app-card p-10 text-center">
          <h3 className="text-base font-bold text-[var(--color-text-primary)] dark:text-white mb-1">
            No products found
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] dark:text-neutral-400">
            Add items to track stock, replenishment alerts, and sales.
          </p>
        </div>
      ) : (
        <div className="app-card p-0 overflow-hidden">
          <div className="app-table-container">
            <table className="w-full text-sm min-w-[680px]">
              <thead className="bg-[var(--color-surface-overlay)] dark:bg-neutral-900 text-[var(--color-text-secondary)] dark:text-neutral-400 text-left uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3 whitespace-nowrap">Product</th>
                  <th className="px-5 py-3 whitespace-nowrap">Type</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Cost</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Selling</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">In Stock</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] dark:divide-neutral-800">
                {filtered.map((p) => {
                  const isLow = p.type !== 'service' && p.currentStock <= p.minimumStock;
                  return (
                    <tr key={p.id} className="hover:bg-[var(--color-surface-overlay)]/50 transition">
                      <td className="px-5 py-3.5 font-semibold text-[var(--color-text-primary)] dark:text-white whitespace-nowrap">
                        {p.name}
                      </td>
                      <td className="px-5 py-3.5 text-xs uppercase font-medium text-[var(--color-text-secondary)] dark:text-neutral-400 whitespace-nowrap">
                        {p.type}
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs text-[var(--color-text-secondary)] dark:text-neutral-400 whitespace-nowrap">
                        ₹{p.purchasePrice.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-[var(--color-text-primary)] dark:text-white whitespace-nowrap">
                        ₹{p.sellingPrice.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {p.type === 'service' ? (
                          <span className="text-[var(--color-text-muted)] text-xs">—</span>
                        ) : (
                          <span
                            className={`inline-block font-semibold ${
                              isLow ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {p.currentStock} {p.unit}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => edit(p)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--color-border)] dark:border-neutral-700 hover:bg-[var(--color-surface-overlay)] dark:hover:bg-neutral-800 text-[var(--color-text-secondary)] dark:text-neutral-300 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(p.id)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
