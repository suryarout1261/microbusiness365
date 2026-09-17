import { useEffect, useState, useMemo } from 'react';
import { db, type Invoice, type Customer, type Product } from '../../lib/db';
import { generateId } from '../../lib/utils';

export default function InvoiceManager() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({ customerId: '', invoiceNo: '', dueDate: '', notes: '', items: [{ productId: '', qty: 1, price: 0, disc: 0 }] as any });

  const load = async () => {
    const [invs, c, p] = await Promise.all([db.invoices.toArray(), db.customers.toArray(), db.products.toArray()]);
    setItems(invs.sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
    setCustomers(c);
    setProducts(p.filter(x => x.active !== false));
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let res = items;
    if (filter) { const q = filter.toLowerCase(); res = res.filter(i => (i.invoiceNo || '').toLowerCase().includes(q) || i.status.includes(q)); }
    if (statusFilter !== 'all') res = res.filter(i => i.status === statusFilter);
    return res;
  }, [items, filter, statusFilter]);

  async function save() {
    const now = new Date().toISOString();
    const customer = customers.find(c => c.id === form.customerId);
    const invItems = form.items.map((it: any) => {
      const prod = products.find(p => p.id === it.productId);
      const qty = Number(it.qty) || 0;
      const price = Number(it.price) || (prod ? prod.sellingPrice : 0);
      const disc = Number(it.disc) || 0;
      const amount = qty * price * (1 - disc/100);
      return { productId: it.productId, qty, price, disc, amount };
    });
    const subtotal = invItems.reduce((s, it) => s + it.amount, 0);
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + tax;
    const record: Invoice = {
      id: form.customerId ? generateId() : generateId(),
      invoiceNo: form.invoiceNo || ('INV-' + Date.now()),
      customerId: form.customerId || '',
      customerName: customer ? customer.name : '',
      status: form.paymentStatus === 'paid' ? 'paid' : form.paymentStatus === 'partial' ? 'partial' : 'pending', paidAmount: form.paymentStatus === 'partial' ? (Number(form.paidAmount) || 0) : (form.paymentStatus === 'paid' ? (subtotal+tax) : 0),
      subtotal, tax, total,
      paidAmount: 0,
      dueAmount: total,
      dueDate: form.dueDate || now.split('T')[0],
      notes: form.notes || '',
      items: invItems,
      createdAt: now,
      updatedAt: now,
    };
    await db.invoices.put(record);
    setForm({ customerId: '', invoiceNo: '', dueDate: '', notes: '', items: [{ productId: '', qty: 1, price: 0, disc: 0 }] });
    setOpenAdd(false);
    load();
  }

  async function del(id: string) { if (!window.confirm('Delete invoice?')) return; await db.invoices.delete(id); load(); }

  const inputClass = 'w-full h-11 rounded-xl bg-[var(--color-surface-raised)] dark:bg-[#1a1a1a] border-2 border-[var(--color-border)] dark:border-neutral-700 px-4 text-sm text-[var(--color-text-primary)] dark:text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] dark:text-white">Invoices</h1>
        <p className="text-base text-[var(--color-text-secondary)] dark:text-neutral-400 mt-1">Generate, track, and manage invoices.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch">
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search invoices..." className={inputClass + ' flex-1'} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputClass + ' w-auto min-w-[140px]'}>
          <option value="all">All</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="partial">Partial</option>
        </select>
        <a href="/tools/invoice-generator" className="px-3 py-3 rounded-xl border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-surface-overlay)] transition">Generator</a> <button onClick={() => { setOpenAdd(true); setForm({ customerId: '', invoiceNo: '', dueDate: '', notes: '', paymentStatus: 'unpaid', paidAmount: '', items: [{ productId: '', qty: 1, price: 0, disc: 0 }] }); }} className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white font-semibold hover:brightness-110 transition shadow-lg shadow-indigo-500/20 whitespace-nowrap">+ Create invoice</button>
      </div>

      {openAdd && (
        <div className="rounded-2xl border-2 border-[var(--color-border)] dark:border-neutral-700 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-6 shadow-md space-y-3">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] dark:text-white">New invoice</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <select className={inputClass} value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}><option value="">Select customer</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <input className={inputClass} placeholder="Invoice no" value={form.invoiceNo} onChange={e => setForm({ ...form, invoiceNo: e.target.value })} />
            <input className={inputClass} type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
          <div className="grid md:grid-cols-3 gap-3">
            <select className={inputClass} value={form.paymentStatus} onChange={e => setForm({ ...form, paymentStatus: e.target.value })}><option value="unpaid">Unpaid</option><option value="paid">Paid</option><option value="partial">Partial</option></select>
            {form.paymentStatus === 'partial' && <input className={inputClass} type="number" placeholder="Amount paid" value={form.paidAmount} onChange={e => setForm({ ...form, paidAmount: e.target.value })} />}
          </div>
          <div className="space-y-2">
            {form.items.map((it: any, idx: number) => (
              <div key={idx} className="grid md:grid-cols-4 gap-3">
                <select className={inputClass} value={it.productId} onChange={e => { const arr = [...form.items]; arr[idx].productId = e.target.value; const p = products.find(x => x.id === e.target.value); arr[idx].price = p ? p.sellingPrice : 0; setForm({ ...form, items: arr }); }}>
                  <option value="">Product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input className={inputClass} type="number" placeholder="Qty" value={it.qty} onChange={e => { const arr = [...form.items]; arr[idx].qty = Number(e.target.value); setForm({ ...form, items: arr }); }} />
                <input className={inputClass} type="number" placeholder="Price" value={it.price} onChange={e => { const arr = [...form.items]; arr[idx].price = Number(e.target.value); setForm({ ...form, items: arr }); }} />
                <input className={inputClass} type="number" placeholder="Disc %" value={it.disc} onChange={e => { const arr = [...form.items]; arr[idx].disc = Number(e.target.value); setForm({ ...form, items: arr }); }} />
              </div>
            ))}
          </div>
          <textarea className={inputClass + ' resize-y min-h-[60px]'} placeholder="Notes" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-3 pt-1">
            <button onClick={save} className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white font-semibold hover:brightness-110 transition shadow-lg shadow-indigo-500/20">Save invoice</button>
            <button onClick={() => setOpenAdd(false)} className="px-5 py-3 rounded-xl border-2 border-[var(--color-border)] dark:border-neutral-700 text-[var(--color-text-secondary)] dark:text-neutral-300 font-medium hover:bg-[var(--color-surface-overlay)] dark:hover:bg-neutral-900 transition">Cancel</button>
          </div>
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="rounded-2xl border-2 border-[var(--color-border)] dark:border-neutral-700 bg-[var(--color-surface-raised)] dark:bg-[#111111] shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-overlay)] dark:bg-neutral-900 text-[var(--color-text-secondary)] dark:text-neutral-400 text-left uppercase text-xs font-bold tracking-wider"><tr><th className="px-5 py-3">No</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Total</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-[var(--color-border)] dark:divide-neutral-800">{filtered.map(i => (
              <tr key={i.id} className="hover:bg-[var(--color-surface-overlay)] dark:hover:bg-neutral-900/60"><td className="px-5 py-3 font-medium text-[var(--color-text-primary)] dark:text-white">{i.invoiceNo}</td><td className="px-5 py-3">{i.customerName || '—'}</td><td className="px-5 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${i.status === 'paid' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : i.status === 'partial' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'}`}>{i.status}</span></td><td className="px-5 py-3 text-right font-bold">₹{i.total.toFixed(2)}</td><td className="px-5 py-3 text-right space-x-2"><button onClick={() => window.print()} className="text-indigo-600 dark:text-indigo-400 text-xs font-bold">Print</button><button onClick={() => del(i.id)} className="text-red-500 text-xs font-bold">Delete</button></td></tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-[var(--color-border)] dark:border-neutral-700 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-10 text-center shadow-md"><h3 className="text-xl font-bold text-[var(--color-text-primary)] dark:text-white mb-2">No invoices yet</h3><p className="text-[var(--color-text-secondary)] dark:text-neutral-400">Create your first invoice.</p></div>
      )}
    </div>
  );
}
