import { useState, useRef, useEffect } from 'react';
import CalculatorLayout from '../calculators/CalculatorLayout';
import NumberInput from '../calculators/NumberInput';
import { formatDate, getTodayISO, sanitizeName, sanitizeInteger, sanitizeAmount, blockDecimalKey, blockNegativeKey, generateId } from '../../../lib/utils';
import { getNextSequenceNumber, recordSequenceUsed } from '../../../lib/numbering';
import { db, type Payment, type Customer } from '../../../lib/db';
import { printReceiptDocument } from '../../../lib/documentPrinter';

export default function ReceiptGenerator() {
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [generated, setGenerated] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [existingCustomers, setExistingCustomers] = useState<Customer[]>([]);
  const docRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getNextSequenceNumber('receipt').then((num) => {
      setReceiptNumber(num);
    });
    setDate(getTodayISO());
    db.business.toArray().then((rows) => {
      if (rows && rows[0]) {
        const b = rows[0];
        setBusinessName(b.name || '');
        const addr = [b.address, b.city, b.state, b.pincode].filter(Boolean).join(', ');
        setBusinessAddress(addr);
      }
    });
    db.customers.toArray().then((c) => {
      setExistingCustomers(c.sort((a, b) => a.name.localeCompare(b.name)));
    });
  }, []);

  const numAmount = parseFloat(amount) || 0;

  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    const c = existingCustomers.find((x) => x.id === custId);
    if (c) {
      setCustomerName(c.name);
      const addr = [c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ');
      setCustomerAddress(addr);
    }
  };

  const handleReset = () => {
    setCustomerName('');
    setCustomerAddress('');
    setSelectedCustomerId('');
    getNextSequenceNumber('receipt').then((num) => {
      setReceiptNumber(num);
    });
    setDate(getTodayISO());
    setPaymentMethod('Cash');
    setAmount('');
    setNote('');
    setGenerated(false);
    setSavedSuccess(false);
  };

  const generateAndSave = async () => {
    if (!numAmount || numAmount <= 0) {
      alert('Please enter a valid amount received.');
      return;
    }

    const num = receiptNumber || (await getNextSequenceNumber('receipt'));
    if (num) {
      recordSequenceUsed('receipt', num);
    }

    const now = new Date().toISOString();
    const finalNotes = note.trim() ? `${note.trim()} (Receipt #${num})` : `Receipt #${num}`;

    const paymentRecord: Payment = {
      id: generateId(),
      referenceType: 'receipt',
      referenceId: num,
      customerId: selectedCustomerId || undefined,
      amount: numAmount,
      date: date || getTodayISO(),
      method: paymentMethod.toLowerCase(),
      notes: finalNotes,
      direction: 'in',
      createdAt: now,
    };

    await db.payments.put(paymentRecord);
    setGenerated(true);
    setSavedSuccess(true);
  };

  const downloadPDF = () => {
    const receiptData = {
      receiptNumber,
      customerName: customerName || 'Customer',
      customerAddress,
      date: date || getTodayISO(),
      method: paymentMethod,
      amount: numAmount,
      notes: note,
    };
    printReceiptDocument(receiptData, {
      companyName: businessName,
      companyAddress: businessAddress,
    });
  };

  return (
    <CalculatorLayout
      title="Receipt Generator"
      onCalculate={generateAndSave}
      onReset={handleReset}
      calculateLabel="Save & Add to Payments"
      resultLabel="Total Amount Received"
      resultValue={`₹${numAmount.toFixed(2)}`}
      resultSubtext={`Payment Method: ${paymentMethod} | Status: RECEIVED`}
      resultDetails={[
        { label: 'Amount Received', value: `₹${numAmount.toFixed(2)}` },
        { label: 'Received From', value: customerName || 'Walk-in Customer' },
        { label: 'Payment Method', value: paymentMethod },
        { label: 'Receipt Number', value: `#${receiptNumber || 'REC-001'}` },
      ]}
      extraContent={
        generated && (businessName || customerName || numAmount > 0) ? (
          <div className="space-y-4">
            {savedSuccess && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✓</span>
                  <div>
                    <span className="font-bold">Receipt #{receiptNumber} (₹{numAmount.toFixed(2)})</span> added to your Payments ledger!
                  </div>
                </div>
                <a
                  href="/payment"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm whitespace-nowrap"
                >
                  View Payments Page →
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
                borderLeft: '4px solid #16a34a',
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
                    {businessName || 'Your Business'}
                  </p>
                  <p className="brand-sub">{businessAddress}</p>
                </div>
                <div>
                  <p className="doc-type" style={{ color: '#16a34a' }}>
                    PAYMENT RECEIPT
                  </p>
                  <p className="doc-type-sub">
                    #{receiptNumber || '260001'} &nbsp;|&nbsp; Date: {formatDate(date || new Date())}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 my-4 bg-emerald-50/70 border border-emerald-200 rounded-xl items-center">
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-emerald-800">
                    Amount Received
                  </span>
                  <div className="text-3xl font-black text-emerald-700 mt-0.5">
                    ₹{numAmount.toFixed(2)}
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <span className="inline-block bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full">
                    Payment Verified & Received
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="section-label">Received From</p>
                  <p className="section-value">{customerName || 'Walk-in Customer / Anonymous Buyer'}</p>
                  {customerAddress && <p className="text-xs text-gray-500 mt-0.5">{customerAddress}</p>}
                </div>
                <div className="text-right">
                  <p className="section-label">Payment Mode</p>
                  <p className="section-value text-emerald-600 uppercase font-bold">{paymentMethod}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Receipt #{receiptNumber || '260001'}</p>
                </div>
              </div>

              {note && (
                <div className="note-box" style={{ borderLeftColor: '#16a34a', backgroundColor: '#f0fdf4' }}>
                  <strong>Description / Purpose:</strong> {note}
                </div>
              )}

              <div className="footer mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="text-xs text-gray-500">Thank you for your payment!</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadPDF}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer"
                  >
                    Print / Download Receipt
                  </button>
                  <a
                    href="/payment"
                    className="bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-800 dark:text-neutral-200 text-xs px-3.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer"
                  >
                    Go to Payments Page →
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
            Your Business Name
          </label>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(sanitizeName(e.target.value))}
            placeholder="Business / Company Name"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <input
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
            placeholder="Business Address"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] dark:text-neutral-400">
              Received From (Customer)
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
            placeholder="Customer Name / Anonymous Buyer"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <input
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            placeholder="Customer Address / Phone (Optional)"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <NumberInput
          id="recNo"
          label="Receipt Number"
          value={receiptNumber}
          onChange={(_, v) => setReceiptNumber(v)}
          placeholder="e.g. REC-260001"
          type="text"
        />
        <NumberInput
          id="date"
          label="Payment Date"
          value={date}
          onChange={(_, v) => setDate(v)}
          placeholder="dd-mm-yyyy"
          type="date"
        />
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] dark:text-neutral-400 mb-1">
            Payment Mode
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            <option value="Cash">Cash</option>
            <option value="UPI">UPI / GooglePay / PhonePe</option>
            <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
            <option value="Card">Card (Debit / Credit)</option>
            <option value="Cheque">Cheque</option>
            <option value="Online">Online Payment</option>
          </select>
        </div>
      </div>

      {/* Amount Input */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] dark:text-neutral-400 mb-1">
          Amount Received (₹) *
        </label>
        <input
          type="number"
          min="0.01"
          step="any"
          value={amount === 0 ? '' : amount}
          onKeyDown={blockNegativeKey}
          onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
          placeholder="Amount Received (₹)"
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] dark:text-neutral-400 mb-1">
          Purpose / Transaction Notes / Remarks
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Payment for goods, advance deposit, invoice reference #, UPI Txn ID, or remarks..."
          rows={2}
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
      </div>
    </CalculatorLayout>
  );
}
