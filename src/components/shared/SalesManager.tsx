import { useEffect, useState } from 'react';
import { db, type Sale, type Product, recalcCustomerBalance } from '../../lib/db';
import { generateId, calculateSubtotal, calculateTax, formatDate, blockDecimalKey, blockNegativeKey, sanitizeInteger, sanitizeAmount } from '../../lib/utils';
import { getNextSequenceNumber, recordSequenceUsed } from '../../lib/numbering';

export default function SalesManager() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<{ productId: string; qty: number | string }[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [amountPaid, setAmountPaid] = useState<number | string>('');

  const loadSales = () => {
    Promise.all([
      db.sales.toArray(),
      db.products.toArray(),
      db.customers.toArray(),
    ]).then(([s, p, c]) => {
      setSales(s.sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime()));
      setProducts(p.filter((x) => x.active !== false));
      setCustomers(c.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    });
  };

  useEffect(() => {
    loadSales();
    window.addEventListener('focus', loadSales);
    window.addEventListener('visibilitychange', loadSales);
    return () => {
      window.removeEventListener('focus', loadSales);
      window.removeEventListener('visibilitychange', loadSales);
    };
  }, []);

  function addLine() {
    setCart([...cart, { productId: products[0]?.id || '', qty: '' }]);
  }

  function updateLine(i: number, patch: Partial<{ productId: string; qty: number | string }>) {
    const next = [...cart];
    next[i] = { ...next[i], ...patch };
    setCart(next);
  }

  function subtotal() {
    return cart.reduce((s, l) => {
      const p = products.find((x) => x.id === l.productId);
      const qtyNum = Number(l.qty) || 0;
      return s + (p?.sellingPrice || 0) * qtyNum;
    }, 0);
  }

  async function completeSale() {
    const validCart = cart.filter((l) => l.productId && Number(l.qty) > 0);
    if (validCart.length === 0) {
      alert('Please add at least one product with a valid positive integer quantity.');
      return;
    }

    for (const line of validCart) {
      const p = products.find((x) => x.id === line.productId);
      if (p && p.type !== 'service') {
        const qtyNum = Number(line.qty) || 0;
        if (qtyNum > p.currentStock) {
          alert(`Cannot complete sale: Requested quantity (${qtyNum}) for "${p.name}" exceeds available inventory stock (${p.currentStock}).`);
          return;
        }
      }
    }

    const sub = subtotal();
    const tax = calculateTax(sub, 18);
    const total = sub + tax;
    const paid = amountPaid === '' ? total : Math.max(0, Number(amountPaid) || 0);
    const due = Math.max(0, Math.round((total - paid) * 100) / 100);
    const now = new Date().toISOString();

    const saleNumber = await getNextSequenceNumber('sale');
    const saleId = generateId();

    const sale: Sale = {
      id: saleId,
      saleNumber,
      customerId: customerId || undefined,
      date: now,
      subtotal: sub,
      taxAmount: tax,
      discountAmount: 0,
      total,
      amountPaid: paid,
      amountDue: due,
      paymentStatus: due <= 0.01 ? 'paid' : paid > 0 ? 'partial' : 'pending',
      paymentMethod: 'cash',
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    };

    await db.transaction('rw', [db.sales, db.saleItems, db.products, db.stockMovements, db.payments], async () => {
      await db.sales.put(sale);

      for (const line of validCart) {
        const p = products.find((x) => x.id === line.productId);
        const qtyNum = Number(line.qty) || 1;
        await db.saleItems.put({
          id: generateId(),
          saleId,
          productId: line.productId,
          productNameSnapshot: p?.name || 'Item',
          quantity: qtyNum,
          unitPrice: p?.sellingPrice || 0,
          discount: 0,
          taxRate: 18,
          total: (p?.sellingPrice || 0) * qtyNum,
          createdAt: now,
        });

        if (p && p.type !== 'service') {
          const newStock = Math.max(0, (p.currentStock || 0) - qtyNum);
          await db.products.update(p.id, {
            currentStock: newStock,
            updatedAt: now,
          });

          await db.stockMovements.add({
            id: generateId(),
            productId: p.id,
            type: 'out',
            quantity: qtyNum,
            reason: `Sale ${saleNumber}`,
            referenceType: 'sale',
            referenceId: saleId,
            date: now.split('T')[0],
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
          referenceType: 'sale',
          referenceId: saleId,
          customerId: customerId || undefined,
          amount: paid,
          date: now.split('T')[0],
          method: 'cash',
          direction: 'in',
          notes: `Payment for ${saleNumber}`,
          createdAt: now,
        });
      }
    });

    if (customerId) {
      await recalcCustomerBalance(customerId);
    }

    recordSequenceUsed('sale', saleNumber);

    setSales([sale, ...sales]);
    setCart([]);
    setCustomerId('');
    setAmountPaid('');

    // reload products to update local stock states
    const updatedProds = await db.products.toArray();
    setProducts(updatedProds.filter((x) => x.active !== false));
  }

  async function removeSale(id: string) {
    if (!window.confirm('Delete this sale record? Note: Inventory will not be automatically reverted.')) {
      return;
    }
    await db.sales.delete(id);
    setSales(sales.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* New Sale Card */}
      <div className="app-card space-y-4">
        <h2 className="text-base font-bold text-[var(--color-text-primary)] dark:text-white">
          Point of Sale / Quick Checkout
        </h2>

        {/* Customer Select */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
            Customer (Optional for Walk-in)
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="app-input"
          >
            <option value="">Walk-in Customer (No Account)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ''}
              </option>
            ))}
          </select>
        </div>

        {cart.length === 0 ? (
          <div className="pt-2">
            <button onClick={addLine} className="app-btn-primary">
              + Add Product Item
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider">
              Items in Cart
            </label>
            {cart.map((l, i) => {
              const p = products.find((x) => x.id === l.productId);
              return (
                <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 p-2 rounded-xl bg-[var(--color-surface)] dark:bg-neutral-900/50 border border-[var(--color-border)] dark:border-neutral-800">
                  <div className="flex-1 min-w-[200px] w-full sm:w-auto">
                    <select
                      value={l.productId}
                      onChange={(e) => updateLine(i, { productId: e.target.value })}
                      className="app-input w-full"
                    >
                      <option value="">Select product...</option>
                      {products.map((prod) => (
                        <option
                          key={prod.id}
                          value={prod.id}
                          disabled={prod.currentStock <= 0 && prod.type !== 'service'}
                        >
                          {prod.name} — ₹{prod.sellingPrice}
                          {prod.type !== 'service' ? ` (${prod.currentStock} in stock)` : ' (service)'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20 shrink-0">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={l.qty === 0 ? '' : l.qty}
                      onKeyDown={blockDecimalKey}
                      onChange={(e) => {
                        const clean = sanitizeInteger(e.target.value);
                        updateLine(i, { qty: clean === '' ? '' : parseInt(clean, 10) });
                      }}
                      className="app-input w-full text-center px-2"
                      placeholder="Qty"
                    />
                  </div>
                  <div className="min-w-[90px] text-right text-sm font-semibold text-[var(--color-text-primary)] dark:text-white shrink-0">
                    ₹{((p?.sellingPrice || 0) * (Number(l.qty) || 0)).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCart(cart.filter((_, idx) => idx !== i))}
                    className="text-xs text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--color-border)] dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <button onClick={addLine} className="app-btn-secondary">
                  + Add Line
                </button>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amountPaid === 0 ? '' : amountPaid}
                  onKeyDown={blockNegativeKey}
                  onChange={(e) => setAmountPaid(sanitizeAmount(e.target.value))}
                  placeholder="Amount Received (₹)"
                  className="app-input w-48"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="text-sm font-bold text-[var(--color-text-primary)] dark:text-white">
                  Total: <span className="text-lg text-indigo-600 dark:text-indigo-400">₹{subtotal().toFixed(2)}</span>
                </div>
                <button onClick={completeSale} className="app-btn-primary">
                  Complete Sale
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sales History */}
      {loading ? (
        <div className="py-12 text-center text-[var(--color-text-muted)]">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2"></div>
          <p className="text-sm">Loading sales...</p>
        </div>
      ) : sales.length === 0 ? (
        <div className="app-card p-10 text-center">
          <h3 className="text-base font-bold text-[var(--color-text-primary)] dark:text-white mb-1">
            No sales recorded yet
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] dark:text-neutral-400">
            Use the form above to record your first point-of-sale transaction.
          </p>
        </div>
      ) : (
        <div className="app-card p-0 overflow-hidden">
          <div className="app-table-container">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-[var(--color-surface-overlay)] dark:bg-neutral-900 text-[var(--color-text-secondary)] dark:text-neutral-400 text-left uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3 whitespace-nowrap">Sale #</th>
                  <th className="px-5 py-3 whitespace-nowrap">Date</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Total</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Paid</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Balance Due</th>
                  <th className="px-5 py-3 text-center whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] dark:divide-neutral-800">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--color-surface-overlay)]/50 transition">
                    <td className="px-5 py-3.5 font-mono font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {s.saleNumber}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)] dark:text-neutral-400 text-xs whitespace-nowrap">
                      {formatDate(s.date || s.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-[var(--color-text-primary)] dark:text-white whitespace-nowrap">
                      ₹{(Number(s.total) || 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                      ₹{(Number(s.amountPaid) || 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                      ₹{(Number(s.amountDue) || 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          s.paymentStatus === 'paid'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : s.paymentStatus === 'partial'
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {s.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
