import { useEffect, useState, useMemo } from 'react';
import {
  db,
  type Payment,
  type Customer,
  type Supplier,
  type Sale,
  type Purchase,
  type Expense,
  type Invoice,
  recalcCustomerBalance,
  recalcSupplierBalance,
} from '../../lib/db';
import { generateId, formatDate, getTodayISO, blockNegativeKey, sanitizeAmount } from '../../lib/utils';
import { getNextSequenceNumber, recordSequenceUsed } from '../../lib/numbering';
import { printReceiptDocument } from '../../lib/documentPrinter';

export default function PaymentManager() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'in' | 'out'>('all');
  const [openModal, setOpenModal] = useState(false);

  // Form State
  const [form, setForm] = useState({
    direction: 'in' as 'in' | 'out',
    partyId: '',
    referenceId: '',
    reasonType: 'auto' as 'auto' | 'order' | 'settlement' | 'advance' | 'custom',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'cash',
    notes: '',
  });

  const load = async () => {
    try {
      const [p, c, s, sal, pur, exp, invs] = await Promise.all([
        db.payments.toArray(),
        db.customers.toArray(),
        db.suppliers.toArray(),
        db.sales.toArray(),
        db.purchases.toArray(),
        db.expenses.toArray(),
        db.invoices.toArray(),
      ]);

      // Backfill any missing expense payments into db.payments
      const existingExpPayments = p.filter((item) => item.referenceType === 'expense');
      const linkedExpIds = new Set(existingExpPayments.map((item) => item.referenceId));
      for (const e of exp) {
        if (!linkedExpIds.has(e.id)) {
          const newExpPayment: Payment = {
            id: generateId(),
            referenceType: 'expense',
            referenceId: e.id,
            amount: e.amount,
            date: e.date ? (e.date.includes('T') ? e.date.split('T')[0] : e.date) : new Date().toISOString().split('T')[0],
            method: e.paymentMethod || 'cash',
            direction: 'out',
            notes: `Expense [${e.category}]: ${e.description}`,
            createdAt: e.createdAt || e.date || new Date().toISOString(),
          };
          await db.payments.put(newExpPayment);
          p.push(newExpPayment);
        }
      }

      setPayments(
        p.sort(
          (a, b) =>
            new Date(b.createdAt || b.date || 0).getTime() -
            new Date(a.createdAt || a.date || 0).getTime()
        )
      );
      setCustomers(c.sort((a, b) => a.name.localeCompare(b.name)));
      setSuppliers(s.sort((a, b) => a.name.localeCompare(b.name)));
      setSales(sal);
      setPurchases(pur);
      setExpenses(exp);
      setInvoices(invs);
    } catch (err) {
      console.error('Failed to load payments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    window.addEventListener('focus', load);
    window.addEventListener('visibilitychange', load);
    return () => {
      window.removeEventListener('focus', load);
      window.removeEventListener('visibilitychange', load);
    };
  }, []);

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);
  const supplierMap = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);
  const saleMap = useMemo(() => new Map(sales.map((s) => [s.id, s])), [sales]);
  const purchaseMap = useMemo(() => new Map(purchases.map((p) => [p.id, p])), [purchases]);
  const expenseMap = useMemo(() => new Map(expenses.map((e) => [e.id, e])), [expenses]);
  const invoiceMap = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);

  // Metrics
  const totalReceived = useMemo(
    () => payments.filter((p) => p.direction === 'in').reduce((sum, p) => sum + (p.amount || 0), 0),
    [payments]
  );
  const totalPaid = useMemo(
    () => payments.filter((p) => p.direction === 'out').reduce((sum, p) => sum + (p.amount || 0), 0),
    [payments]
  );
  const netCashFlow = totalReceived - totalPaid;

  const totalReceivables = useMemo(
    () => sales.reduce((sum, s) => sum + (s.amountDue > 0 ? s.amountDue : 0), 0),
    [sales]
  );
  const totalPayables = useMemo(
    () => purchases.reduce((sum, p) => sum + (p.amountDue > 0 ? p.amountDue : 0), 0),
    [purchases]
  );

  // Available outstanding orders (Priority pending orders)
  const availableReferences = useMemo(() => {
    if (form.direction === 'in') {
      const saleList = form.partyId
        ? sales.filter((s) => s.customerId === form.partyId && (s.amountDue || 0) > 0.01).map((s) => ({
            id: s.id,
            refType: 'sale',
            saleNumber: s.saleNumber,
            customerId: s.customerId,
            amountDue: s.amountDue,
            total: s.total,
            date: s.date || s.createdAt,
          }))
        : sales.filter((s) => (s.amountDue || 0) > 0.01).map((s) => ({
            id: s.id,
            refType: 'sale',
            saleNumber: s.saleNumber,
            customerId: s.customerId,
            amountDue: s.amountDue,
            total: s.total,
            date: s.date || s.createdAt,
          }));

      const invList = form.partyId
        ? invoices.filter((i) => i.customerId === form.partyId && (i.dueAmount !== undefined ? i.dueAmount : i.total || 0) > 0.01).map((i) => ({
            id: i.id,
            refType: 'invoice',
            saleNumber: i.invoiceNumber || i.invoiceNo || 'INV',
            customerId: i.customerId,
            amountDue: i.dueAmount !== undefined ? i.dueAmount : i.total,
            total: i.total,
            date: i.date || i.createdAt,
          }))
        : invoices.filter((i) => (i.dueAmount !== undefined ? i.dueAmount : i.total || 0) > 0.01).map((i) => ({
            id: i.id,
            refType: 'invoice',
            saleNumber: i.invoiceNumber || i.invoiceNo || 'INV',
            customerId: i.customerId,
            amountDue: i.dueAmount !== undefined ? i.dueAmount : i.total,
            total: i.total,
            date: i.date || i.createdAt,
          }));

      const combined = [...saleList, ...invList];
      return combined.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
    } else {
      const list = form.partyId
        ? purchases.filter((p) => p.supplierId === form.partyId && (p.amountDue || 0) > 0.01).map((p) => ({
            id: p.id,
            refType: 'purchase',
            purchaseNumber: p.purchaseNumber,
            supplierId: p.supplierId,
            amountDue: p.amountDue,
            total: p.total,
            date: p.date || p.createdAt,
          }))
        : purchases.filter((p) => (p.amountDue || 0) > 0.01).map((p) => ({
            id: p.id,
            refType: 'purchase',
            purchaseNumber: p.purchaseNumber,
            supplierId: p.supplierId,
            amountDue: p.amountDue,
            total: p.total,
            date: p.date || p.createdAt,
          }));
      return list.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
    }
  }, [form.direction, form.partyId, sales, purchases, invoices]);

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (tab !== 'all' && p.direction !== tab) return false;
      if (!q) return true;

      const partyName =
        p.direction === 'in'
          ? (p.customerId ? customerMap.get(p.customerId) : '') || ''
          : p.referenceType === 'expense'
          ? (expenseMap.get(p.referenceId)?.category ? `Expense: ${expenseMap.get(p.referenceId)?.category}` : 'Operating Expense')
          : (p.supplierId ? supplierMap.get(p.supplierId) : '') || '';

      const refNumber =
        p.referenceType === 'sale'
          ? saleMap.get(p.referenceId)?.saleNumber || invoiceMap.get(p.referenceId)?.invoiceNumber || ''
          : p.referenceType === 'purchase'
          ? purchaseMap.get(p.referenceId)?.purchaseNumber || ''
          : p.referenceType === 'expense'
          ? expenseMap.get(p.referenceId)?.expenseNumber || 'Expense'
          : '';

      return (
        partyName.toLowerCase().includes(q) ||
        refNumber.toLowerCase().includes(q) ||
        (p.notes || '').toLowerCase().includes(q) ||
        (p.method || '').toLowerCase().includes(q)
      );
    });
  }, [payments, tab, search, customerMap, supplierMap, saleMap, purchaseMap, expenseMap, invoiceMap]);

  async function handleSavePayment() {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid payment amount greater than 0.');
      return;
    }

    const now = new Date().toISOString();
    const paymentId = generateId();

    if (form.direction === 'in') {
      // Inbound payment from Customer
      const isLinkedToSale = form.referenceId && saleMap.has(form.referenceId);
      const isLinkedToInvoice = form.referenceId && invoiceMap.has(form.referenceId);
      const receiptNo = await getNextSequenceNumber('receipt');
      const paymentNo = await getNextSequenceNumber('payment');
      recordSequenceUsed('receipt', receiptNo);
      recordSequenceUsed('payment', paymentNo);

      const finalNotes = form.notes.trim() || `Receipt #${receiptNo}`;

      const paymentRecord: Payment = {
        id: paymentId,
        paymentNumber: paymentNo,
        referenceType: 'sale',
        referenceId: form.referenceId || '',
        customerId: form.partyId || undefined,
        amount: amt,
        date: form.date || getTodayISO(),
        method: form.method,
        notes: finalNotes,
        direction: 'in',
        createdAt: now,
      };

      await db.transaction('rw', [db.payments, db.sales, db.invoices, db.customers], async () => {
        await db.payments.put(paymentRecord);

        if (isLinkedToSale) {
          const sale = await db.sales.get(form.referenceId);
          if (sale) {
            const newPaid = Math.round(((sale.amountPaid || 0) + amt) * 100) / 100;
            const newDue = Math.max(0, Math.round(((sale.total || 0) - newPaid) * 100) / 100);
            const newStatus: 'paid' | 'partial' | 'pending' =
              newDue <= 0.01 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
            await db.sales.update(sale.id, {
              amountPaid: newPaid,
              amountDue: newDue,
              paymentStatus: newStatus,
              updatedAt: now,
            });
          }
        } else if (isLinkedToInvoice) {
          const inv = await db.invoices.get(form.referenceId);
          if (inv) {
            const newPaid = Math.round(((inv.paidAmount || 0) + amt) * 100) / 100;
            const newDue = Math.max(0, Math.round(((inv.total || 0) - newPaid) * 100) / 100);
            const newStatus: 'paid' | 'partial' | 'pending' =
              newDue <= 0.01 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
            await db.invoices.update(inv.id, {
              paidAmount: newPaid,
              dueAmount: newDue,
              status: newStatus as any,
              updatedAt: now,
            });
            if (inv.saleId) {
              const sale = await db.sales.get(inv.saleId);
              if (sale) {
                const sPaid = Math.round(((sale.amountPaid || 0) + amt) * 100) / 100;
                const sDue = Math.max(0, Math.round(((sale.total || 0) - sPaid) * 100) / 100);
                const sStatus: 'paid' | 'partial' | 'pending' =
                  sDue <= 0.01 ? 'paid' : sPaid > 0 ? 'partial' : 'pending';
                await db.sales.update(sale.id, {
                  amountPaid: sPaid,
                  amountDue: sDue,
                  paymentStatus: sStatus,
                  updatedAt: now,
                });
              }
            }
          }
        } else {
          // FIFO Allocation across pending sales for this customer (or all pending sales)
          let pendingSales = await db.sales.toArray();
          if (form.partyId) {
            pendingSales = pendingSales.filter((s) => s.customerId === form.partyId && (s.amountDue || 0) > 0.01);
          } else {
            pendingSales = pendingSales.filter((s) => (s.amountDue || 0) > 0.01);
          }
          pendingSales.sort((a, b) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());

          let remaining = amt;
          for (const s of pendingSales) {
            if (remaining <= 0) break;
            const alloc = Math.min(remaining, s.amountDue);
            const newPaid = Math.round(((s.amountPaid || 0) + alloc) * 100) / 100;
            const newDue = Math.max(0, Math.round(((s.total || 0) - newPaid) * 100) / 100);
            const newStatus: 'paid' | 'partial' | 'pending' =
              newDue <= 0.01 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
            await db.sales.update(s.id, {
              amountPaid: newPaid,
              amountDue: newDue,
              paymentStatus: newStatus,
              updatedAt: now,
            });
            remaining = Math.round((remaining - alloc) * 100) / 100;
          }

          if (remaining > 0) {
            let pendingInvs = await db.invoices.toArray();
            if (form.partyId) {
              pendingInvs = pendingInvs.filter((i) => i.customerId === form.partyId && (i.dueAmount !== undefined ? i.dueAmount : i.total || 0) > 0.01);
            } else {
              pendingInvs = pendingInvs.filter((i) => (i.dueAmount !== undefined ? i.dueAmount : i.total || 0) > 0.01);
            }
            pendingInvs.sort((a, b) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());

            for (const inv of pendingInvs) {
              if (remaining <= 0) break;
              const currentDue = inv.dueAmount !== undefined ? inv.dueAmount : inv.total;
              const alloc = Math.min(remaining, currentDue);
              const newPaid = Math.round(((inv.paidAmount || 0) + alloc) * 100) / 100;
              const newDue = Math.max(0, Math.round(((inv.total || 0) - newPaid) * 100) / 100);
              const newStatus: 'paid' | 'partial' | 'pending' =
                newDue <= 0.01 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
              await db.invoices.update(inv.id, {
                paidAmount: newPaid,
                dueAmount: newDue,
                status: newStatus as any,
                updatedAt: now,
              });
              remaining = Math.round((remaining - alloc) * 100) / 100;
            }
          }
        }
      });

      if (form.partyId) {
        await recalcCustomerBalance(form.partyId);
      }
    } else {
      // Outbound payment to Supplier
      const isLinkedToPurchase = form.referenceId && purchaseMap.has(form.referenceId);
      const paymentNo = await getNextSequenceNumber('payment');
      recordSequenceUsed('payment', paymentNo);

      const paymentRecord: Payment = {
        id: paymentId,
        paymentNumber: paymentNo,
        referenceType: 'purchase',
        referenceId: form.referenceId || '',
        supplierId: form.partyId || undefined,
        amount: amt,
        date: form.date || now.split('T')[0],
        method: form.method,
        notes: form.notes.trim(),
        direction: 'out',
        createdAt: now,
      };

      await db.transaction('rw', [db.payments, db.purchases, db.suppliers], async () => {
        await db.payments.put(paymentRecord);

        if (isLinkedToPurchase) {
          const purchase = await db.purchases.get(form.referenceId);
          if (purchase) {
            const newPaid = Math.round(((purchase.amountPaid || 0) + amt) * 100) / 100;
            const newDue = Math.max(0, Math.round(((purchase.total || 0) - newPaid) * 100) / 100);
            const newStatus: 'paid' | 'partial' | 'pending' =
              newDue <= 0.01 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
            await db.purchases.update(purchase.id, {
              amountPaid: newPaid,
              amountDue: newDue,
              paymentStatus: newStatus,
              updatedAt: now,
            });
          }
        } else {
          // FIFO Allocation across pending purchases for this supplier (or all pending purchases)
          let pendingPurchases = await db.purchases.toArray();
          if (form.partyId) {
            pendingPurchases = pendingPurchases.filter((p) => p.supplierId === form.partyId && (p.amountDue || 0) > 0.01);
          } else {
            pendingPurchases = pendingPurchases.filter((p) => (p.amountDue || 0) > 0.01);
          }
          pendingPurchases.sort((a, b) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());

          let remaining = amt;
          for (const p of pendingPurchases) {
            if (remaining <= 0) break;
            const alloc = Math.min(remaining, p.amountDue);
            const newPaid = Math.round(((p.amountPaid || 0) + alloc) * 100) / 100;
            const newDue = Math.max(0, Math.round(((p.total || 0) - newPaid) * 100) / 100);
            const newStatus: 'paid' | 'partial' | 'pending' =
              newDue <= 0.01 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
            await db.purchases.update(p.id, {
              amountPaid: newPaid,
              amountDue: newDue,
              paymentStatus: newStatus,
              updatedAt: now,
            });
            remaining = Math.round((remaining - alloc) * 100) / 100;
          }
        }
      });

      if (form.partyId) {
        await recalcSupplierBalance(form.partyId);
      }
    }

    setOpenModal(false);
    setForm({
      direction: 'in',
      partyId: '',
      referenceId: '',
      reasonType: 'auto',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      method: 'cash',
      notes: '',
    });
    load();
  }

  async function handleDeletePayment(p: Payment) {
    if (!window.confirm('Delete this payment transaction? Related records and balances will be updated.')) {
      return;
    }

    await db.transaction('rw', [db.payments, db.sales, db.invoices, db.purchases, db.expenses, db.customers, db.suppliers], async () => {
      if (p.direction === 'in') {
        if (p.referenceId && saleMap.has(p.referenceId)) {
          const sale = await db.sales.get(p.referenceId);
          if (sale) {
            const newPaid = Math.max(0, Math.round(((sale.amountPaid || 0) - p.amount) * 100) / 100);
            const newDue = Math.max(0, Math.round(((sale.total || 0) - newPaid) * 100) / 100);
            const newStatus: 'paid' | 'partial' | 'pending' =
              newDue <= 0.01 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
            await db.sales.update(sale.id, {
              amountPaid: newPaid,
              amountDue: newDue,
              paymentStatus: newStatus,
              updatedAt: new Date().toISOString(),
            });
          }
        } else if (p.referenceId && invoiceMap.has(p.referenceId)) {
          const inv = await db.invoices.get(p.referenceId);
          if (inv) {
            const newPaid = Math.max(0, Math.round(((inv.paidAmount || 0) - p.amount) * 100) / 100);
            const newDue = Math.max(0, Math.round(((inv.total || 0) - newPaid) * 100) / 100);
            const newStatus: 'paid' | 'partial' | 'pending' =
              newDue <= 0.01 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
            await db.invoices.update(inv.id, {
              paidAmount: newPaid,
              dueAmount: newDue,
              status: newStatus as any,
              updatedAt: new Date().toISOString(),
            });
            if (inv.saleId) {
              const sale = await db.sales.get(inv.saleId);
              if (sale) {
                const sPaid = Math.max(0, Math.round(((sale.amountPaid || 0) - p.amount) * 100) / 100);
                const sDue = Math.max(0, Math.round(((sale.total || 0) - sPaid) * 100) / 100);
                const sStatus: 'paid' | 'partial' | 'pending' =
                  sDue <= 0.01 ? 'paid' : sPaid > 0 ? 'partial' : 'pending';
                await db.sales.update(sale.id, {
                  amountPaid: sPaid,
                  amountDue: sDue,
                  paymentStatus: sStatus,
                  updatedAt: new Date().toISOString(),
                });
              }
            }
          }
        } else if (p.customerId) {
          // Revert sales for customer (newest paid sales first)
          let customerSales = await db.sales.where('customerId').equals(p.customerId).toArray();
          customerSales.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
          let remaining = p.amount;
          for (const s of customerSales) {
            if (remaining <= 0) break;
            const alloc = Math.min(remaining, s.amountPaid || 0);
            const newPaid = Math.max(0, Math.round(((s.amountPaid || 0) - alloc) * 100) / 100);
            const newDue = Math.max(0, Math.round(((s.total || 0) - newPaid) * 100) / 100);
            const newStatus: 'paid' | 'partial' | 'pending' =
              newDue <= 0.01 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
            await db.sales.update(s.id, {
              amountPaid: newPaid,
              amountDue: newDue,
              paymentStatus: newStatus,
              updatedAt: new Date().toISOString(),
            });
            remaining = Math.round((remaining - alloc) * 100) / 100;
          }
        }
      } else if (p.direction === 'out') {
        if (p.referenceType === 'expense' && p.referenceId) {
          await db.expenses.delete(p.referenceId);
        } else if (p.referenceId && purchaseMap.has(p.referenceId)) {
          const purchase = await db.purchases.get(p.referenceId);
          if (purchase) {
            const newPaid = Math.max(0, Math.round(((purchase.amountPaid || 0) - p.amount) * 100) / 100);
            const newDue = Math.max(0, Math.round(((purchase.total || 0) - newPaid) * 100) / 100);
            const newStatus: 'paid' | 'partial' | 'pending' =
              newDue <= 0.01 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
            await db.purchases.update(purchase.id, {
              amountPaid: newPaid,
              amountDue: newDue,
              paymentStatus: newStatus,
              updatedAt: new Date().toISOString(),
            });
          }
        } else if (p.supplierId) {
          // Revert purchases for supplier (newest paid purchases first)
          let supplierPurchases = await db.purchases.where('supplierId').equals(p.supplierId).toArray();
          supplierPurchases.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
          let remaining = p.amount;
          for (const pur of supplierPurchases) {
            if (remaining <= 0) break;
            const alloc = Math.min(remaining, pur.amountPaid || 0);
            const newPaid = Math.max(0, Math.round(((pur.amountPaid || 0) - alloc) * 100) / 100);
            const newDue = Math.max(0, Math.round(((pur.total || 0) - newPaid) * 100) / 100);
            const newStatus: 'paid' | 'partial' | 'pending' =
              newDue <= 0.01 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
            await db.purchases.update(pur.id, {
              amountPaid: newPaid,
              amountDue: newDue,
              paymentStatus: newStatus,
              updatedAt: new Date().toISOString(),
            });
            remaining = Math.round((remaining - alloc) * 100) / 100;
          }
        }
      }

      await db.payments.delete(p.id);
    });

    if (p.customerId) await recalcCustomerBalance(p.customerId);
    if (p.supplierId) await recalcSupplierBalance(p.supplierId);

    load();
  }

  const inputClass = 'app-input';
  const btnPrimary = 'app-btn-primary';
  const btnSecondary = 'app-btn-secondary';

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Total Inflow (Received)
            </span>
            <span className="text-sm">📥</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">
            Receivable pending: ₹{totalReceivables.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Total Outflow (Paid)
            </span>
            <span className="text-sm">📤</span>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            ₹{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">
            Payables pending: ₹{totalPayables.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Net Cash Flow
            </span>
            <span className="text-sm">⚖️</span>
          </div>
          <div
            className={`text-2xl font-black mt-1 ${
              netCashFlow >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-500'
            }`}
          >
            ₹{netCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">
            Inflow minus outflow
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Total Transactions
            </span>
            <span className="text-sm">🧾</span>
          </div>
          <div className="text-2xl font-black text-[var(--color-text-primary)] dark:text-white mt-1">
            {payments.length}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">
            Recorded in local database
          </div>
        </div>
      </div>

      {/* Action and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="inline-flex rounded-xl p-1 bg-[var(--color-surface-raised)] dark:bg-[#111111] border border-[var(--color-border)] dark:border-neutral-800">
            <button
              onClick={() => setTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                tab === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-[var(--color-text-secondary)] dark:text-neutral-400 hover:text-white'
              }`}
            >
              All Payments ({payments.length})
            </button>
            <button
              onClick={() => setTab('in')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                tab === 'in'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[var(--color-text-secondary)] dark:text-neutral-400 hover:text-white'
              }`}
            >
              Received (In)
            </button>
            <button
              onClick={() => setTab('out')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                tab === 'out'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-[var(--color-text-secondary)] dark:text-neutral-400 hover:text-white'
              }`}
            >
              Paid (Out)
            </button>
          </div>

          <div className="w-64 relative">
            <input
              className="app-input app-search-input pl-11"
              placeholder="Search by party, notes, method..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
            </svg>
          </div>
        </div>

        <button
          onClick={async () => {
            const nextRcpt = await getNextSequenceNumber('receipt');
            setForm((prev) => ({
              ...prev,
              date: getTodayISO(),
              notes: prev.direction === 'in' && !prev.notes ? `Receipt #${nextRcpt}` : prev.notes,
            }));
            setOpenModal(true);
          }}
          className={btnPrimary}
        >
          + Record Payment
        </button>
      </div>

      {/* Record Payment Modal / Form */}
      {openModal && (
        <div className="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#121212] p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] dark:border-neutral-800 pb-3">
            <h2 className="font-bold text-lg text-[var(--color-text-primary)] dark:text-white">
              Record New Payment
            </h2>
            <button
              onClick={() => setOpenModal(false)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              ✕
            </button>
          </div>

          {/* Direction Toggle */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-2">
              Payment Flow Direction *
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setForm({ ...form, direction: 'in', partyId: '', referenceId: '' })}
                className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition ${
                  form.direction === 'in'
                    ? 'bg-emerald-600/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)]'
                }`}
              >
                <span>📥 Received (From Customer)</span>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, direction: 'out', partyId: '', referenceId: '' })}
                className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition ${
                  form.direction === 'out'
                    ? 'bg-rose-600/15 border-rose-500 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)]'
                }`}
              >
                <span>📤 Paid Out (To Supplier)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Party Selection */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                {form.direction === 'in' ? 'Customer' : 'Supplier / Vendor'}
              </label>
              <select
                value={form.partyId}
                onChange={(e) => setForm({ ...form, partyId: e.target.value, referenceId: '' })}
                className={inputClass}
              >
                <option value="">
                  {form.direction === 'in' ? 'Select customer (or leave blank)' : 'Select supplier (or leave blank)'}
                </option>
                {form.direction === 'in'
                  ? customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))
                  : suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.phone ? `(${s.phone})` : ''}
                      </option>
                    ))}
              </select>
            </div>

            {/* Payment Reason / Linked Order (Priority) */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                Payment Reason / Linked Order *
              </label>
              <select
                value={form.referenceId ? `order:${form.referenceId}` : form.reasonType || 'auto'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('order:')) {
                    const refId = val.replace('order:', '');
                    if (form.direction === 'in') {
                      const sale = saleMap.get(refId);
                      if (sale) {
                        setForm({
                          ...form,
                          referenceId: refId,
                          partyId: sale.customerId || form.partyId,
                          amount: String((sale.amountDue || 0).toFixed(2)),
                          notes: `Payment for ${sale.saleNumber}`,
                          reasonType: 'order',
                        });
                      }
                    } else {
                      const purchase = purchaseMap.get(refId);
                      if (purchase) {
                        setForm({
                          ...form,
                          referenceId: refId,
                          partyId: purchase.supplierId || form.partyId,
                          amount: String((purchase.amountDue || 0).toFixed(2)),
                          notes: `Payment for ${purchase.purchaseNumber}`,
                          reasonType: 'order',
                        });
                      }
                    }
                  } else {
                    setForm({
                      ...form,
                      referenceId: '',
                      reasonType: val as any,
                      notes: val === 'settlement' ? 'Account Settlement' : val === 'advance' ? 'Advance Payment' : form.notes,
                    });
                  }
                }}
                className={inputClass}
              >
                <option value="auto">Auto Allocate to Pending Orders (FIFO)</option>
                {availableReferences.length > 0 && (
                  <optgroup label="🔥 Pending Orders with Balance Due (Priority)">
                    {availableReferences.map((ref: any) => {
                      const partyName =
                        form.direction === 'in'
                          ? ref.customerId ? customerMap.get(ref.customerId) : 'Walk-in Customer'
                          : ref.supplierId ? supplierMap.get(ref.supplierId) : 'Vendor';
                      const refNo = ref.saleNumber || ref.purchaseNumber;
                      return (
                        <option key={ref.id} value={`order:${ref.id}`}>
                          {refNo} — {partyName} (Due: ₹{(ref.amountDue || 0).toFixed(2)})
                        </option>
                      );
                    })}
                  </optgroup>
                )}
                <optgroup label="Custom & General Reasons">
                  <option value="settlement">Direct Account Settlement / Balance Payment</option>
                  <option value="advance">Advance Payment</option>
                  <option value="custom">Other / Custom Reason (Specify in notes)</option>
                </optgroup>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                Amount (₹) *
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                placeholder="Amount (₹)"
                value={form.amount === 0 ? '' : form.amount}
                onKeyDown={blockNegativeKey}
                onChange={(e) => setForm({ ...form, amount: sanitizeAmount(e.target.value) })}
                className={inputClass}
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                Payment Method
              </label>
              <select
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
                className={inputClass}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI / GooglePay / PhonePe</option>
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="card">Card (Debit / Credit)</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                Payment Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={inputClass}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                Transaction Notes / Reference ID
              </label>
              <input
                type="text"
                placeholder="e.g. UPI Ref #987123, Cheque #00012, or remarks"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={() => setOpenModal(false)} className={btnSecondary}>
              Cancel
            </button>
            <button type="button" onClick={handleSavePayment} className={btnPrimary}>
              Save Payment Record
            </button>
          </div>
        </div>
      )}

      {/* Payments Ledger Table */}
      {loading ? (
        <div className="py-12 text-center text-[var(--color-text-muted)]">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2"></div>
          <p className="text-sm">Loading payments...</p>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-[#111111] p-10 text-center">
          <p className="text-base font-semibold text-[var(--color-text-primary)] dark:text-white mb-1">
            {payments.length === 0 ? 'No payments recorded yet' : 'No matching payment records'}
          </p>
          <p className="text-sm text-[var(--color-text-muted)] dark:text-neutral-400 mb-4">
            {payments.length === 0
              ? 'Record customer receipts and supplier vendor payments to maintain an accurate cash book.'
              : 'Try adjusting your search query or tab filters.'}
          </p>
          {payments.length === 0 && (
            <button onClick={() => setOpenModal(true)} className={btnPrimary}>
              + Record First Payment
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 overflow-hidden bg-[var(--color-surface-raised)] dark:bg-[#111111] shadow-sm">
          <div className="app-table-container">
            <table className="w-full text-sm min-w-[850px]">
              <thead className="bg-[var(--color-surface-overlay)] dark:bg-neutral-900 text-[var(--color-text-secondary)] dark:text-neutral-400 text-left text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Ref #</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Flow</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Party</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Linked Order</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Method</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Amount</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Notes</th>
                  <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] dark:divide-neutral-800">
                {filteredPayments.map((p) => {
                  const isIncoming = p.direction === 'in';
                  const expDoc = p.referenceType === 'expense' ? expenseMap.get(p.referenceId) : null;
                  const partyName = isIncoming
                    ? p.customerId
                      ? customerMap.get(p.customerId) || 'Unknown Customer'
                      : 'Direct Customer'
                    : p.referenceType === 'expense'
                    ? expDoc?.category
                      ? `Expense: ${expDoc.category}`
                      : 'Operating Expense'
                    : p.supplierId
                    ? supplierMap.get(p.supplierId) || 'Unknown Supplier'
                    : 'Direct Supplier';

                  const refDoc =
                    p.referenceType === 'sale'
                      ? saleMap.get(p.referenceId)
                      : p.referenceType === 'purchase'
                      ? purchaseMap.get(p.referenceId)
                      : expDoc;

                  const refLabel = refDoc
                    ? (refDoc as any).saleNumber || (refDoc as any).purchaseNumber || (refDoc as any).expenseNumber
                    : p.referenceType === 'expense'
                    ? 'EXPENSE'
                    : p.referenceId
                    ? p.referenceId.slice(0, 8)
                    : '—';

                  const payRefNumber = p.paymentNumber || `PAY-${p.id.slice(0, 6).toUpperCase()}`;

                  return (
                    <tr key={p.id} className="hover:bg-[var(--color-surface-overlay)]/40 transition">
                      <td className="px-4 py-3 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {payRefNumber}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)] dark:text-neutral-400 whitespace-nowrap">
                        {formatDate(p.date || p.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isIncoming
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                              : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                          }`}
                        >
                          {isIncoming ? '📥 In' : '📤 Out'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)] dark:text-white">
                        {partyName}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-indigo-600 dark:text-indigo-400">
                        {refLabel}
                      </td>
                      <td className="px-4 py-3 text-xs uppercase font-medium text-[var(--color-text-secondary)] dark:text-neutral-400">
                        {p.method}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-bold ${
                          isIncoming
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isIncoming ? '+' : '-'}₹{(p.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--color-text-muted)] max-w-xs truncate">
                        {p.notes || '—'}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap space-x-2">
                        {isIncoming && (
                          <button
                            type="button"
                            onClick={() => {
                              const receiptNo =
                                p.notes?.match(/#([A-Za-z0-9-]+)/)?.[1] ||
                                (p.referenceType === 'receipt' ? p.referenceId : '') ||
                                p.id.slice(0, 8);
                              printReceiptDocument({
                                receiptNumber: receiptNo,
                                customerName: partyName,
                                date: p.date || p.createdAt,
                                method: p.method,
                                amount: p.amount,
                                notes: p.notes,
                              });
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition cursor-pointer"
                          >
                            Print Receipt
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeletePayment(p)}
                          className="px-2 py-1 text-xs rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
