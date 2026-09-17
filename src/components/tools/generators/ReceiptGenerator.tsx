import { useState, useRef } from 'react';
import CalculatorLayout from '../calculators/CalculatorLayout';
import NumberInput from '../calculators/NumberInput';

interface LineItem {
  description: string;
  qty: string;
  price: string;
}

export default function ReceiptGenerator() {
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Billing / payment section moved here
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [paidAmount, setPaidAmount] = useState('');

  const [items, setItems] = useState<LineItem[]>([
    { description: '', qty: '', price: '' },
    { description: '', qty: '', price: '' },
  ]);
  const [generated, setGenerated] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.qty) || 0) * (parseFloat(i.price) || 0), 0);
  const tax = subtotal * (parseFloat('18') || 0) / 100;
  const total = subtotal + tax;

  const paidRaw = parseFloat(paidAmount) || 0;
  const paid = paymentStatus === 'paid' ? total : paidRaw;
  const effectiveStatus = (paidRaw > 0 && paid >= total - 0.01 && paymentStatus !== 'unpaid') ? 'paid' : paymentStatus;
  const remaining = Math.max(0, total - paid);

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

  const addItem = () => setItems([...items, { description: '', qty: '', price: '' }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const generate = () => {
    let trimmed = [...items];
    while (trimmed.length > 1) {
      const last = trimmed[trimmed.length - 1];
      if (!last.description && !last.qty && !last.price) {
        trimmed = trimmed.slice(0, -1);
      } else break;
    }
    setItems(trimmed);
    setGenerated(true);
  };

  const downloadPDF = () => {
    const el = docRef.current;
    if (!el) return;
    const html = el.innerHTML;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt</title>
<style>
@media print { @page { margin: 14mm 10mm 14mm 10mm; size: A4 portrait; } body { -webkit-print-color-adjust: exact; } * { box-shadow: none !important; } }
* { box-sizing: border-box; word-break: break-word; overflow-wrap: break-word; }
html, body { margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: #fff; color: #18181b; font-size: 13px; line-height: 1.35; }
.doc { max-width: 210mm; padding: 14mm 10mm; margin: 0 auto; background: #fff; }
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5pt solid #22c55e; padding-bottom: 14pt; margin-bottom: 14pt; }
.brand { font-size: 22pt; font-weight: 800; color: #111827; letter-spacing: -0.8pt; line-height: 1.15; max-width: 60%; }
.brand-sub { font-size: 9pt; color: #6b7280; margin-top: 2pt; }
.doc-type { font-size: 26pt; font-weight: 900; color: #22c55e; letter-spacing: -1pt; text-align: right; line-height: 1; }
.doc-type-sub { font-size: 9pt; color: #6b7280; text-align: right; margin-top: 4pt; }
.section-label { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 3pt; }
.section-value { font-weight: 600; color: #111827; font-size: 10pt; }
.table-wrap { margin: 10pt 0 10pt; border-top: 1.5pt solid #22c55e; border-bottom: 1pt solid #e5e7eb; }
.table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
.table thead th { text-align: left; padding: 7pt 5pt; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 700; border-bottom: 1pt solid #22c55e; border-top: 1.5pt solid #22c55e; }
.table th.right, .table td.right { text-align: right; }
.table td { padding: 6pt 5pt; border-bottom: 0.5pt solid #f3f4f6; vertical-align: top; }
.table td.desc { width: 55%; }
.table td.qty { width: 10%; text-align: center; }
.table td.unit { width: 17%; text-align: right; padding-right: 6pt; }
.table td.amount { width: 18%; text-align: right; padding-right: 2pt; font-weight: 600; color: #111827; }
.totals { width: 100%; text-align: right; margin-top: 6pt; border-top: 1pt solid #e5e7eb; padding-top: 6pt; }
.totals-row { display: flex; justify-content: flex-end; gap: 40pt; padding: 2pt 0; font-size: 10pt; }
.totals-row.label { color: #6b7280; font-weight: 500; }
.totals-row.value { color: #111827; font-weight: 600; min-width: 90pt; text-align: right; }
.total-grand { font-size: 14pt; font-weight: 800; color: #22c55e; padding-top: 4pt; border-top: 1.5pt solid #22c55e; margin-top: 4pt; }
.footer { margin-top: 14pt; padding-top: 10pt; border-top: 0.5pt solid #e5e7eb; font-size: 8pt; color: #9ca3af; display: flex; justify-content: space-between; align-items: flex-end; }
.note-box { background: #f8fafc; border-left: 3pt solid #22c55e; padding: 6pt 8pt; margin-top: 8pt; font-size: 9pt; color: #374151; }
</style>
</head>
<body>
<div class="doc">${html}</div>
</body>
</html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 600);
  };

  return (
    <CalculatorLayout title="Receipt Generator" resultLabel="Total Received" resultValue={`₹${total.toFixed(2)}`} resultSubtext={`Items: ${items.filter(i => i.description || i.price).length} | Tax: ₹${tax.toFixed(2)}`}>
      <div class="grid lg:grid-cols-2 gap-8 items-start">
        {/* Form */}
        <div class="bg-[var(--color-surface-raised)] dark:bg-neutral-950 rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 p-6 shadow-sm space-y-5">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] dark:text-neutral-400">Receipt Details</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-[var(--color-text-secondary)] dark:text-neutral-400 mb-1">Business Name</label>
              <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Business Name" class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
              <input value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder="Address" class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            </div>
            <div>
              <label class="block text-sm font-medium text-[var(--color-text-secondary)] dark:text-neutral-400 mb-1">Received From</label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer Name" class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <NumberInput id="rcptNo" label="Receipt Number" value={receiptNumber} onChange={(_, v) => setReceiptNumber(v)} placeholder="RCPT-001" />
            <NumberInput id="rcptDate" label="Date" value={date} onChange={(_, v) => setDate(v)} placeholder="2026-09-15" type="date" />
          </div>

          <div>
            <label class="block text-sm font-medium text-[var(--color-text-secondary)] dark:text-neutral-400 mb-1">Payment Method</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
              <option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Cheque</option>
            </select>
          </div>

          {/* Line items with qty + price */}
          <div>
            <label class="block text-sm font-medium text-[var(--color-text-secondary)] dark:text-neutral-400 mb-2">Items / Charges</label>
            <div class="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} class="grid grid-cols-12 gap-2 items-center">
                  <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Description" class="col-span-4 bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  <input type="number" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} placeholder="Qty" class="col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  <input type="number" value={item.price} onChange={e => updateItem(idx, 'price', e.target.value)} placeholder="Unit Price" class="col-span-3 bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  <div class="col-span-2 text-right text-xs font-semibold text-[var(--color-text-primary)] dark:text-white">₹{((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)).toFixed(2)}</div>
                  <button type="button" onClick={() => removeItem(idx)} disabled={items.length <= 1} class="col-span-1 text-red-400 hover:text-red-600 text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed">✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} class="mt-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">+ Add Item</button>
          </div>

          {/* Billing / payment section */}
          <div class="border-t border-[var(--color-border)] dark:border-neutral-800 pt-4 space-y-3">
            <h3 class="text-sm font-bold text-[var(--color-text-primary)] dark:text-white">Billing & Payment</h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-[var(--color-text-secondary)] dark:text-neutral-400 mb-1">Payment Status</label>
                <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-[var(--color-text-secondary)] dark:text-neutral-400 mb-1">Amount Received</label>
                <input type="number" min="0" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} placeholder="0" class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" disabled={paymentStatus !== 'partial' && paymentStatus !== 'paid'} />
              </div>
              <div>
                <label class="block text-xs font-medium text-[var(--color-text-secondary)] dark:text-neutral-400 mb-1">Remaining</label>
                <div class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] dark:text-white">₹{(paid >= total - 0.01 ? 0 : remaining).toFixed(2)}</div>
              </div>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="font-semibold">Status:</span>
              <span class={`font-bold px-2 py-0.5 rounded-full text-xs ${effectiveStatus === 'paid' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : effectiveStatus === 'partial' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'}`}>{effectiveStatus === 'paid' ? 'Paid' : effectiveStatus === 'partial' ? 'Partial' : 'Unpaid'}</span>
              <span class="text-gray-500">• Paid: ₹{paid.toFixed(2)} • Total: ₹{total.toFixed(2)}</span>
            </div>
          </div>

          <div class="flex gap-3 items-center justify-start">
            <button type="button" onClick={() => { generate(); }} class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-emerald-500/25">Generate Receipt</button>
          </div>
        </div>

        {/* Preview / Receipt */}
        <div>
          <div class="rounded-2xl border-2 border-green-300 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/60 dark:to-emerald-950/40 p-8 text-center shadow-xl shadow-green-500/10 mb-6">
            <p class="text-xs font-bold uppercase tracking-[0.15em] text-green-600 dark:text-green-400 mb-2">Amount Received</p>
            <p class="text-6xl md:text-7xl font-extrabold text-green-700 dark:text-green-200 leading-none tracking-tight">₹{total.toFixed(2)}</p>
            <p class="text-base font-medium text-green-500 dark:text-green-300 mt-3">via {paymentMethod}</p>
          </div>

          {generated && businessName && (
            <div ref={docRef} style={{ background: '#ffffff', color: '#18181b', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontFamily: 'ui-sans-serif, system-ui, sans-serif', maxWidth: '100%', borderTop: '4px solid #22c55e' }}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', borderBottom:'2.5pt solid #22c55e', paddingBottom:'14pt', marginBottom:'14pt'}}>
                <div>
                  <p style={{fontSize:'22pt', fontWeight:800, color:'#111827', letterSpacing:'-0.8pt', lineHeight:1.15, maxWidth:'60%'}}>{businessName}</p>
                  <p style={{fontSize:'9pt', color:'#6b7280', marginTop:'2pt'}}>{businessAddress}</p>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:'26pt', fontWeight:900, color:'#22c55e', letterSpacing:'-1pt', lineHeight:1}}>RECEIPT</p>
                  <p style={{fontSize:'9pt', color:'#6b7280', marginTop:'4pt'}}>{receiptNumber || 'RCPT-001'} &nbsp;|&nbsp; {date || new Date().toISOString().slice(0,10)}</p>
                </div>
              </div>

              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'14pt'}}>
                <div>
                  <p style={{fontSize:'8pt', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#9ca3af', marginBottom:'3pt'}}>Received From</p>
                  <p style={{fontWeight:600, color:'#111827', fontSize:'10pt'}}>{customerName || 'Customer'}</p>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:'8pt', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#9ca3af', marginBottom:'3pt'}}>Payment via</p>
                  <p style={{fontWeight:600, color:'#111827', fontSize:'10pt'}}>{paymentMethod}</p>
                  <p style={{fontSize:'12pt', color:'#6b7280'}}>{date || '—'}</p>
                </div>
              </div>

              {/* Line items with qty/price */}
              <div style={{margin:'10pt 0', borderTop:'1.5pt solid #22c55e', borderBottom:'1pt solid #e5e7eb'}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:'9.5pt'}}>
                  <thead>
                    <tr>
                      <th style={{textAlign:'left', padding:'7pt 5pt', fontSize:'8pt', textTransform:'uppercase', letterSpacing:'0.05em', color:'#6b7280', fontWeight:700, borderBottom:'1pt solid #22c55e', borderTop:'1.5pt solid #22c55e'}}>Description</th>
                      <th style={{textAlign:'center', padding:'7pt 5pt', fontSize:'8pt', textTransform:'uppercase', letterSpacing:'0.05em', color:'#6b7280', fontWeight:700, borderBottom:'1pt solid #22c55e', borderTop:'1.5pt solid #22c55e'}}>Qty</th>
                      <th style={{textAlign:'right', padding:'7pt 5pt', fontSize:'8pt', textTransform:'uppercase', letterSpacing:'0.05em', color:'#6b7280', fontWeight:700, borderBottom:'1pt solid #22c55e', borderTop:'1.5pt solid #22c55e'}}>Unit Price</th>
                      <th style={{textAlign:'right', padding:'7pt 5pt', fontSize:'8pt', textTransform:'uppercase', letterSpacing:'0.05em', color:'#6b7280', fontWeight:700, borderBottom:'1pt solid #22c55e', borderTop:'1.5pt solid #22c55e'}}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.filter(i=>i.description||i.qty||i.price).map((item,i)=> (
                      <tr key={i}>
                        <td style={{padding:'6pt 5pt', borderBottom:'0.5pt solid #f3f4f6', verticalAlign:'top', width:'55%'}} className="text-gray-900">{item.description || '-'}</td>
                        <td style={{padding:'6pt 5pt', borderBottom:'0.5pt solid #f3f4f6', textAlign:'center', color:'#6b7280', width:'10%'}}>{item.qty || 0}</td>
                        <td style={{padding:'6pt 5pt', borderBottom:'0.5pt solid #f3f4f6', textAlign:'right', color:'#6b7280', width:'17%'}}>₹{(parseFloat(item.price)||0).toFixed(2)}</td>
                        <td style={{padding:'6pt 5pt', borderBottom:'0.5pt solid #f3f4f6', textAlign:'right', fontWeight:600, color:'#111827', width:'18%'}}>₹{((parseFloat(item.qty)||0)*(parseFloat(item.price)||0)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{width:'100%', textAlign:'right', marginTop:'6pt', borderTop:'1pt solid #e5e7eb', paddingTop:'6pt'}}>
                <div style={{display:'flex', justifyContent:'flex-end', gap:'40pt', padding:'2pt 0', fontSize:'10pt'}}><span style={{color:'#6b7280', fontWeight:500}}>Subtotal</span><span style={{color:'#111827', fontWeight:600, minWidth:'90pt', textAlign:'right'}}>₹{subtotal.toFixed(2)}</span></div>
                <div style={{display:'flex', justifyContent:'flex-end', gap:'40pt', padding:'2pt 0', fontSize:'10pt'}}><span style={{color:'#6b7280', fontWeight:500}}>Tax / GST (18%)</span><span style={{color:'#111827', fontWeight:600, minWidth:'90pt', textAlign:'right'}}>₹{tax.toFixed(2)}</span></div>
                <div style={{display:'flex', justifyContent:'flex-end', gap:'40pt', padding:'2pt 0', fontSize:'10pt'}}><span style={{color:'#6b7280', fontWeight:500}}>Status</span><span style={{fontWeight:600, color: effectiveStatus === 'paid' ? '#22c55e' : effectiveStatus === 'partial' ? '#f59e0b' : '#ef4444', minWidth:'90pt', textAlign:'right'}}>{effectiveStatus === 'paid' ? 'Paid' : effectiveStatus === 'partial' ? 'Partial' : 'Unpaid'}</span></div>
                <div style={{display:'flex', justifyContent:'flex-end', gap:'40pt', padding:'2pt 0', fontSize:'10pt'}}><span style={{color:'#6b7280', fontWeight:500}}>Paid</span><span style={{color:'#111827', fontWeight:600, minWidth:'90pt', textAlign:'right'}}>₹{paid.toFixed(2)}</span></div>
                <div style={{display:'flex', justifyContent:'flex-end', gap:'40pt', padding:'2pt 0', fontSize:'10pt'}}><span style={{color:'#6b7280', fontWeight:500}}>Remaining</span><span style={{color:'#ef4444', fontWeight:600, minWidth:'90pt', textAlign:'right'}}>₹{(paid >= total - 0.01 ? 0 : remaining).toFixed(2)}</span></div>
                <div style={{fontSize:'14pt', fontWeight:800, color:'#22c55e', paddingTop:'4pt', borderTop:'1.5pt solid #22c55e', marginTop:'4pt'}}>Total Paid: ₹{total.toFixed(2)}</div>
              </div>

              <div style={{marginTop:'14pt', paddingTop:'10pt', borderTop:'0.5pt solid #e5e7eb', fontSize:'8pt', color:'#9ca3af', display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
                <div>
                  <p style={{fontSize:'8pt', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#9ca3af', marginBottom:'3pt'}}>Notes</p>
                  <p style={{fontSize:'9pt', color:'#374151'}}>Payment {effectiveStatus === 'paid' ? 'received' : effectiveStatus === 'partial' ? 'partially received — balance due' : 'pending'} — Thank you for your business.</p>
                </div>
                <div style={{fontSize:'8pt', color:'#9ca3af'}}>MicroBusiness365 • Professional Receipt</div>
              </div>

              </div>
          )}
        </div>
      </div>
    </CalculatorLayout>
  );
}
