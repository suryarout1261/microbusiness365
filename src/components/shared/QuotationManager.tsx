import { useState, useEffect, useMemo } from 'react';
import { db, type Customer, type Product, type Quotation } from '../../lib/db';
import { formatDate, getTodayISO, generateId, blockDecimalKey, blockNegativeKey, sanitizeInteger, sanitizeAmount, sanitizePercentage } from '../../lib/utils';
import { getNextSequenceNumber, recordSequenceUsed } from '../../lib/numbering';
import { printQuotationDocument } from '../../lib/documentPrinter';

export default function QuotationManager() {
  const [list, setList] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    quotationNumber: '',
    date: '',
    validUntil: '',
    notes: '',
    status: 'sent' as const,
    items: [{ productId: '', qty: '', price: '', disc: '' }] as any,
  });

  const load = async () => {
    try {
      const [rows, c, p] = await Promise.all([
        db.quotations.toArray(),
        db.customers.toArray(),
        db.products.toArray(),
      ]);
      setList(rows.sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime()));
      setCustomers(c.sort((a, b) => a.name.localeCompare(b.name)));
      setProducts(p.filter((x) => x.active !== false).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const customerMap = useMemo(
    () => new Map(customers.map((c) => [c.id, c.name])),
    [customers]
  );

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return list;
    return list.filter((item) => {
      const cName = item.customerId ? customerMap.get(item.customerId) || '' : item.customerName || '';
      return (
        item.quotationNumber.toLowerCase().includes(q) ||
        cName.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q)
      );
    });
  }, [list, filter, customerMap]);

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: '', qty: '', price: '', disc: '' }],
    }));
  };

  const removeItem = (idx: number) => {
    if (form.items.length <= 1) {
      setForm((prev) => ({
        ...prev,
        items: [{ productId: '', qty: '', price: '', disc: '' }],
      }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    const arr = [...form.items];
    arr[idx] = { ...arr[idx], [field]: val };

    if (field === 'productId') {
      const p = products.find((x) => x.id === val);
      if (p) {
        arr[idx].price = p.sellingPrice;
        if (!arr[idx].qty) arr[idx].qty = 1;
      }
    }

    const isLast = idx === arr.length - 1;
    const hasContent = arr[idx].productId || arr[idx].qty || arr[idx].price;
    if (isLast && hasContent) {
      arr.push({ productId: '', qty: '', price: '', disc: '' });
    }

    setForm((prev) => ({ ...prev, items: arr }));
  };

  async function save() {
    const now = new Date().toISOString();
    const customer = customers.find((c) => c.id === form.customerId);
    const validItems = form.items.filter(
      (it: any) => it.productId || (Number(it.qty) > 0 && Number(it.price) > 0)
    );
    const itemsToSave = validItems.length > 0 ? validItems : form.items;
    const quoteItems = itemsToSave.map((it: any) => {
      const prod = products.find((p) => p.id === it.productId);
      const qty = Number(it.qty) || 1;
      const price = Number(it.price) || (prod ? prod.sellingPrice : 0);
      const disc = Number(it.disc) || 0;
      const total = qty * price * (1 - disc / 100);
      return {
        productId: it.productId,
        description: prod ? prod.name : it.description || 'Item',
        productName: prod ? prod.name : it.productName || 'Item',
        qty,
        quantity: qty,
        price,
        unitPrice: price,
        disc,
        discount: disc,
        total,
      };
    });

    const subtotal = quoteItems.reduce((s: number, it: any) => s + it.total, 0);
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + tax;

    const quoteNumber = form.quotationNumber.trim() || (await getNextSequenceNumber('quotation'));
    recordSequenceUsed('quotation', quoteNumber);

    const custAddress = customer
      ? [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')
      : '';

    const record: Quotation = {
      id: generateId(),
      quotationNumber: quoteNumber,
      customerId: form.customerId || '',
      customerName: customer ? customer.name : 'General Quote',
      customerAddress: custAddress,
      customerGstin: customer?.gstin || '',
      date: form.date || getTodayISO(),
      validUntil: form.validUntil || '',
      subtotal,
      tax,
      taxRate: 18,
      total,
      status: form.status || 'sent',
      notes: form.notes.trim(),
      items: quoteItems,
      createdAt: now,
    } as any;

    await db.quotations.put(record);
    setForm({
      customerId: '',
      quotationNumber: '',
      date: '',
      validUntil: '',
      notes: '',
      status: 'sent',
      items: [{ productId: '', qty: '', price: '', disc: '' }],
    });
    setOpenAdd(false);
    load();
  }

  async function handleStatusChange(quoteId: string, newStatus: string) {
    await db.quotations.update(quoteId, { status: newStatus as any });
    setList((prev) =>
      prev.map((q) => (q.id === quoteId ? { ...q, status: newStatus as any } : q))
    );
  }

  async function del(id: string) {
    if (!window.confirm('Delete this quotation record?')) return;
    await db.quotations.delete(id);
    load();
  }

  const quoteFormSubtotal = form.items.reduce((s: number, it: any) => {
    const prod = products.find((p) => p.id === it.productId);
    const q = Number(it.qty) || 0;
    const pr = Number(it.price) || (prod ? prod.sellingPrice : 0);
    const d = Number(it.disc) || 0;
    return s + q * pr * (1 - d / 100);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-between">
        <div className="flex-1 relative">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search quotations by number or customer..."
            className="app-input app-search-input pl-11"
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <a href="/tools/quotation-generator" className="app-btn-secondary">
            Quotation Generator
          </a>
          <button
            type="button"
            onClick={async () => {
              const nextState = !openAdd;
              setOpenAdd(nextState);
              if (nextState) {
                const nextNo = await getNextSequenceNumber('quotation');
                setForm({
                  customerId: '',
                  quotationNumber: nextNo,
                  date: getTodayISO(),
                  validUntil: '',
                  notes: '',
                  status: 'sent',
                  items: [{ productId: '', qty: '', price: '', disc: '' }],
                });
              }
            }}
            className="app-btn-primary"
          >
            {openAdd ? '✕ Close' : '+ Create Quotation'}
          </button>
        </div>
      </div>

      {/* Add Quotation Form */}
      {openAdd && (
        <div className="app-card space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] dark:border-neutral-800 pb-3">
            <h2 className="text-base font-bold text-[var(--color-text-primary)] dark:text-white">
              Create New Quotation
            </h2>
            <button
              onClick={() => setOpenAdd(false)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Customer
              </label>
              <select
                className="app-input"
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Quote Number
              </label>
              <input
                className="app-input"
                placeholder="QT-..."
                value={form.quotationNumber}
                onChange={(e) => setForm({ ...form, quotationNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Valid Until Date
              </label>
              <input
                className="app-input"
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider">
                Line Items
              </label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-2">
              {form.items.map((it: any, idx: number) => {
                const prod = products.find((p) => p.id === it.productId);
                const q = Number(it.qty) || 0;
                const pr = Number(it.price) || (prod ? prod.sellingPrice : 0);
                const d = Number(it.disc) || 0;
                const lineTotal = q * pr * (1 - d / 100);

                return (
                  <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 p-2 rounded-xl bg-[var(--color-surface)] dark:bg-neutral-900/50 border border-[var(--color-border)] dark:border-neutral-800">
                    <div className="flex-1 min-w-[200px] w-full sm:w-auto">
                      <select
                        className="app-input w-full"
                        value={it.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                      >
                        <option value="">Select product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — ₹{p.sellingPrice}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-20 shrink-0">
                      <input
                        className="app-input w-full text-center px-2"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Qty"
                        value={it.qty === 0 ? '' : it.qty}
                        onKeyDown={blockDecimalKey}
                        onChange={(e) => {
                          const clean = sanitizeInteger(e.target.value);
                          handleItemChange(idx, 'qty', clean === '' ? '' : parseInt(clean, 10));
                        }}
                      />
                    </div>
                    <div className="w-28 shrink-0">
                      <input
                        className="app-input w-full text-center px-2"
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Price (₹)"
                        value={it.price === 0 ? '' : it.price}
                        onKeyDown={blockNegativeKey}
                        onChange={(e) => handleItemChange(idx, 'price', e.target.value === '' ? '' : sanitizeAmount(e.target.value))}
                      />
                    </div>
                    <div className="w-24 shrink-0">
                      <input
                        className="app-input w-full text-center px-2"
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        placeholder="Disc %"
                        value={it.disc === 0 ? '' : it.disc}
                        onKeyDown={blockNegativeKey}
                        onChange={(e) => handleItemChange(idx, 'disc', e.target.value === '' ? '' : sanitizePercentage(e.target.value))}
                      />
                    </div>
                    <div className="min-w-[80px] text-right text-xs font-semibold text-[var(--color-text-primary)] dark:text-white shrink-0">
                      ₹{lineTotal.toFixed(2)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-xs text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                      title="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={addItem}
                className="app-btn-secondary text-xs py-1.5 px-3"
              >
                + Add Another Item
              </button>
              <div className="text-sm font-semibold text-[var(--color-text-primary)] dark:text-white">
                Subtotal: <span className="text-indigo-600 dark:text-indigo-400 font-bold">₹{quoteFormSubtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
              Notes & Terms
            </label>
            <textarea
              className="app-input resize-y min-h-[60px]"
              placeholder="Validity period, payment terms, delivery timelines..."
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setOpenAdd(false)} className="app-btn-secondary">
              Cancel
            </button>
            <button onClick={save} className="app-btn-primary">
              Save Quotation
            </button>
          </div>
        </div>
      )}

      {/* Quotations Table */}
      {loading ? (
        <div className="py-12 text-center text-[var(--color-text-muted)]">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2"></div>
          <p className="text-sm">Loading quotations...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="app-card p-10 text-center">
          <h3 className="text-base font-bold text-[var(--color-text-primary)] dark:text-white mb-1">
            {list.length === 0 ? 'No quotations created yet' : 'No matching quotations'}
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] dark:text-neutral-400 mb-4">
            Prepare customer quotes with itemized pricing, validity periods, and branded terms.
          </p>
          <button
            type="button"
            onClick={() => setOpenAdd(true)}
            className="app-btn-primary inline-flex items-center gap-1.5"
          >
            + Create First Quotation
          </button>
        </div>
      ) : (
        <div className="app-card p-0 overflow-hidden">
          <div className="app-table-container">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-[var(--color-surface-overlay)] dark:bg-neutral-900 text-[var(--color-text-secondary)] dark:text-neutral-400 text-left uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3 whitespace-nowrap">Quote #</th>
                  <th className="px-5 py-3 whitespace-nowrap">Customer</th>
                  <th className="px-5 py-3 whitespace-nowrap">Date</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Subtotal</th>
                  <th className="px-5 py-3 text-center whitespace-nowrap">Status</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] dark:divide-neutral-800">
                {filtered.map((q) => {
                  const cName = q.customerId ? customerMap.get(q.customerId) || q.customerName || 'Customer' : q.customerName || 'General Quote';
                  return (
                    <tr key={q.id} className="hover:bg-[var(--color-surface-overlay)]/50 transition">
                      <td className="px-5 py-3.5 font-mono font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {q.quotationNumber}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)] dark:text-white whitespace-nowrap">
                        {cName}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)] dark:text-neutral-400 whitespace-nowrap">
                        {formatDate(q.date || q.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-[var(--color-text-primary)] dark:text-white whitespace-nowrap">
                        ₹{q.subtotal.toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-center whitespace-nowrap">
                        <select
                          value={q.status || 'sent'}
                          onChange={(e) => handleStatusChange(q.id, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer outline-none ${
                            q.status === 'accepted'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : q.status === 'rejected'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                              : q.status === 'draft'
                              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700'
                              : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                          }`}
                        >
                          <option value="sent">Sent</option>
                          <option value="accepted">Accepted</option>
                          <option value="rejected">Rejected</option>
                          <option value="draft">Draft</option>
                        </select>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => printQuotationDocument(q)}
                          className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:underline cursor-pointer"
                        >
                          Print
                        </button>
                        <button
                          type="button"
                          onClick={() => del(q.id)}
                          className="text-red-500 text-xs font-semibold hover:underline cursor-pointer"
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
