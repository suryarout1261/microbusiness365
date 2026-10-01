import { useEffect, useState, useMemo } from 'react';
import { db, type Purchase, type Supplier, type Product, type PurchaseItem, recalcSupplierBalance } from '../../lib/db';
import { generateId, formatDate, blockDecimalKey, blockNegativeKey, sanitizeInteger, sanitizeAmount, sanitizePercentage } from '../../lib/utils';
import { getNextSequenceNumber, recordSequenceUsed } from '../../lib/numbering';

export default function PurchaseManager() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [filter, setFilter] = useState('');
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);

  const [form, setForm] = useState({
    supplierId: '',
    date: new Date().toISOString().split('T')[0],
    items: [{ productId: '', quantity: '' as any, price: '' as any, discount: '' as any }],
    amountPaid: '' as any,
    paymentMethod: 'cash',
    notes: '',
  });

  const load = async () => {
    try {
      const [pur, sup, prod, items] = await Promise.all([
        db.purchases.toArray(),
        db.suppliers.toArray(),
        db.products.toArray(),
        db.purchaseItems.toArray(),
      ]);

      setPurchases(
        pur.sort(
          (a, b) =>
            new Date(b.createdAt || b.date || 0).getTime() -
            new Date(a.createdAt || a.date || 0).getTime()
        )
      );
      setSuppliers(sup.sort((a, b) => a.name.localeCompare(b.name)));
      setProducts(
        prod
          .filter((p) => p.active !== false)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setPurchaseItems(items);
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setLoading(false);
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

  const calculateItemTotal = (quantity: number, price: number, discount: number) => {
    const qty = Number(quantity) || 0;
    const prc = Number(price) || 0;
    const disc = Number(discount) || 0;
    return qty * prc * (1 - disc / 100);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    form.items.forEach((item) => {
      subtotal += calculateItemTotal(item.quantity, item.price, item.discount);
    });
    const tax = Math.round(subtotal * 0.18 * 100) / 100; // 18% standard GST
    const total = Math.round((subtotal + tax) * 100) / 100;
    return { subtotal, tax, total };
  };

  const supplierMap = useMemo(() => {
    return new Map(suppliers.map((s) => [s.id, s.name]));
  }, [suppliers]);

  const productMap = useMemo(() => {
    return new Map(products.map((p) => [p.id, p]));
  }, [products]);

  const filteredPurchases = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return purchases;
    return purchases.filter((p) => {
      const supName = (p.supplierId ? supplierMap.get(p.supplierId) : '') || '';
      return (
        p.purchaseNumber.toLowerCase().includes(q) ||
        supName.toLowerCase().includes(q) ||
        (p.notes || '').toLowerCase().includes(q) ||
        p.paymentStatus.toLowerCase().includes(q)
      );
    });
  }, [purchases, filter, supplierMap]);

  async function handleSave() {
    if (!form.supplierId) {
      alert('Please select a supplier.');
      return;
    }
    const validItems = form.items.filter((item) => item.productId && item.quantity > 0);
    if (validItems.length === 0) {
      alert('Please add at least one product with quantity greater than 0.');
      return;
    }

    const now = new Date().toISOString();
    const { subtotal, tax, total } = calculateTotals();
    const paid = Math.min(total, Math.max(0, Number(form.amountPaid) || 0));
    const due = Math.max(0, Math.round((total - paid) * 100) / 100);
    const paymentStatus: 'paid' | 'partial' | 'pending' =
      due <= 0.01 ? 'paid' : paid > 0 ? 'partial' : 'pending';

    const purchaseId = generateId();
    const purchaseNumber = await getNextSequenceNumber('purchase');
    recordSequenceUsed('purchase', purchaseNumber);

    const newPurchase: Purchase = {
      id: purchaseId,
      purchaseNumber,
      date: form.date || now.split('T')[0],
      supplierId: form.supplierId,
      subtotal,
      discount: 0,
      tax,
      total,
      amountPaid: paid,
      amountDue: due,
      paymentStatus,
      notes: form.notes.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await db.transaction('rw', [db.purchases, db.purchaseItems, db.products, db.stockMovements, db.payments], async () => {
      await db.purchases.put(newPurchase);

      for (const item of validItems) {
        const prod = productMap.get(item.productId);
        const itemTot = calculateItemTotal(item.quantity, item.price, item.discount);
        await db.purchaseItems.put({
          id: generateId(),
          purchaseId,
          productId: item.productId,
          productNameSnapshot: prod?.name || 'Product',
          quantity: Number(item.quantity),
          unitPrice: Number(item.price),
          discount: Number(item.discount),
          taxRate: 18,
          total: itemTot,
          createdAt: now,
        });

        if (prod && prod.type !== 'service') {
          const newStock = (prod.currentStock || 0) + Number(item.quantity);
          await db.products.update(prod.id, {
            currentStock: newStock,
            purchasePrice: Number(item.price) > 0 ? Number(item.price) : prod.purchasePrice,
            updatedAt: now,
          });

          await db.stockMovements.add({
            id: generateId(),
            productId: prod.id,
            type: 'in',
            quantity: Number(item.quantity),
            reason: `Purchase ${purchaseNumber}`,
            referenceType: 'purchase',
            referenceId: purchaseId,
            date: form.date || now.split('T')[0],
            createdAt: now,
          });
        }
      }

      if (paid > 0) {
        const paymentNo = await getNextSequenceNumber('payment');
        recordSequenceUsed('payment', paymentNo);
        await db.payments.put({
          id: generateId(),
          paymentNumber: paymentNo,
          referenceType: 'purchase',
          referenceId: purchaseId,
          supplierId: form.supplierId,
          amount: paid,
          date: form.date || now.split('T')[0],
          method: form.paymentMethod || 'cash',
          direction: 'out',
          notes: `Payment for ${purchaseNumber}`,
          createdAt: now,
        });
      }
    });

    if (form.supplierId) {
      await recalcSupplierBalance(form.supplierId);
    }

    setOpenForm(false);
    setForm({
      supplierId: '',
      date: new Date().toISOString().split('T')[0],
      items: [{ productId: '', quantity: '' as any, price: '' as any, discount: '' as any }],
      amountPaid: '' as any,
      paymentMethod: 'cash',
      notes: '',
    });
    load();
  }

  async function handleRemove(p: Purchase) {
    if (!window.confirm(`Are you sure you want to delete purchase ${p.purchaseNumber}? Product stocks will be adjusted.`)) {
      return;
    }

    const itemsToDelete = await db.purchaseItems.where('purchaseId').equals(p.id).toArray();

    await db.transaction('rw', [db.purchases, db.purchaseItems, db.products, db.stockMovements, db.payments], async () => {
      // Revert product inventory
      for (const item of itemsToDelete) {
        const prod = await db.products.get(item.productId);
        if (prod && prod.type !== 'service') {
          const newStock = Math.max(0, (prod.currentStock || 0) - item.quantity);
          await db.products.update(prod.id, {
            currentStock: newStock,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      await db.stockMovements.where({ referenceType: 'purchase', referenceId: p.id }).delete();
      await db.purchaseItems.where('purchaseId').equals(p.id).delete();
      await db.payments.where({ referenceType: 'purchase', referenceId: p.id }).delete();
      await db.purchases.delete(p.id);
    });

    if (p.supplierId) {
      await recalcSupplierBalance(p.supplierId);
    }

    load();
  }

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { productId: '', quantity: '' as any, price: '' as any, discount: '' as any }],
    });
  };

  const removeItem = (index: number) => {
    if (form.items.length <= 1) return;
    const newItems = [...form.items];
    newItems.splice(index, 1);
    setForm({ ...form, items: newItems });
  };

  const handleItemChange = (index: number, field: keyof typeof form.items[0], value: string | number) => {
    const newItems = [...form.items];
    const target = { ...newItems[index], [field]: value };
    if (field === 'productId') {
      const prod = productMap.get(value as string);
      if (prod) {
        target.price = prod.purchasePrice || 0;
      }
    }
    newItems[index] = target;
    setForm({ ...form, items: newItems });
  };

  // Metrics
  const totalAmount = purchases.reduce((s, p) => s + (p.total || 0), 0);
  const totalPaid = purchases.reduce((s, p) => s + (p.amountPaid || 0), 0);
  const totalDue = purchases.reduce((s, p) => s + (p.amountDue || 0), 0);

  const inputClass = 'app-input';
  const btnPrimary = 'app-btn-primary';
  const btnSecondary = 'app-btn-secondary';

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Total Purchases
          </div>
          <div className="text-2xl font-black text-[var(--color-text-primary)] dark:text-white mt-1">
            ₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[var(--color-text-secondary)] dark:text-neutral-400 mt-1">
            {purchases.length} orders recorded
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Amount Paid
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[var(--color-text-secondary)] dark:text-neutral-400 mt-1">
            Settled to suppliers
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Balance Due
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            ₹{totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[var(--color-text-secondary)] dark:text-neutral-400 mt-1">
            Outstanding payables
          </div>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-between">
        <div className="flex-1 relative">
          <input
            className="app-input app-search-input pl-11"
            placeholder="Search purchases by PO number, supplier, or notes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
          </svg>
        </div>
        <button onClick={() => setOpenForm(!openForm)} className={btnPrimary}>
          {openForm ? '✕ Close Form' : '+ New Purchase Order'}
        </button>
      </div>

      {/* New Purchase Form Modal/Card */}
      {openForm && (
        <div className="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#121212] p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] dark:border-neutral-800 pb-3">
            <h2 className="font-bold text-lg text-[var(--color-text-primary)] dark:text-white">
              Create Purchase Order
            </h2>
            <button
              onClick={() => setOpenForm(false)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                Supplier *
              </label>
              <select
                value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                className={inputClass}
              >
                <option value="">Select a supplier...</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} {supplier.phone ? `(${supplier.phone})` : ''}
                  </option>
                ))}
              </select>
              {suppliers.length === 0 && (
                <p className="text-xs text-amber-500 mt-1">No suppliers found. Please add a supplier first under Suppliers tab.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                Order Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] dark:text-white uppercase tracking-wider">
                Order Line Items
              </h3>
              <button
                type="button"
                onClick={addItem}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                + Add Another Item
              </button>
            </div>

            <div className="app-table-container rounded-xl border border-[var(--color-border)] dark:border-neutral-800">
              <table className="w-full text-sm min-w-[550px]">
                <thead className="bg-[var(--color-surface-overlay)] dark:bg-neutral-900 text-[var(--color-text-secondary)] dark:text-neutral-400 text-left text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2.5 whitespace-nowrap">Product</th>
                    <th className="px-3 py-2.5 w-24 text-center whitespace-nowrap">Qty</th>
                    <th className="px-3 py-2.5 w-28 text-center whitespace-nowrap">Price (₹)</th>
                    <th className="px-3 py-2.5 w-24 text-center whitespace-nowrap">Disc (%)</th>
                    <th className="px-3 py-2.5 w-28 text-right whitespace-nowrap">Amount (₹)</th>
                    <th className="px-3 py-2.5 w-12 text-center whitespace-nowrap"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] dark:divide-neutral-800">
                  {form.items.map((item, index) => {
                    const lineTot = calculateItemTotal(item.quantity, item.price, item.discount);
                    return (
                      <tr key={index} className="bg-[var(--color-surface-raised)] dark:bg-[#111111]">
                        <td className="p-2">
                          <select
                            value={item.productId}
                            onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                            className={inputClass}
                          >
                            <option value="">Select product...</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} (Stock: {product.currentStock} {product.unit})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onKeyDown={blockDecimalKey}
                            onChange={(e) => {
                              const clean = sanitizeInteger(e.target.value);
                              handleItemChange(index, 'quantity', clean === '' ? '' : Math.max(1, parseInt(clean, 10)));
                            }}
                            placeholder="Qty"
                            className={inputClass + ' text-center'}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.price === 0 ? '' : item.price}
                            onKeyDown={blockNegativeKey}
                            onChange={(e) => handleItemChange(index, 'price', e.target.value === '' ? '' : sanitizeAmount(e.target.value))}
                            placeholder="Price (₹)"
                            className={inputClass + ' text-center'}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={item.discount === 0 ? '' : item.discount}
                            onKeyDown={blockNegativeKey}
                            onChange={(e) => handleItemChange(index, 'discount', e.target.value === '' ? '' : sanitizePercentage(e.target.value))}
                            placeholder="Disc (%)"
                            className={inputClass + ' text-center'}
                          />
                        </td>
                        <td className="p-2 text-right font-semibold text-[var(--color-text-primary)] dark:text-white">
                          ₹{lineTot.toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            disabled={form.items.length <= 1}
                            className="text-[var(--color-text-muted)] hover:text-red-500 disabled:opacity-30 text-base"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Initial Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Order Notes / Shipping Info
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Delivery terms, invoice/challan numbers, tracking..."
                  rows={3}
                  className={inputClass + ' resize-y'}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                    Amount Paid Now (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Amount Paid (₹)"
                    value={form.amountPaid === 0 ? '' : form.amountPaid}
                    onKeyDown={blockNegativeKey}
                    onChange={(e) => setForm({ ...form, amountPaid: e.target.value === '' ? '' : sanitizeAmount(e.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className={inputClass}
                    disabled={Number(form.amountPaid) <= 0}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / QR</option>
                    <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="card">Debit/Credit Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-overlay)] dark:bg-neutral-900/60 p-4 flex flex-col justify-between">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[var(--color-text-secondary)] dark:text-neutral-400">
                  <span>Subtotal</span>
                  <span className="font-medium">₹{calculateTotals().subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[var(--color-text-secondary)] dark:text-neutral-400">
                  <span>Estimated Tax (GST 18%)</span>
                  <span className="font-medium">₹{calculateTotals().tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[var(--color-text-primary)] dark:text-white pt-2 border-t border-[var(--color-border)] dark:border-neutral-800">
                  <span>Grand Total</span>
                  <span className="text-xl text-indigo-600 dark:text-indigo-400">₹{calculateTotals().total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-[var(--color-text-muted)] pt-1">
                  <span>Paid now: ₹{(Number(form.amountPaid) || 0).toFixed(2)}</span>
                  <span>Balance due: ₹{Math.max(0, calculateTotals().total - (Number(form.amountPaid) || 0)).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setOpenForm(false)} className={btnSecondary}>
                  Cancel
                </button>
                <button type="button" onClick={handleSave} className={btnPrimary}>
                  Save Purchase Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchases List */}
      {loading ? (
        <div className="py-12 text-center text-[var(--color-text-muted)]">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2"></div>
          <p className="text-sm">Loading purchase records...</p>
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-10 text-center">
          <p className="text-base font-semibold text-[var(--color-text-primary)] dark:text-white mb-1">
            {purchases.length === 0 ? 'No purchase orders recorded yet' : 'No matching purchase orders'}
          </p>
          <p className="text-sm text-[var(--color-text-muted)] dark:text-neutral-400 mb-4">
            {purchases.length === 0
              ? 'Record incoming vendor deliveries to automatically update product inventory and track costs.'
              : 'Try searching with a different PO number or supplier name.'}
          </p>
          {purchases.length === 0 && (
            <button onClick={() => setOpenForm(true)} className={btnPrimary}>
              + Add First Purchase
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 overflow-hidden bg-[var(--color-surface-raised)] dark:bg-[#111111] shadow-sm">
          <div className="app-table-container">
            <table className="w-full text-sm min-w-[850px]">
              <thead className="bg-[var(--color-surface-overlay)] dark:bg-neutral-900 text-[var(--color-text-secondary)] dark:text-neutral-400 text-left text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">PO Number</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Supplier</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Total</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Paid</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Balance Due</th>
                  <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] dark:divide-neutral-800">
                {filteredPurchases.map((p) => {
                  const isExpanded = expandedPurchaseId === p.id;
                  const itemsForThis = purchaseItems.filter((it) => it.purchaseId === p.id);
                  const supName = p.supplierId ? supplierMap.get(p.supplierId) : 'Unknown Vendor';

                  return (
                    <tr key={p.id} className="group hover:bg-[var(--color-surface-overlay)]/40 transition">
                      <td className="px-4 py-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {p.purchaseNumber}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-[var(--color-text-primary)] dark:text-white whitespace-nowrap max-w-[200px] truncate">
                        {supName || 'Walk-in Vendor'}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[var(--color-text-secondary)] dark:text-neutral-400 whitespace-nowrap">
                        {formatDate(p.date || p.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-[var(--color-text-primary)] dark:text-white whitespace-nowrap">
                        ₹{p.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                        ₹{(p.amountPaid || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                        ₹{(p.amountDue || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                            p.paymentStatus === 'paid'
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                              : p.paymentStatus === 'partial'
                              ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                              : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                          }`}
                        >
                          {p.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => setExpandedPurchaseId(isExpanded ? null : p.id)}
                          className="px-2.5 py-1 text-xs rounded-lg border border-[var(--color-border)] dark:border-neutral-700 hover:bg-[var(--color-surface-overlay)] dark:hover:bg-neutral-800 text-[var(--color-text-secondary)] dark:text-neutral-300 font-medium transition cursor-pointer"
                        >
                          {isExpanded ? 'Hide' : 'Items'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(p)}
                          className="px-2.5 py-1 text-xs rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium transition cursor-pointer"
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

          {/* Render Expanded details below table row or inside interactive block */}
          {expandedPurchaseId && (
            <div className="px-6 py-4 bg-[var(--color-surface-overlay)]/70 dark:bg-neutral-900/80 border-t border-[var(--color-border)] dark:border-neutral-800 text-xs">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Ordered Items for {purchases.find((x) => x.id === expandedPurchaseId)?.purchaseNumber}:
                </h4>
                <button
                  onClick={() => setExpandedPurchaseId(null)}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                >
                  ✕ Close Details
                </button>
              </div>
              {purchaseItems.filter((it) => it.purchaseId === expandedPurchaseId).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {purchaseItems
                    .filter((it) => it.purchaseId === expandedPurchaseId)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#111]"
                      >
                        <div className="font-bold text-[var(--color-text-primary)] dark:text-white">
                          {item.productNameSnapshot}
                        </div>
                        <div className="text-[var(--color-text-secondary)] dark:text-neutral-400 mt-1">
                          Qty: <strong>{item.quantity}</strong> × ₹{item.unitPrice} (Disc: {item.discount}%)
                        </div>
                        <div className="text-right font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                          ₹{item.total.toFixed(2)}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-[var(--color-text-muted)] italic">No item snapshots found for this order.</p>
              )}
              {purchases.find((x) => x.id === expandedPurchaseId)?.notes && (
                <p className="mt-2 text-[var(--color-text-muted)]">
                  <strong>Notes:</strong> {purchases.find((x) => x.id === expandedPurchaseId)?.notes}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}