import { useEffect, useState } from 'react';
import { db } from '../../lib/db';

export default function Reports() {
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      db.sales.toArray().then(s => s.sort((a,b) => b.createdAt.localeCompare(a.createdAt))),
      db.expenses.toArray(),
      db.payments.toArray(),
      db.products.toArray(),
      db.customers.toArray(),
    ]).then(([s, e, p, prod, c]) => { setSales(s); setExpenses(e); setPayments(p); setProducts(prod); setCustomers(c); });
  }, []);

  const totalSales = sales.reduce((s, x) => s + (x.total || 0), 0);
  const totalExpenses = expenses.reduce((s, x) => s + (x.amount || 0), 0);
  const profit = totalSales - totalExpenses;
  const received = payments.filter(p => p.direction === 'in').reduce((s, x) => s + (x.amount || 0), 0);

  const inputClass = 'w-full h-11 rounded-xl bg-[var(--color-surface-raised)] dark:bg-[#1a1a1a] border-2 border-[var(--color-border)] dark:border-neutral-700 px-4 text-sm text-[var(--color-text-primary)] dark:text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] dark:text-white">Reports</h1>
        <p className="text-base text-[var(--color-text-secondary)] dark:text-neutral-400 mt-2">Live business data from Dexie.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="rounded-2xl border-2 border-[var(--color-border)] dark:border-neutral-700 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-5 shadow-md"><div className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-muted)]">Total Sales</div><div className="text-2xl font-black text-[var(--color-text-primary)] dark:text-white mt-1">₹{totalSales.toFixed(2)}</div></div>
        <div className="rounded-2xl border-2 border-[var(--color-border)] dark:border-neutral-700 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-5 shadow-md"><div className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-muted)]">Expenses</div><div className="text-2xl font-black text-[var(--color-text-primary)] dark:text-white mt-1">₹{totalExpenses.toFixed(2)}</div></div>
        <div className="rounded-2xl border-2 border-[var(--color-border)] dark:border-neutral-700 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-5 shadow-md"><div className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-muted)]">Profit</div><div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{profit.toFixed(2)}</div></div>
        <div className="rounded-2xl border-2 border-[var(--color-border)] dark:border-neutral-700 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-5 shadow-md"><div className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-muted)]">Received</div><div className="text-2xl font-black text-[var(--color-text-primary)] dark:text-white mt-1">₹{received.toFixed(2)}</div></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border-2 border-[var(--color-border)] dark:border-neutral-700 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-6 shadow-md">
          <h3 className="font-bold text-[var(--color-text-primary)] dark:text-white mb-3">Sales by customer</h3>
          <table className="w-full text-sm"><thead className="text-[var(--color-text-muted)] dark:text-neutral-400 text-xs uppercase font-bold"><tr><th className="text-left py-2">Customer</th><th className="text-right py-2">Amount</th></tr></thead><tbody className="divide-y divide-[var(--color-border)] dark:divide-neutral-800">{customers.map(c => {
            const amt = sales.filter(s => s.customerId === c.id).reduce((sum, s) => sum + (s.total || 0), 0);
            return amt > 0 ? (<tr key={c.id}><td className="py-2 text-[var(--color-text-secondary)] dark:text-neutral-300">{c.name}</td><td className="py-2 text-right font-bold">₹{amt.toFixed(2)}</td></tr>) : null;
          })}</tbody></table>
        </div>
        <div className="rounded-2xl border-2 border-[var(--color-border)] dark:border-neutral-700 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-6 shadow-md">
          <h3 className="font-bold text-[var(--color-text-primary)] dark:text-white mb-3">Expenses by category</h3>
          <table className="w-full text-sm"><thead className="text-[var(--color-text-muted)] dark:text-neutral-400 text-xs uppercase font-bold"><tr><th className="text-left py-2">Category</th><th className="text-right py-2">Amount</th></tr></thead><tbody className="divide-y divide-[var(--color-border)] dark:divide-neutral-800">{expenses.map(e => (<tr key={e.id}><td className="py-2 text-[var(--color-text-secondary)] dark:text-neutral-300">{(e as any).category || 'General'}</td><td className="py-2 text-right font-bold">₹{(e.amount || 0).toFixed(2)}</td></tr>))}</tbody></table>
        </div>
      </div>
    </div>
  );
}
