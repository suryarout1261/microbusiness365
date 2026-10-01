import { useEffect, useState } from 'react';
import { db } from '../../lib/db';

export default function Reports() {
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      db.sales.toArray().then(s => s.sort((a,b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime())),
      db.expenses.toArray().then(e => e.sort((a,b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime())),
      db.payments.toArray().then(p => p.sort((a,b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime())),
      db.products.toArray(),
      db.customers.toArray(),
    ]).then(([s, e, p, prod, c]) => {
      setSales(s);
      setExpenses(e);
      setPayments(p);
      setProducts(prod);
      setCustomers(c);
      setLoading(false);
    });
  }, []);

  const totalSales = sales.reduce((s, x) => s + (x.total || 0), 0);
  const totalExpenses = expenses.reduce((s, x) => s + (x.amount || 0), 0);
  const profit = totalSales - totalExpenses;
  const received = payments.filter(p => p.direction === 'in').reduce((s, x) => s + (x.amount || 0), 0);

  if (loading) {
    return (
      <div className="py-12 text-center text-[var(--color-text-muted)]">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2"></div>
        <p className="text-sm">Calculating reports & metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="app-card">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Total Sales
          </div>
          <div className="text-2xl font-black text-[var(--color-text-primary)] dark:text-white mt-1">
            ₹{totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[var(--color-text-secondary)] dark:text-neutral-400 mt-1">
            {sales.length} orders fulfilled
          </div>
        </div>

        <div className="app-card">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Total Expenses
          </div>
          <div className="text-2xl font-black text-[var(--color-text-primary)] dark:text-white mt-1">
            ₹{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[var(--color-text-secondary)] dark:text-neutral-400 mt-1">
            {expenses.length} expense entries
          </div>
        </div>

        <div className="app-card">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Net Profit
          </div>
          <div className={`text-2xl font-black mt-1 ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            ₹{profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[var(--color-text-secondary)] dark:text-neutral-400 mt-1">
            Revenue minus expenses
          </div>
        </div>

        <div className="app-card">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Collected Cash
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            ₹{received.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[var(--color-text-secondary)] dark:text-neutral-400 mt-1">
            Inward receipts
          </div>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="app-card p-0 overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)] dark:border-neutral-800">
            <h3 className="font-bold text-sm text-[var(--color-text-primary)] dark:text-white uppercase tracking-wider">
              Sales by Customer
            </h3>
          </div>
          <div className="app-table-container">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface-overlay)] dark:bg-neutral-900 text-[var(--color-text-secondary)] dark:text-neutral-400 text-left text-xs uppercase font-bold">
                <tr>
                  <th className="px-4 py-2.5 whitespace-nowrap">Customer</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] dark:divide-neutral-800">
                {customers.map((c) => {
                  const amt = sales
                    .filter((s) => s.customerId === c.id)
                    .reduce((sum, s) => sum + (s.total || 0), 0);
                  if (amt <= 0) return null;
                  return (
                    <tr key={c.id} className="hover:bg-[var(--color-surface-overlay)]/40 transition">
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] dark:text-neutral-300 font-medium whitespace-nowrap">
                        {c.name}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[var(--color-text-primary)] dark:text-white whitespace-nowrap">
                        ₹{amt.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                {customers.every((c) => sales.filter((s) => s.customerId === c.id).reduce((sum, s) => sum + (s.total || 0), 0) === 0) && (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-xs text-[var(--color-text-muted)]">
                      No customer sales recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="app-card p-0 overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)] dark:border-neutral-800">
            <h3 className="font-bold text-sm text-[var(--color-text-primary)] dark:text-white uppercase tracking-wider">
              Expenses by Category
            </h3>
          </div>
          <div className="app-table-container">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface-overlay)] dark:bg-neutral-900 text-[var(--color-text-secondary)] dark:text-neutral-400 text-left text-xs uppercase font-bold">
                <tr>
                  <th className="px-4 py-2.5 whitespace-nowrap">Category</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] dark:divide-neutral-800">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-[var(--color-surface-overlay)]/40 transition">
                    <td className="px-4 py-3 text-[var(--color-text-secondary)] dark:text-neutral-300 font-medium whitespace-nowrap">
                      {(e as any).category || 'General'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[var(--color-text-primary)] dark:text-white whitespace-nowrap">
                      ₹{(e.amount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-xs text-[var(--color-text-muted)]">
                      No expenses recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
