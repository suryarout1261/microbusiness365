import { useEffect, useState } from 'react';
import { db, type Expense } from '../../lib/db';
import { generateId, formatDate, blockNegativeKey, sanitizeAmount } from '../../lib/utils';

import { getNextSequenceNumber, recordSequenceUsed } from '../../lib/numbering';

const CATEGORIES = [
  'Rent', 'Electricity', 'Internet', 'Salary', 'Transport',
  'Marketing', 'Office Supplies', 'Maintenance', 'Software', 'Other'
];

export default function ExpenseManager() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState('Other');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const allExpenses = await db.expenses.toArray();
      // Backfill any existing expenses missing from db.payments
      const existingExpPayments = await db.payments.where('direction').equals('out').toArray();
      const linkedExpIds = new Set(existingExpPayments.filter((p) => p.referenceType === 'expense').map((p) => p.referenceId));
      for (const exp of allExpenses) {
        if (!linkedExpIds.has(exp.id)) {
          const paymentNo = await getNextSequenceNumber('payment');
          recordSequenceUsed('payment', paymentNo);
          await db.payments.put({
            id: generateId(),
            paymentNumber: paymentNo,
            referenceType: 'expense',
            referenceId: exp.id,
            amount: exp.amount,
            date: exp.date ? (exp.date.includes('T') ? exp.date.split('T')[0] : exp.date) : new Date().toISOString().split('T')[0],
            method: exp.paymentMethod || 'cash',
            direction: 'out',
            notes: `Expense [${exp.category}]: ${exp.description}`,
            createdAt: exp.createdAt || exp.date || new Date().toISOString(),
          });
        }
      }
      setExpenses(allExpenses.sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime()));
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function add() {
    const amt = Number(amount);
    if (!description.trim() || !amt || amt <= 0) {
      alert('Please enter a description and a valid amount greater than 0.');
      return;
    }
    const now = new Date().toISOString();
    const expId = generateId();
    const expNumber = await getNextSequenceNumber('expense');
    recordSequenceUsed('expense', expNumber);

    const exp: Expense = {
      id: expId,
      expenseNumber: expNumber,
      category,
      description: description.trim(),
      amount: amt,
      date: now,
      paymentMethod: 'cash',
      createdAt: now,
    };

    const paymentNo = await getNextSequenceNumber('payment');
    recordSequenceUsed('payment', paymentNo);

    await db.transaction('rw', [db.expenses, db.payments], async () => {
      await db.expenses.put(exp);
      await db.payments.put({
        id: generateId(),
        paymentNumber: paymentNo,
        referenceType: 'expense',
        referenceId: expId,
        amount: amt,
        date: now.split('T')[0],
        method: 'cash',
        direction: 'out',
        notes: `Expense [${category}]: ${description.trim()}`,
        createdAt: now,
      });
    });

    setExpenses([exp, ...expenses]);
    setDescription('');
    setAmount('');
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this expense entry? Related payment entry will also be removed.')) return;
    await db.transaction('rw', [db.expenses, db.payments], async () => {
      await db.expenses.delete(id);
      await db.payments.where({ referenceType: 'expense', referenceId: id }).delete();
    });
    setExpenses(expenses.filter((e) => e.id !== id));
  }

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="app-card flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Total Logged Expenses
          </span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            ₹{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <span className="text-xs text-[var(--color-text-secondary)] dark:text-neutral-400">
          {expenses.length} records in database
        </span>
      </div>

      {/* Add Expense Form Card */}
      <div className="app-card space-y-4">
        <h2 className="text-base font-bold text-[var(--color-text-primary)] dark:text-white">
          Record Operating Expense
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="app-input"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
              Expense Description *
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly internet bill or store maintenance"
              className="app-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1">
              Amount (₹) *
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              value={amount === 0 ? '' : amount}
              onKeyDown={blockNegativeKey}
              onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
              placeholder="Amount (₹)"
              className="app-input"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={add} className="app-btn-primary">
            + Save Expense
          </button>
        </div>
      </div>

      {/* Expense History Table */}
      {loading ? (
        <div className="py-12 text-center text-[var(--color-text-muted)]">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2"></div>
          <p className="text-sm">Loading expenses...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="app-card p-10 text-center">
          <h3 className="text-base font-bold text-[var(--color-text-primary)] dark:text-white mb-1">
            No expenses recorded yet
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] dark:text-neutral-400">
            Log your business operating costs above to track real profit and cash-flow.
          </p>
        </div>
      ) : (
        <div className="app-card p-0 overflow-hidden">
          <div className="app-table-container">
            <table className="w-full text-sm min-w-[650px]">
              <thead className="bg-[var(--color-surface-overlay)] dark:bg-neutral-900 text-[var(--color-text-secondary)] dark:text-neutral-400 text-left uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3 whitespace-nowrap">Category</th>
                  <th className="px-5 py-3 whitespace-nowrap">Description</th>
                  <th className="px-5 py-3 whitespace-nowrap">Date</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Amount</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] dark:divide-neutral-800">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-[var(--color-surface-overlay)]/50 transition">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/30">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)] dark:text-white whitespace-nowrap">
                      {e.description}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)] dark:text-neutral-400 whitespace-nowrap">
                      {formatDate(e.date || e.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      -₹{e.amount.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => remove(e.id)}
                        className="text-red-500 text-xs font-semibold hover:underline"
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
      )}
    </div>
  );
}
