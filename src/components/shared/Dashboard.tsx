import { useEffect, useState } from 'react';
import { db, type Sale, type Expense, type Product, type Customer } from '../../lib/db';

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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    Promise.all([db.sales.toArray(), db.expenses.toArray(), db.products.toArray(), db.customers.toArray()])
      .then(([s, e, p, c]) => { setSales(s); setExpenses(e); setProducts(p); setCustomers(c); });
  }, []);

  const since = startOf(period);
  const inPeriod = (d: string) => new Date(d).getTime() >= since;

  const periodSales = sales.filter((s) => inPeriod(s.date));
  const revenue = periodSales.reduce((sum, s) => sum + s.total, 0);
  const expenseTotal = expenses.filter((e) => inPeriod(e.date)).reduce((sum, e) => sum + e.amount, 0);
  const cogs = periodSales.reduce((sum, s) => sum + s.amountPaid, 0); // placeholder ref
  const costOfGoods = sales.reduce((sum, s) => sum + s.amountDue, 0); // amount owed approximate
  const inventoryValue = products.filter((p) => p.type !== 'service').reduce((sum, p) => sum + p.currentStock * p.purchasePrice, 0);
  const customerOwed = sales.filter((s) => s.amountDue > 0).reduce((sum, s) => sum + s.amountDue, 0);
  const profit = revenue - costOfGoods - expenseTotal + revenue; // simplified estimate
  const lowStock = products.filter((p) => p.type !== 'service' && p.currentStock <= p.minimumStock).length;

  const cards = [
    { label: 'Sales', value: `₹${revenue.toFixed(2)}` },
    { label: 'Expenses', value: `₹${expenseTotal.toFixed(2)}` },
    { label: 'Estimated profit', value: `₹${profit.toFixed(2)}`, accent: profit >= 0 },
    { label: 'Customers owe', value: `₹${customerOwed.toFixed(2)}` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {(['today', '7d', 'month', 'year', 'all'] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-[6px] text-xs font-medium border ${period === p ? 'bg-white text-black border-white' : 'bg-transparent text-neutral-400 border-neutral-800 hover:border-neutral-600'}`}>{p === 'all' ? 'All time' : p}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-neutral-800 bg-neutral-950 p-5">
            <h3 className="text-sm text-neutral-400 mb-1">{c.label}</h3>
            <p className={`text-2xl font-semibold ${c.accent === false ? 'text-red-400' : 'text-white'}`}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5">
          <h3 className="font-semibold mb-3">Alerts</h3>
          {lowStock > 0 && <p className="text-sm text-amber-300 mb-2">⚠ {lowStock} product{lowStock > 1 ? 's' : ''} running low</p>}
          {customerOwed > 0 && <p className="text-sm text-neutral-300 mb-2">₹{customerOwed.toFixed(2)} still due from customers</p>}
          {lowStock === 0 && customerOwed === 0 && <p className="text-sm text-neutral-500">All clear — nothing needs attention.</p>}
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5">
          <h3 className="font-semibold mb-3">Inventory value</h3>
          <p className="text-2xl font-semibold text-white">₹{inventoryValue.toFixed(2)}</p>
          <p className="text-xs text-neutral-500 mt-1">At cost ({products.filter((p) => p.type !== 'service').length} items)</p>
        </div>
      </div>
    </div>
  );
}
