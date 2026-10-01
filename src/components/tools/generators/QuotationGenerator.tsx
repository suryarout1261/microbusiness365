import { useState, useRef, useEffect } from 'react';
import CalculatorLayout from '../calculators/CalculatorLayout';
import NumberInput from '../calculators/NumberInput';
import { formatDate, getTodayISO, sanitizeName, sanitizeInteger, sanitizeAmount, sanitizePercentage, sanitizeGSTIN, blockDecimalKey, blockNegativeKey, generateId } from '../../../lib/utils';
import { getNextSequenceNumber, recordSequenceUsed } from '../../../lib/numbering';
import { db, type Quotation, type Customer, type Product } from '../../../lib/db';
import { printQuotationDocument } from '../../../lib/documentPrinter';

interface LineItem {
  productId?: string;
  description: string;
  qty: string;
  price: string;
}

export default function QuotationGenerator() {
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyGstin, setCompanyGstin] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [quotationNumber, setQuotationNumber] = useState('');
  const [date, setDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ description: '', qty: '', price: '' }]);
  const [note, setNote] = useState('');
  const [taxRate, setTaxRate] = useState('18');
  const [generated, setGenerated] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [existingCustomers, setExistingCustomers] = useState<Customer[]>([]);
  const [existingProducts, setExistingProducts] = useState<Product[]>([]);
  const docRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getNextSequenceNumber('quotation').then((num) => {
      setQuotationNumber(num);
    });
    setDate(getTodayISO());
    db.business.toArray().then((rows) => {
      if (rows && rows[0]) {
        const b = rows[0];
        setCompanyName(b.name || '');
        const addr = [b.address, b.city, b.state, b.pincode].filter(Boolean).join(', ');
        setCompanyAddress(addr);
        setCompanyGstin(b.gstin || '');
      }
    });
    db.customers.toArray().then((c) => {
      setExistingCustomers(c.sort((a, b) => a.name.localeCompare(b.name)));
    });
    db.products.toArray().then((p) => {
      setExistingProducts(p.filter((x) => x.active !== false).sort((a, b) => a.name.localeCompare(b.name)));
    });
  }, []);

  const subtotal = items.reduce((sum, i) => sum + (parseInt(i.qty, 10) || 0) * (parseFloat(i.price) || 0), 0);
  const tax = (subtotal * (parseFloat(taxRate) || 0)) / 100;
  const total = subtotal + tax;

  const updateItem = (idx: number, field: keyof LineItem, val: string) => {
    let next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    const lastIdx = next.length - 1;
    if (lastIdx === idx && (next[lastIdx].description || next[lastIdx].qty || next[lastIdx].price)) {
      next = [...next, { description: '', qty: '', price: '' }];
    }
    if (next.length > 1) {
      const pen = next[next.length - 2];
      if (!pen.description && !pen.qty && !pen.price) {
        next = next.slice(0, -1);
      }
    }
    setItems(next);
  };

  const handleProductSelect = (idx: number, prodId: string) => {
    const p = existingProducts.find((x) => x.id === prodId);
    let next = [...items];
    if (p) {
      next[idx] = {
        ...next[idx],
        productId: p.id,
        description: p.name,
        price: p.sellingPrice.toString(),
        qty: next[idx].qty || '1',
      };
    } else {
      next[idx] = { ...next[idx], productId: '' };
    }
    const lastIdx = next.length - 1;
    if (lastIdx === idx && (next[lastIdx].description || next[lastIdx].qty || next[lastIdx].price)) {
      next = [...next, { description: '', qty: '', price: '' }];
    }
    setItems(next);
  };

  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    const c = existingCustomers.find((x) => x.id === custId);
    if (c) {
      setCustomerName(c.name);
      const addr = [c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ');
      setCustomerAddress(addr);
      setCustomerGstin(c.gstin || '');
    }
  };

  const addItem = () => setItems([...items, { description: '', qty: '', price: '' }]);
  const removeItem = (idx: number) => {
    if (items.length <= 1) {
      setItems([{ description: '', qty: '', price: '' }]);
      return;
    }
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleReset = () => {
    setCustomerName('');
    setCustomerAddress('');
    setCustomerGstin('');
    setSelectedCustomerId('');
    getNextSequenceNumber('quotation').then((num) => {
      setQuotationNumber(num);
    });
    setDate(getTodayISO());
    setValidUntil('');
    setItems([{ description: '', qty: '', price: '' }]);
    setNote('');
    setTaxRate('18');
    setGenerated(false);
    setSavedSuccess(false);
  };

  const generateAndSave = async () => {
    let trimmed = [...items];
    while (trimmed.length > 1) {
      const last = trimmed[trimmed.length - 1];
      if (!last.description && (!last.qty || last.qty === '0') && !last.price) {
        trimmed = trimmed.slice(0, -1);
      } else {
        break;
      }
    }
    setItems(trimmed);
    const num = quotationNumber || (await getNextSequenceNumber('quotation'));
    if (num) {
      recordSequenceUsed('quotation', num);
    }

    const sub = trimmed.reduce((sum, i) => sum + (parseInt(i.qty, 10) || 0) * (parseFloat(i.price) || 0), 0);
    const tx = (sub * (parseFloat(taxRate) || 0)) / 100;
    const tot = sub + tx;
    const now = new Date().toISOString();

    const record: Quotation = {
      id: generateId(),
      quotationNumber: num,
      customerId: selectedCustomerId || '',
      customerName: customerName || 'General Quote',
      customerAddress: customerAddress || '',
      customerGstin: customerGstin || '',
      date: date || getTodayISO(),
      validUntil: validUntil || '',
      subtotal: sub,
      tax: tx,
      taxRate: parseFloat(taxRate) || 0,
      total: tot,
      status: 'sent',
      notes: note,
      items: trimmed
        .filter((i) => i.description || i.price)
        .map((i) => ({
          productId: i.productId || '',
          description: i.description,
          productName: i.description,
          qty: parseInt(i.qty, 10) || 1,
          quantity: parseInt(i.qty, 10) || 1,
          price: parseFloat(i.price) || 0,
          unitPrice: parseFloat(i.price) || 0,
          total: (parseInt(i.qty, 10) || 1) * (parseFloat(i.price) || 0),
        })),
      createdAt: now,
    } as any;

    await db.quotations.put(record);
    setGenerated(true);
    setSavedSuccess(true);
  };

  const downloadPDF = () => {
    const quoteData = {
      quotationNumber,
      customerName: customerName || 'General Quote',
      customerAddress,
      customerGstin,
      date: date || getTodayISO(),
      validUntil,
      subtotal,
      tax,
      taxRate: parseFloat(taxRate) || 0,
      total,
      status: 'sent',
      notes: note,
      items: items.filter((i) => i.description || i.price).map((i) => ({
        description: i.description,
        qty: parseInt(i.qty, 10) || 1,
        price: parseFloat(i.price) || 0,
        total: (parseInt(i.qty, 10) || 1) * (parseFloat(i.price) || 0),
      })),
    };
    printQuotationDocument(quoteData, {
      companyName,
      companyAddress,
      companyGstin,
    });
  };

  return (
    <CalculatorLayout
      title="Quotation Generator"
      onCalculate={generateAndSave}
      onReset={handleReset}
      calculateLabel="Save & Add to Quotations"
      resultLabel="Total Quotation Amount"
      resultValue={`₹${total.toFixed(2)}`}
      resultSubtext={`Subtotal: ₹${subtotal.toFixed(2)} + Estimated GST (${taxRate}%): ₹${tax.toFixed(2)}`}
      resultDetails={[
        { label: 'Quotation Number', value: `#${quotationNumber || '260001'}` },
        { label: 'Customer', value: customerName || 'General Quote' },
        ...(customerGstin ? [{ label: 'Customer GSTIN', value: customerGstin }] : []),
        { label: 'Subtotal', value: `₹${subtotal.toFixed(2)}` },
        { label: `Tax (${taxRate}%)`, value: `₹${tax.toFixed(2)}` },
        { label: 'Total Amount', value: `₹${total.toFixed(2)}` },
      ]}
      extraContent={
        generated && (companyName || customerName || items.some((i) => i.description)) ? (
          <div className="space-y-4">
            {savedSuccess && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✓</span>
                  <div>
                    <span className="font-bold">Quotation #{quotationNumber}</span> added to your Quotations list!
                  </div>
                </div>
                <a
                  href="/quotation"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm whitespace-nowrap"
                >
                  View Quotations Page →
                </a>
              </div>
            )}

            <div
              ref={docRef}
              style={{
                background: '#ffffff',
                color: '#18181b',
                padding: '32px',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                maxWidth: '100%',
                borderLeft: '4px solid #6366f1',
              }}
              className="print:shadow-none"
            >
              <div className="header">
                <div>
                  <p
                    className="brand"
                    style={{
                      wordBreak: 'keep-all',
                      overflowWrap: 'break-word',
                      whiteSpace: 'normal',
                      fontSize: 'clamp(14pt, 3.2vw, 22pt)',
                      fontWeight: 800,
                      color: '#111827',
                      letterSpacing: '-0.8pt',
                      lineHeight: 1.15,
                      maxWidth: '62%',
                      minWidth: '200pt',
                    }}
                  >
                    {companyName || 'Your Company'}
                  </p>
                  <p className="brand-sub">{companyAddress}</p>
                  {companyGstin && <p className="text-xs font-semibold text-indigo-700 mt-0.5">GSTIN: {companyGstin}</p>}
                </div>
                <div>
                  <p className="doc-type">QUOTATION</p>
                  <p className="doc-type-sub">
                    #{quotationNumber || '260001'} &nbsp;|&nbsp; Date: {formatDate(date || new Date())}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="section-label">Quote For</p>
                  <p className="section-value">{customerName || 'Customer'}</p>
                  <p className="text-xs text-gray-500">{customerAddress}</p>
                  {customerGstin && <p className="text-xs font-semibold text-gray-700 mt-0.5">GSTIN: {customerGstin}</p>}
                </div>
                <div className="text-right">
                  <p className="section-label">Valid Until</p>
                  <p className="section-value text-indigo-600">{validUntil ? formatDate(validUntil) : '—'}</p>
                  <p className="text-xs text-gray-500">Quote No: #{quotationNumber || '260001'}</p>
                </div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="desc">Description</th>
                      <th className="qty">Qty</th>
                      <th className="unit right">Unit Price</th>
                      <th className="amount right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items
                      .filter((i) => i.description || i.price)
                      .map((item, idx) => {
                        const q = parseInt(item.qty, 10) || 0;
                        const p = parseFloat(item.price) || 0;
                        return (
                          <tr key={idx}>
                            <td className="desc">{item.description || 'Item'}</td>
                            <td className="qty">{q}</td>
                            <td className="unit right">₹{p.toFixed(2)}</td>
                            <td className="amount right">₹{(q * p).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="totals">
                <div className="totals-row">
                  <span className="label">Subtotal:</span>
                  <span className="value">₹{subtotal.toFixed(2)}</span>
                </div>
                {parseFloat(taxRate) > 0 && (
                  <div className="totals-row">
                    <span className="label">Tax ({taxRate}%):</span>
                    <span className="value">₹{tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="totals-row total-grand">
                  <span className="label">Total Amount:</span>
                  <span className="value">₹{total.toFixed(2)}</span>
                </div>
              </div>

              {note && (
                <div className="note-box">
                  <strong>Terms & Conditions:</strong> {note}
                </div>
              )}

              <div className="footer">
                <span>Thank you for your business!</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadPDF}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer"
                  >
                    Print / Download PDF
                  </button>
                  <a
                    href="/quotation"
                    className="bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-800 dark:text-neutral-200 text-xs px-3.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer"
                  >
                    Go to Quotations Page →
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : null
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] dark:text-neutral-400 mb-1">
            Your Company
          </label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(sanitizeName(e.target.value))}
            placeholder="Company Name"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <input
            value={companyAddress}
            onChange={(e) => setCompanyAddress(e.target.value)}
            placeholder="Company Address"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <input
            value={companyGstin}
            maxLength={15}
            onChange={(e) => setCompanyGstin(sanitizeGSTIN(e.target.value))}
            placeholder="Company GSTIN (e.g. 29ABCDE1234F1Z5)"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-2.5 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] dark:text-neutral-400">
              Quotation For (Customer)
            </label>
            {existingCustomers.length > 0 && (
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerSelect(e.target.value)}
                className="text-xs bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-lg px-2 py-1 text-indigo-600 dark:text-indigo-400 font-medium"
              >
                <option value="">Choose existing...</option>
                {existingCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <input
            value={customerName}
            onChange={(e) => {
              setCustomerName(sanitizeName(e.target.value));
              setSelectedCustomerId('');
            }}
            placeholder="Customer Name"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <input
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            placeholder="Customer Address"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <input
            value={customerGstin}
            maxLength={15}
            onChange={(e) => setCustomerGstin(sanitizeGSTIN(e.target.value))}
            placeholder="Customer GSTIN (Optional 15 chars)"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-2.5 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <NumberInput
          id="qtNo"
          label="Quotation Number"
          value={quotationNumber}
          onChange={(_, v) => setQuotationNumber(v)}
          placeholder="e.g. QT-260001"
          type="text"
        />
        <NumberInput
          id="date"
          label="Date (DD-MM-YYYY)"
          value={date}
          onChange={(_, v) => setDate(v)}
          placeholder="dd-mm-yyyy"
          type="date"
        />
        <NumberInput
          id="validity"
          label="Valid Until Date"
          value={validUntil}
          onChange={(_, v) => setValidUntil(v)}
          placeholder="dd-mm-yyyy"
          type="date"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] dark:text-neutral-400 mb-2">
          Tax / GST Rate (%)
        </label>
        <input
          type="number"
          min="0"
          max="100"
          step="any"
          value={taxRate === 0 ? '' : taxRate}
          onKeyDown={blockNegativeKey}
          onChange={(e) => setTaxRate(sanitizePercentage(e.target.value))}
          placeholder="GST % (e.g. 18)"
          className="w-32 bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] dark:text-neutral-400">
            Line Items
          </label>
          <button
            type="button"
            onClick={addItem}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            + Add Line
          </button>
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              {existingProducts.length > 0 && (
                <div className="w-full sm:w-40 shrink-0">
                  <select
                    value={item.productId || ''}
                    onChange={(e) => handleProductSelect(idx, e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="">Pick product...</option>
                    {existingProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.sellingPrice})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex-1 min-w-[140px] w-full sm:w-auto">
                <input
                  value={item.description}
                  onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  placeholder="Item Description"
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
              <div className="w-20 shrink-0">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={item.qty === 0 ? '' : item.qty}
                  onKeyDown={blockDecimalKey}
                  onChange={(e) => updateItem(idx, 'qty', sanitizeInteger(e.target.value))}
                  placeholder="Qty"
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
              <div className="w-24 shrink-0">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={item.price === 0 ? '' : item.price}
                  onKeyDown={blockNegativeKey}
                  onChange={(e) => updateItem(idx, 'price', sanitizeAmount(e.target.value))}
                  placeholder="Price (₹)"
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-xs text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                title="Remove item"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] dark:text-neutral-400 mb-1">
          Terms & Conditions / Notes
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Validity period, payment terms, delivery schedules, warranty..."
          rows={2}
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
      </div>
    </CalculatorLayout>
  );
}
