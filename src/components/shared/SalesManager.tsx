import { useEffect, useState } from 'react';
import { db, type Sale, type Product } from '../../lib/db';
import { generateId, calculateSubtotal, calculateTax } from '../../lib/utils';

export default function SalesManager() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<{ productId: string; qty: number }[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [amountPaid, setAmountPaid] = useState(0);

  useEffect(() => {
    Promise.all([db.sales.toArray(), db.products.toArray(), db.customers.toArray()]).then(
      ([s, p, c]) => { setSales(s); setProducts(p.filter((x) => x.active !== false)); setCustomers(c); setLoading(false); }
    );
  }, []);

  function addLine() { setCart([...cart, { productId: products[0]?.id || '', qty: 1 }]); }
  function updateLine(i: number, patch: Partial<{ productId: string; qty: number }>) {
    setCart(cart.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }

  function subtotal() {
    return calculateSubtotal(cart.map((l) => {
      const p = products.find((x) => x.id === l.productId);
      return { qty: l.qty, price: p?.sellingPrice || 0 };
    }));
  }

  async function completeSale() {
    if (cart.length === 0 || !cart[0].productId) return;
    const now = new Date().toISOString();
    const sub = subtotal();
    const saleNumber = `S-${Date.now().toString().slice(-6)}`;
    const total = sub;
    const due = Math.max(0, total - amountPaid);

    const sale: Sale = {
      id: generateId(), saleNumber, customerId: customerId || undefined, date: now,
      subtotal: sub, discount: 0, tax: 0, total, amountPaid,
      amountDue: due, paymentStatus: due <= 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'pending',
      paymentMethod: amountPaid > 0 ? 'cash' : undefined, createdAt: now, updatedAt: now,
    };

    await db.transaction('rw', db.sales, db.saleItems, db.products, db.payments, async () => {
      await db.sales.put(sale);
      for (const l of cart) {
        const p = products.find((x) => x.id === l.productId);
        if (!p) continue;
        await db.saleItems.put({ id: generateId(), saleId: sale.id, productId: p.id, productNameSnapshot: p.name, quantity: l.qty, unitPrice: p.sellingPrice, discount: 0, taxRate: p.taxRate, taxAmount: calculateTax(p.sellingPrice * l.qty, p.taxRate), total: p.sellingPrice * l.qty, costPriceSnapshot: p.purchasePrice });
        if (p.type !== 'service') await db.products.update(p.id, { currentStock: p.currentStock - l.qty, updatedAt: now });
      }
      if (amountPaid > 0) await db.payments.put({ id: generateId(), referenceType: 'sale', referenceId: sale.id, customerId: customerId || undefined, amount: amountPaid, date: now, method: 'cash', direction: 'in', createdAt: now });
    });

    setSales((prev) => [sale, ...prev]); setCart([]); setAmountPaid(0); setCustomerId('');
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-neutral-950 p-5">
        <h2 className="font-semibold mb-3">New sale</h2>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full bg-[var(--color-surface-overlay)] dark:bg-neutral-900 border border-[var(--color-border)] dark:border-neutral-800 rounded-[6px] px-3 py-2 text-sm mb-3">
          <option value="">Walk-in customer</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {cart.length === 0 && (
          <button onClick={addLine} className="px-4 py-2 bg-white text-black rounded-[6px] text-sm font-medium">+ Add product line</button>
        )}
        {cart.map((l, i) => {
          const p = products.find((x) => x.id === l.productId);
          return (
            <div key={i} className="flex flex-col sm:flex-row gap-2 mb-2">
              <select value={l.productId} onChange={(e) => updateLine(i, { productId: e.target.value })} className="flex-1 bg-[var(--color-surface-overlay)] dark:bg-neutral-900 border border-[var(--color-border)] dark:border-neutral-800 rounded-[6px] px-3 py-2 text-sm">
                <option value="">Select product</option>
                {products.map((p) => <option key={p.id} value={p.id} disabled={p.currentStock <= 0 && p.type !== 'service'}>{p.name} — ₹{p.sellingPrice}{p.type !== 'service' ? ` (${p.currentStock} in stock)` : ' (service)'}</option>)}
              </select>
              <input type="number" min="1" value={l.qty} onChange={(e) => updateLine(i, { qty: Number(e.target.value) || 1 })} className="w-20 bg-[var(--color-surface-overlay)] dark:bg-neutral-900 border border-[var(--color-border)] dark:border-neutral-800 rounded-[6px] px-3 py-2 text-sm" />
              <span className="text-sm text-[var(--color-text-primary)] dark:text-neutral-300 self-center">= ₹{((p?.sellingPrice || 0) * l.qty).toFixed(2)}</span>
              <button onClick={() => setCart(cart.filter((_, idx) => idx !== i))} className="text-[var(--color-text-muted)] dark:text-neutral-500 hover:text-red-400 text-sm self-center">Remove</button>
            </div>
          );
        })}
        {cart.length > 0 && (
          <div className="flex items-center gap-3 mt-3">
            <button onClick={addLine} className="px-3 py-1.5 border border-[var(--color-border)] dark:border-neutral-700 rounded-[6px] text-xs text-[var(--color-text-primary)] dark:text-neutral-300 hover:bg-[var(--color-surface-overlay)] dark:bg-neutral-900">+ Line</button>
            <input type="number" min="0" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value) || 0)} placeholder="Received" className="w-28 bg-[var(--color-surface-overlay)] dark:bg-neutral-900 border border-[var(--color-border)] dark:border-neutral-800 rounded-[6px] px-3 py-2 text-sm" />
            <span className="text-sm text-[var(--color-text-primary)] dark:text-neutral-300">Total: <span className="text-[var(--color-text-primary)] dark:text-white font-semibold">₹{subtotal().toFixed(2)}</span></span>
            <button onClick={completeSale} className="ml-auto px-4 py-2 bg-white text-black rounded-[6px] text-sm font-medium hover:bg-neutral-200">Complete sale</button>
          </div>
        )}
      </div>

      {loading ? <p className="text-[var(--color-text-muted)] dark:text-neutral-500 text-sm">Loading…</p> : (
        <div className="rounded-xl border border-[var(--color-border)] dark:border-neutral-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-overlay)] dark:bg-neutral-900 text-[var(--color-text-secondary)] dark:text-neutral-400 text-left">
              <tr><th className="px-4 py-2 font-medium">Number</th><th className="px-4 py-2 font-medium">Date</th><th className="px-4 py-2 text-right font-medium">Total</th><th className="px-4 py-2 text-right font-medium">Paid</th><th className="px-4 py-2 text-right font-medium">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {sales.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-[var(--color-text-primary)] dark:text-white">{s.saleNumber}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)] dark:text-neutral-400">{new Date(s.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right text-neutral-200">₹{s.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-[var(--color-text-secondary)] dark:text-neutral-400">₹{s.amountPaid.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right"><span className="text-xs bg-neutral-800 text-neutral-200 px-2 py-0.5 rounded-full">{s.paymentStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
