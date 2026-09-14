import { useEffect, useState } from 'react';
import { db, type Expense } from '../../lib/db';
import { generateId } from '../../lib/utils';

const CATEGORIES = ['Rent', 'Electricity', 'Internet', 'Salary', 'Transport', 'Marketing', 'Office', 'Repairs', 'Software', 'Other'];

export default function ExpenseManager() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState('Other');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.expenses.orderBy('date').reverse().toArray().then((e) => { setExpenses(e); setLoading(false); });
  }, []);

  async function add() {
    if (!description.trim() || amount <= 0) return;
    const now = new Date().toISOString();
    const exp: Expense = { id: generateId(), expenseNumber: `EX-${Date.now().toString().slice(-6)}`, category, description: description.trim(), amount, date: now, createdAt: now };
    await db.expenses.put(exp);
    setExpenses([exp, ...expenses]);
    setDescription(''); setAmount(0);
  }

  async function remove(id: string) {
    await db.expenses.delete(id);
    setExpenses(expenses.filter((e) => e.id !== id));
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5">
        <h2 className="font-semibold mb-3">Add expense</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-neutral-900 border border-neutral-800 rounded-[6px] px-3 py-2 text-sm">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What for? *" className="col-span-2 bg-neutral-900 border border-neutral-800 rounded-[6px] px-3 py-2 text-sm" />
          <input type="number" min="0" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} placeholder="Amount ₹*" className="bg-neutral-900 border border-neutral-800 rounded-[6px] px-3 py-2 text-sm" />
        </div>
        <button onClick={add} className="mt-3 px-4 py-2 bg-white text-black rounded-[6px] text-sm font-medium hover:bg-neutral-200">+ Add expense</button>
      </div>
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-5 py-4 flex items-center justify-between">
        <span className="text-sm text-neutral-400">Total expenses</span>
        <span className="text-xl font-semibold text-white">₹{total.toFixed(2)}</span>
      </div>
      {loading ? <p className="text-neutral-500 text-sm">Loading…</p> : expenses.length === 0 ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-8 text-center text-neutral-500">
          <h3 className="text-lg font-medium text-neutral-300">No expenses yet</h3>
          <p className="text-sm">Log operating costs to see accurate estimated profit.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-neutral-400 text-left">
              <tr><th className="px-4 py-2 font-medium">Category</th><th className="px-4 py-2 font-medium">Description</th><th className="px-4 py-2 text-right font-medium">Amount</th><th className="px-4 py-2"></th></tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3"><span className="text-xs bg-neutral-800 text-neutral-200 px-2 py-0.5 rounded-full">{e.category}</span></td>
                  <td className="px-4 py-3 text-neutral-300">{e.description}</td>
                  <td className="px-4 py-3 text-right text-neutral-200">-₹{e.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right"><button onClick={() => remove(e.id)} className="text-neutral-500 hover:text-red-400 text-xs">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
