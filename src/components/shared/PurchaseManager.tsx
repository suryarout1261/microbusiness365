import { useEffect, useState } from 'react';
import { db, type Purchase, type Supplier, type Product } from '../../lib/db';
import { generateId } from '../../lib/utils';

export default function PurchaseManager() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState({
    supplierId: '',
    date: new Date().toISOString().split('T')[0],
    items: [{ productId: '', quantity: 1, price: 0, discount: 0 }],
    notes: ''
  });

  useEffect(() => {
    Promise.all([
      db.purchases.orderBy('date').reverse().toArray(),
      db.suppliers.toArray(),
      db.products.where('active').equals(false).not().toArray() // Get active products
    ]).then(([pur, sup, prod]) => {
      setPurchases(pur);
      setSuppliers(sup);
      setProducts(prod);
      setLoading(false);
    });
  }, []);

  const calculateItemTotal = (quantity: number, price: number, discount: number) => {
    return quantity * price * (1 - discount / 100);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    form.items.forEach(item => {
      subtotal += calculateItemTotal(item.quantity, item.price, item.discount);
    });
    const tax = Math.round(subtotal * 0.18); // 18% tax
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  async function handleSave() {
    const now = new Date().toISOString();
    const { subtotal, tax, total } = calculateTotals();

    const purchase: Purchase = {
      id: generateId(),
      purchaseNumber: `PO-${Date.now().toString().slice(-6)}`,
      date: form.date,
      supplierId: form.supplierId,
      subtotal,
      discount: 0, // Item-level discount already applied
      tax,
      total,
      amountPaid: 0,
      amountDue: total,
      paymentStatus: 'pending',
      notes: form.notes,
      createdAt: now,
      updatedAt: now
    };

    await db.purchases.put(purchase);
    setPurchases([purchase, ...purchases]);
    setOpenForm(false);
    // Reset form
    setForm({
      supplierId: '',
      date: new Date().toISOString().split('T')[0],
      items: [{ productId: '', quantity: 1, price: 0, discount: 0 }],
      notes: ''
    });
  }

  async function handleRemove(id: string) {
    if (!window.confirm('Delete purchase?')) return;
    await db.purchases.delete(id);
    setPurchases(purchases.filter((p) => p.id !== id));
  }

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { productId: '', quantity: 1, price: 0, discount: 0 }]
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
    newItems[index] = { ...newItems[index], [field]: value as never };
    setForm({ ...form, items: newItems });
  };

  const total = purchases.reduce((s, p) => s + p.total, 0);

  return (
    <div className="space-y-6">
      {/* Purchase Form */}
      <div className="rounded-xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-neutral-950 p-6">
        <h2 className="font-semibold mb-4 flex items-center justify-between">
          <span>{openForm ? 'Edit purchase' : 'New purchase'}</span>
          <button onClick={() => setOpenForm(!openForm)} className="px-3 py-1 rounded hover:bg-[var(--color-surface-overlay)] transition">
            {openForm ? 'Cancel' : '+ Add purchase'}
          </button>
        </h2>

        {openForm && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Supplier</label>
                <select
                  value={form.supplierId}
                  onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-overlay)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-overlay)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Purchase Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-[var(--color-text-secondary)] font-medium">Product</th>
                      <th className="px-3 py-2 text-center text-[var(--color-text-secondary)] font-medium">Quantity</th>
                      <th className="px-3 py-2 text-center text-[var(--color-text-secondary)] font-medium">Price (₹)</th>
                      <th className="px-3 py-2 text-center text-[var(--color-text-secondary)] font-medium">Discount (%)</th>
                      <th className="px-3 py-2 text-center text-[var(--color-text-secondary)] font-medium">Amount (₹)</th>
                      <th className="px-3 py-2 text-center text-[var(--color-text-secondary)] font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, index) => {
                      const itemTotal = calculateItemTotal(item.quantity, item.price, item.discount);
                      return (
                        <tr key={index} className="border-t border-[var(--color-border)]/20">
                          <td className="px-3 py-3">
                            <select
                              value={item.productId}
                              onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-overlay)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">Select product</option>
                              {products.map(product => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-overlay)] px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              min="0.01"
                              step="0.01"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-overlay)] px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              value={item.discount}
                              onChange={(e) => handleItemChange(index, 'discount', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-overlay)] px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              min="0"
                              max="100"
                              step="0.01"
                            />
                          </td>
                          <td className="px-3 py-3 text-right font-medium">₹{itemTotal.toFixed(2)}</td>
                          <td className="px-3 py-3 text-center space-x-1">
                            <button
                              onClick={() => removeItem(index)}
                              className="px-2 py-1 rounded hover:bg-red-50 text-red-600 text-xs"
                              disabled={form.items.length <= 1}
                            >
                              −
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Add item row */}
                    <tr>
                      <td colSpan="6" className="px-3 py-3 text-center">
                        <button
                          onClick={addItem}
                          className="px-4 py-2 rounded hover:bg-[var(--color-surface-overlay)] transition text-[var(--color-text-primary)]"
                        >
                          + Add Item
                        </button>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="4" className="px-3 py-3 text-right font-semibold">Subtotal:</td>
                      <td colSpan="2" className="px-3 py-3 text-right font-medium">₹{calculateTotals().subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colSpan="4" className="px-3 py-3 text-right font-semibold">Tax (18%):</td>
                      <td colSpan="2" className="px-3 py-3 text-right font-medium">₹{calculateTotals().tax.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colSpan="4" className="px-3 py-3 text-right font-semibold font-bold">Total:</td>
                      <td colSpan="2" className="px-3 py-3 text-right font-bold text-xl">₹{calculateTotals().total.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-overlay)] px-4 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setOpenForm(false)}
                className="px-4 py-2 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-3 rounded bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white font-semibold hover:brightness-110 transition shadow-lg shadow-indigo-500/20"
              >
                Save Purchase
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Purchases List */}
      <div className="rounded-xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-neutral-950 px-5 py-4 flex items-center justify-between">
        <span className="text-sm text-[var(--color-text-secondary)] dark:text-neutral-400">Total purchases</span>
        <span className="text-xl font-semibold text-[var(--color-text-primary)] dark:text-white">₹{total.toFixed(2)}</span>
      </div>
      {loading ? <p className="text-[var(--color-text-muted)] dark:text-neutral-500 text-sm">Loading…</p> : purchases.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-neutral-950 p-8 text-center text-[var(--color-text-muted)] dark:text-neutral-500">
          <h3 className="text-lg font-medium text-[var(--color-text-primary)] dark:text-neutral-300">No purchases yet</h3>
          <p className="text-sm">Record incoming stock to track inventory costs.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] dark:border-neutral-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-overlay)] dark:bg-neutral-900 text-[var(--color-text-secondary)] dark:text-neutral-400 text-left">
              <tr><th className="px-4 py-2 font-medium">PO Number</th><th className="px-4 py-2 font-medium">Date</th><th className="px-4 py-2 text-right font-medium">Total</th><th className="px-4 py-2"></th></tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">{p.purchaseNumber}</td>
                  <td className="px-4 py-3 text-[var(--color-text-primary)] dark:text-neutral-300">{new Date(p.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right text-neutral-200">₹{p.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right"><button onClick={() => handleRemove(p.id)} className="text-[var(--color-text-muted)] dark:text-neutral-500 hover:text-red-400 text-xs">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}