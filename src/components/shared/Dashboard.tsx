import { useEffect, useState } from 'react';
import { db, type Sale, type Purchase, type Expense, type Payment, type Product, type Customer } from '../../lib/db';

type Period = 'today' | '7d' | 'month' | 'year' | 'all';

function startOf(period: Period): number {
  const now = new Date();
  if (period === 'today') return new Date(now.setHours(0, 0, 0, 0)).getTime();
  if (period === '7d') return now.getTime() - 7 * 864e5;
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  if (period === 'year') return new Date(now.getFullYear(), 0, 1).getTime();
  return 0;
}

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('month');
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    Promise.all([
      db.sales.toArray(),
      db.purchases.toArray(),
      db.expenses.toArray(),
      db.payments.toArray(),
      db.products.toArray(),
      db.customers.toArray(),
    ]).then(([s, pur, e, pay, p, c]) => {
      setSales(s);
      setPurchases(pur);
      setExpenses(e);
      setPayments(pay);
      setProducts(p);
      setCustomers(c);
    });
  }, []);

  const since = startOf(period);
  const inPeriod = (d?: string | null) => !d || new Date(d).getTime() >= since;

  const periodSales = sales.filter((s) => inPeriod(s.date || s.createdAt));
  const salesTotal = periodSales.reduce((sum, s) => sum + (s.total || 0), 0);

  const periodPurchases = purchases.filter((p) => inPeriod(p.date || p.createdAt));
  const purchasesTotal = periodPurchases.reduce((sum, p) => sum + (p.total || 0), 0);

  const periodExpenses = expenses.filter((e) => inPeriod(e.date || e.createdAt));
  const expensesTotal = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Profit = Sales - Purchases - Expenses
  const netProfit = salesTotal - purchasesTotal - expensesTotal;

  // Money Flow
  const periodPayments = payments.filter((p) => inPeriod(p.date || p.createdAt));
  const moneyFlowIn = periodPayments.filter((p) => p.direction === 'in').reduce((sum, p) => sum + (p.amount || 0), 0);
  const moneyFlowOut = periodPayments.filter((p) => p.direction === 'out').reduce((sum, p) => sum + (p.amount || 0), 0);
  const netCashFlow = moneyFlowIn - moneyFlowOut;

  const inventoryValue = products.filter((p) => p.type !== 'service').reduce((sum, p) => sum + (p.currentStock || 0) * (p.purchasePrice || 0), 0);
  const customerOwed = sales.filter((s) => s.amountDue > 0).reduce((sum, s) => sum + (s.amountDue || 0), 0);
  const supplierOwed = purchases.filter((p) => p.amountDue > 0).reduce((sum, p) => sum + (p.amountDue || 0), 0);
  const lowStock = products.filter((p) => p.type !== 'service' && (p.currentStock || 0) <= (p.minimumStock || 0)).length;

  const primaryCards = [
    { label: 'Sales Revenue', value: `₹${salesTotal.toFixed(2)}`, color: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'Purchases Cost', value: `₹${purchasesTotal.toFixed(2)}`, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Operating Expenses', value: `₹${expensesTotal.toFixed(2)}`, color: 'text-rose-600 dark:text-rose-400' },
    {
      label: 'Net Profit (Sales - Expenses - Purchases)',
      value: `₹${netProfit.toFixed(2)}`,
      color: netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500',
    },
  ];

  const secondaryCards = [
    { label: 'Money Flow In (Received)', value: `₹${moneyFlowIn.toFixed(2)}`, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Money Flow Out (Paid Out)', value: `₹${moneyFlowOut.toFixed(2)}`, color: 'text-rose-600 dark:text-rose-400' },
    { label: 'Net Cash Flow', value: `₹${netCashFlow.toFixed(2)}`, color: netCashFlow >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-500' },
    { label: 'Customers Owe (Receivables)', value: `₹${customerOwed.toFixed(2)}`, color: 'text-[var(--color-text-primary)] dark:text-white' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex rounded-xl p-1 bg-[var(--color-surface-raised)] dark:bg-[#111111] border border-[var(--color-border)] dark:border-neutral-800">
          {(['today', '7d', 'month', 'year', 'all'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition capitalize ${
                period === p
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-[var(--color-text-secondary)] dark:text-neutral-400 hover:text-[var(--color-text-primary)] dark:hover:text-white'
              }`}
            >
              {p === 'all' ? 'All time' : p === '7d' ? 'Past 7 days' : p === 'month' ? 'This month' : p === 'year' ? 'This year' : 'Today'}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryCards.map((c) => (
          <div key={c.label} className="app-card">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">{c.label}</h3>
            <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Cash Flow Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {secondaryCards.map((c) => (
          <div key={c.label} className="app-card">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">{c.label}</h3>
            <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="app-card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Alerts & Attention</h3>
          {lowStock > 0 && <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">⚠ {lowStock} product{lowStock > 1 ? 's' : ''} running low on stock</p>}
          {customerOwed > 0 && <p className="text-sm font-medium text-[var(--color-text-primary)] dark:text-neutral-200 mb-2">₹{customerOwed.toFixed(2)} receivable balance due from customers</p>}
          {supplierOwed > 0 && <p className="text-sm font-medium text-rose-600 dark:text-rose-400 mb-2">₹{supplierOwed.toFixed(2)} payable balance due to suppliers</p>}
          {lowStock === 0 && customerOwed === 0 && supplierOwed === 0 && <p className="text-sm text-[var(--color-text-muted)] dark:text-neutral-400">All clear — no inventory warnings or overdue payables/receivables.</p>}
        </div>
        <div className="app-card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Inventory Valuation</h3>
          <p className="text-2xl font-black text-[var(--color-text-primary)] dark:text-white">₹{inventoryValue.toFixed(2)}</p>
          <p className="text-xs text-[var(--color-text-secondary)] dark:text-neutral-400 mt-1">Total valuation at purchase cost ({products.filter((p) => p.type !== 'service').length} active physical items)</p>
        </div>
      </div>
    </div>
  );
}
