import { useEffect, useState, useMemo } from 'react';
import { db, type Invoice, type Customer, type Product } from '../../lib/db';
import { generateId, formatDate, getTodayISO, blockDecimalKey, blockNegativeKey, sanitizeInteger, sanitizeAmount, sanitizePercentage } from '../../lib/utils';
import { getNextSequenceNumber, recordSequenceUsed } from '../../lib/numbering';
import { printInvoiceDocument } from '../../lib/documentPrinter';

export default function InvoiceManager() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    invoiceNo: '',
    date: getTodayISO(),
    dueDate: '',
    notes: '',
    paymentStatus: 'unpaid',
    paidAmount: '',
    items: [{ productId: '', qty: '', price: '', disc: '' }] as any,
  });

  const load = async () => {
    try {
      const [invs, c, p] = await Promise.all([
        db.invoices.toArray(),
        db.customers.toArray(),
        db.products.toArray(),
      ]);
      setItems(invs.sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime()));
      setCustomers(c.sort((a, b) => a.name.localeCompare(b.name)));
      setProducts(p.filter((x) => x.active !== false).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Failed to load invoices:', err);
    }
  };

  useEffect(() => {
    load();
    window.addEventListener('focus', load);
    window.addEventListener('visibilitychange', load);
    return () => {
      window.removeEventListener('focus', load);
      window.removeEventListener('visibilitychange', load);
    };
  }, []);

  const filtered = useMemo(() => {
    let res = items;
    if (filter) {
      const q = filter.toLowerCase().trim();
      res = res.filter(
        (i) =>
          (i.invoiceNo || '').toLowerCase().includes(q) ||
          (i.customerName || '').toLowerCase().includes(q) ||
          i.status.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      res = res.filter((i) => i.status === statusFilter);
    }
    return res;
  }, [items, filter, statusFilter]);

  async function save() {
    const now = new Date().toISOString();
    const customer = customers.find((c) => c.id === form.customerId);
    const validItems = form.items.filter(
      (it: any) => it.productId || (Number(it.qty) > 0 && Number(it.price) > 0)
    );
    const itemsToSave = validItems.length > 0 ? validItems : form.items;
    const invItems = itemsToSave.map((it: any) => {
      const prod = products.find((p) => p.id === it.productId);
      const qty = Number(it.qty) || 1;
      const price = Number(it.price) || (prod ? prod.sellingPrice : 0);
      const disc = Number(it.disc) || 0;
      const amount = qty * price * (1 - disc / 100);
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
        amount,
      };
    });

    const subtotal = invItems.reduce((s: number, it: any) => s + it.amount, 0);
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + tax;

    const paid =
      form.paymentStatus === 'paid'
        ? total
        : form.paymentStatus === 'partial'
        ? Number(form.paidAmount) || 0
        : 0;

    const due = Math.max(0, total - paid);
    const status = due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'pending';

    const invoiceNo = form.invoiceNo.trim() || (await getNextSequenceNumber('invoice'));
    recordSequenceUsed('invoice', invoiceNo);

    const custAddress = customer
      ? [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')
      : '';

    const record: Invoice = {
      id: generateId(),
      invoiceNo,
      invoiceNumber: invoiceNo,
      customerId: form.customerId || '',
      customerName: customer ? customer.name : 'Walk-in Customer',
      customerAddress: custAddress,
      customerGstin: customer?.gstin || '',
      date: form.date || getTodayISO(),
      status,
      subtotal,
      tax,
      total,
      paidAmount: paid,
      dueAmount: due,
      dueDate: form.dueDate || getTodayISO(),
      notes: form.notes.trim(),
      items: invItems,
      createdAt: now,
      updatedAt: now,
    } as any;

    await db.invoices.put(record);
    setForm({
      customerId: '',
      invoiceNo: '',
      date: getTodayISO(),
      dueDate: '',
      notes: '',
      paymentStatus: 'unpaid',
      paidAmount: '',
      items: [{ productId: '', qty: '', price: '', disc: '' }],
    });
    setOpenAdd(false);
    load();
  }

  async function handleStatusChange(invoiceId: string, newStatus: string) {
    const now = new Date().toISOString();
    const inv = await db.invoices.get(invoiceId);
    if (!inv) return;

    let newPaid = inv.paidAmount || 0;
    let newDue = inv.dueAmount !== undefined ? inv.dueAmount : inv.total;

    if (newStatus === 'paid') {
      newPaid = inv.total;
      newDue = 0;
    } else if (newStatus === 'unpaid' || newStatus === 'pending') {
      newPaid = 0;
      newDue = inv.total;
    }

    await db.invoices.update(invoiceId, {
      status: newStatus as any,
      paidAmount: newPaid,
      dueAmount: newDue,
      updatedAt: now,
    });

    if (inv.saleId) {
      const sale = await db.sales.get(inv.saleId);
      if (sale) {
        const sPaid = newStatus === 'paid' ? sale.total : newStatus === 'unpaid' || newStatus === 'pending' ? 0 : sale.amountPaid;
        const sDue = Math.max(0, Math.round(((sale.total || 0) - sPaid) * 100) / 100);
        const sStatus: 'paid' | 'partial' | 'pending' =
          sDue <= 0.01 ? 'paid' : sPaid > 0 ? 'partial' : 'pending';
        await db.sales.update(sale.id, {
          amountPaid: sPaid,
          amountDue: sDue,
          paymentStatus: sStatus,
          updatedAt: now,
        });
      }
    }

    load();
  }

  const addItem = () => {
    setForm((prev: any) => ({
      ...prev,
      items: [...prev.items, { productId: '', qty: '', price: '', disc: '' }],
    }));
  };

  const removeItem = (idx: number) => {
    if (form.items.length <= 1) {
      setForm((prev: any) => ({
        ...prev,
        items: [{ productId: '', qty: '', price: '', disc: '' }],
      }));
      return;
    }
    setForm((prev: any) => ({
      ...prev,
      items: prev.items.filter((_: any, i: number) => i !== idx),
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

    // Auto-append a new empty row if user is filling the last row
    const isLast = idx === arr.length - 1;
    const hasContent = arr[idx].productId || arr[idx].qty || arr[idx].price;
    if (isLast && hasContent) {
      arr.push({ productId: '', qty: '', price: '', disc: '' });
    }

    setForm((prev: any) => ({ ...prev, items: arr }));
  };

  async function del(id: string) {
    if (!window.confirm('Delete this invoice?')) return;
    await db.invoices.delete(id);
    load();
  }

  const invoiceFormSubtotal = form.items.reduce((s: number, it: any) => {
    const prod = products.find((p) => p.id === it.productId);
    const q = Number(it.qty) || 0;
    const pr = Number(it.price) || (prod ? prod.sellingPrice : 0);
    const d = Number(it.disc) || 0;
    return s + q * pr * (1 - d / 100);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-between">
        <div className="flex-1 flex gap-2">
          <div className="flex-1 relative">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search invoices by number or customer..."
              className="app-input app-search-input pl-11"
            />
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
            </svg>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="app-input w-auto min-w-[130px]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <a href="/tools/invoice-generator" className="app-btn-secondary">
            Invoice Generator
          </a>
          <button
            onClick={async () => {
              const nextState = !openAdd;
              setOpenAdd(nextState);
              if (nextState) {
                const nextNo = await getNextSequenceNumber('invoice');
                setForm({
                  customerId: '',
                  invoiceNo: nextNo,
                  date: getTodayISO(),
                  dueDate: getTodayISO(),
                  notes: '',
                  paymentStatus: 'unpaid',
                  paidAmount: '',
                  items: [{ productId: '', qty: '', price: '', disc: '' }],
                });
              }
            }}
            className="app-btn-primary"
          >
            {openAdd ? '✕ Close' : '+ Create Invoice'}
          </button>
        </div>
      </div>

      {/* Add Invoice Form */}
      {openAdd && (
        <div className="app-card space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] dark:border-neutral-800 pb-3">
            <h2 className="text-base font-bold text-[var(--color-text-primary)] dark:text-white">
              Create New Invoice
            </h2>
            <button
              onClick={() => setOpenAdd(false)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                Invoice Number
              </label>
              <input
                className="app-input"
                placeholder="INV-..."
                value={form.invoiceNo}
                onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Invoice Date
              </label>
              <input
                className="app-input"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Due Date
              </label>
              <input
                className="app-input"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                Payment Status
              </label>
              <select
                className="app-input"
                value={form.paymentStatus}
                onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
              >
                <option value="unpaid">Unpaid / Pending</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
              </select>
            </div>
            {form.paymentStatus === 'partial' && (
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Amount Paid (₹)
                </label>
                <input
                  className="app-input"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Amount Paid (₹)"
                  value={form.paidAmount === 0 ? '' : form.paidAmount}
                  onKeyDown={blockNegativeKey}
                  onChange={(e) => setForm({ ...form, paidAmount: sanitizeAmount(e.target.value) })}
                />
              </div>
            )}
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
                Subtotal: <span className="text-indigo-600 dark:text-indigo-400 font-bold">₹{invoiceFormSubtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
              Notes
            </label>
            <textarea
              className="app-input resize-y min-h-[60px]"
              placeholder="Payment terms, bank details, delivery notes..."
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
              Save Invoice
            </button>
          </div>
        </div>
      )}

      {/* Invoices List */}
      {filtered.length > 0 ? (
        <div className="app-card p-0 overflow-hidden">
          <div className="app-table-container">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-[var(--color-surface-overlay)] dark:bg-neutral-900 text-[var(--color-text-secondary)] dark:text-neutral-400 text-left uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3 whitespace-nowrap">Invoice No</th>
                  <th className="px-5 py-3 whitespace-nowrap">Date</th>
                  <th className="px-5 py-3 whitespace-nowrap">Customer</th>
                  <th className="px-5 py-3 whitespace-nowrap">Status</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Total</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] dark:divide-neutral-800">
                {filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-[var(--color-surface-overlay)]/50 transition">
                    <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)] dark:text-white whitespace-nowrap">
                      {i.invoiceNo || (i as any).invoiceNumber}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)] dark:text-neutral-400 whitespace-nowrap">
                      {formatDate((i as any).date || i.createdAt || i.dueDate)}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)] dark:text-neutral-300 whitespace-nowrap">
                      {i.customerName || '—'}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <select
                        value={i.status}
                        onChange={(e) => handleStatusChange(i.id, e.target.value)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer outline-none ${
                          i.status === 'paid'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : i.status === 'partial'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                            : i.status === 'draft' || i.status === 'sent'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                        }`}
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-[var(--color-text-primary)] dark:text-white whitespace-nowrap">
                      ₹{i.total.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => printInvoiceDocument(i)}
                        className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:underline cursor-pointer"
                      >
                        Print
                      </button>
                      <button
                        type="button"
                        onClick={() => del(i.id)}
                        className="text-red-500 text-xs font-semibold hover:underline cursor-pointer"
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
      ) : (
        <div className="app-card p-10 text-center">
          <h3 className="text-base font-bold text-[var(--color-text-primary)] dark:text-white mb-1">
            No invoices yet
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] dark:text-neutral-400">
            Create your first invoice above to start billing customers.
          </p>
        </div>
      )}
    </div>
  );
}
