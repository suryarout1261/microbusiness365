import { formatDate } from './utils';
import { db, type Business } from './db';

interface PrintDocumentOptions {
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyGstin?: string;
}

async function getBusinessDetails(): Promise<PrintDocumentOptions> {
  try {
    const bizList = await db.business.toArray();
    if (bizList && bizList.length > 0) {
      const biz = bizList[0];
      const addressParts = [biz.address, biz.city, biz.state, biz.pincode].filter(Boolean);
      return {
        companyName: biz.name || '',
        companyAddress: addressParts.join(', '),
        companyPhone: biz.phone || '',
        companyEmail: biz.email || '',
        companyGstin: biz.gstin || '',
      };
    }
  } catch (e) {
    console.error('Failed to load business details for print:', e);
  }
  return {};
}

export async function printInvoiceDocument(invoice: any, customOptions?: PrintDocumentOptions) {
  const biz = customOptions || (await getBusinessDetails());
  const companyName = customOptions?.companyName || biz.companyName || 'Your Business';
  const companyAddress = customOptions?.companyAddress || biz.companyAddress || '';
  const companyPhone = customOptions?.companyPhone || biz.companyPhone || '';
  const companyGstin = customOptions?.companyGstin || biz.companyGstin || '';

  const invNumber = invoice.invoiceNo || invoice.invoiceNumber || 'INV-001';
  const dateStr = formatDate(invoice.date || invoice.createdAt || new Date());
  const dueDateStr = invoice.dueDate ? formatDate(invoice.dueDate) : '';
  const customerName = invoice.customerName || 'Customer';
  const customerAddress = invoice.customerAddress || '';

  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const subtotal = Number(invoice.subtotal) || 0;
  const tax = Number(invoice.tax) || 0;
  const taxRate = invoice.taxRate ?? (subtotal > 0 && tax > 0 ? Math.round((tax / subtotal) * 100) : 18);
  const total = Number(invoice.total) || (subtotal + tax);
  const paid = Number(invoice.paidAmount) || 0;
  const due = Number(invoice.dueAmount) || Math.max(0, total - paid);

  let itemsHtml = '';
  if (items.length === 0) {
    itemsHtml = `<tr><td colspan="4" style="text-align:center; padding: 12pt; color: #6b7280;">No items listed</td></tr>`;
  } else {
    itemsHtml = items
      .map((it: any) => {
        const desc = it.description || it.productName || it.name || (it.productId ? `Product #${it.productId}` : 'Item');
        const qty = parseInt(it.qty || it.quantity, 10) || 1;
        const price = parseFloat(it.price || it.unitPrice) || 0;
        const disc = parseFloat(it.disc || it.discount) || 0;
        const lineTotal = (it.amount != null ? Number(it.amount) : qty * price * (1 - disc / 100));

        return `
          <tr>
            <td class="desc">
              <strong>${desc}</strong>
              ${disc > 0 ? `<div style="font-size: 8pt; color: #059669;">(${disc}% Discount applied)</div>` : ''}
            </td>
            <td class="qty">${qty}</td>
            <td class="unit right">₹${price.toFixed(2)}</td>
            <td class="amount right">₹${lineTotal.toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');
  }

  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow popups to print the invoice document.');
    return;
  }

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice - ${invNumber}</title>
<style>
@media print {
  @page { margin: 12mm 10mm 12mm 10mm; size: A4 portrait; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  * { box-shadow: none !important; }
}
* { box-sizing: border-box; word-break: break-word; overflow-wrap: break-word; }
html, body { margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #18181b; font-size: 13px; line-height: 1.35; }
.doc { max-width: 210mm; padding: 12mm 10mm; margin: 0 auto; background: #fff; }
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5pt solid #4f46e5; padding-bottom: 12pt; margin-bottom: 12pt; }
.brand { font-size: 20pt; font-weight: 800; color: #111827; letter-spacing: -0.5pt; line-height: 1.15; max-width: 60%; }
.brand-sub { font-size: 9pt; color: #4b5563; margin-top: 3pt; line-height: 1.3; }
.doc-type { font-size: 24pt; font-weight: 900; color: #4f46e5; letter-spacing: -1pt; text-align: right; line-height: 1; }
.doc-type-sub { font-size: 9pt; color: #4b5563; text-align: right; margin-top: 4pt; }
.meta-grid { display: flex; justify-content: space-between; gap: 16pt; margin-bottom: 12pt; }
.meta-col { flex: 1; }
.section-label { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 2pt; }
.section-value { font-weight: 600; color: #111827; font-size: 10.5pt; }
.table-wrap { margin: 10pt 0 10pt; border-top: 1.5pt solid #4f46e5; border-bottom: 1pt solid #e5e7eb; }
.table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
.table thead th { text-align: left; padding: 6pt 5pt; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.05em; color: #4b5563; font-weight: 700; border-bottom: 1pt solid #4f46e5; border-top: 1.5pt solid #4f46e5; background: #f8fafc; }
.table th.right, .table td.right { text-align: right; }
.table td { padding: 6pt 5pt; border-bottom: 0.5pt solid #f3f4f6; vertical-align: top; }
.table td.desc { width: 55%; }
.table td.qty { width: 10%; text-align: center; }
.table td.unit { width: 17%; text-align: right; padding-right: 6pt; }
.table td.amount { width: 18%; text-align: right; padding-right: 2pt; font-weight: 600; color: #111827; }
.totals { width: 100%; text-align: right; margin-top: 6pt; border-top: 1pt solid #e5e7eb; padding-top: 6pt; }
.totals-row { display: flex; justify-content: flex-end; gap: 30pt; padding: 2pt 0; font-size: 9.5pt; }
.totals-row .label { color: #4b5563; font-weight: 500; }
.totals-row .value { color: #111827; font-weight: 600; min-width: 80pt; text-align: right; }
.total-grand { font-size: 13pt; font-weight: 800; color: #4f46e5; padding-top: 4pt; border-top: 1.5pt solid #4f46e5; margin-top: 4pt; }
.status-badge { display: inline-block; padding: 2pt 6pt; border-radius: 4pt; font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.status-paid { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
.status-partial { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
.status-pending { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
.note-box { background: #f8fafc; border-left: 3pt solid #4f46e5; padding: 6pt 8pt; margin-top: 10pt; font-size: 8.5pt; color: #374151; }
.footer { margin-top: 14pt; padding-top: 8pt; border-top: 0.5pt solid #e5e7eb; font-size: 8pt; color: #9ca3af; display: flex; justify-content: space-between; align-items: flex-end; }
</style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <div>
        <div class="brand">${companyName}</div>
        <div class="brand-sub">
          ${companyAddress ? `<div>${companyAddress}</div>` : ''}
          ${companyPhone ? `<div>Phone: ${companyPhone}</div>` : ''}
          ${companyGstin ? `<div>GSTIN: ${companyGstin}</div>` : ''}
        </div>
      </div>
      <div>
        <div class="doc-type">INVOICE</div>
        <div class="doc-type-sub">#${invNumber} &nbsp;|&nbsp; Date: ${dateStr}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-col">
        <div class="section-label">Billed To</div>
        <div class="section-value">${customerName}</div>
        ${customerAddress ? `<div style="font-size: 8.5pt; color: #6b7280; margin-top: 2pt;">${customerAddress}</div>` : ''}
        ${invoice.customerGstin || invoice.gstin ? `<div style="font-size: 8.5pt; color: #4338ca; font-weight: 600; margin-top: 2pt;">GSTIN: ${invoice.customerGstin || invoice.gstin}</div>` : ''}
      </div>
      <div class="meta-col" style="text-align: right;">
        <div class="section-label">Payment Status</div>
        <div style="margin-bottom: 3pt;">
          <span class="status-badge ${invoice.status === 'paid' ? 'status-paid' : invoice.status === 'partial' ? 'status-partial' : 'status-pending'}">
            ${invoice.status ? invoice.status.toUpperCase() : 'PENDING'}
          </span>
        </div>
        ${dueDateStr ? `<div style="font-size: 8.5pt; color: #6b7280;">Due Date: <strong>${dueDateStr}</strong></div>` : ''}
      </div>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th class="desc">Description / Item</th>
            <th class="qty">Qty</th>
            <th class="unit right">Unit Price</th>
            <th class="amount right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <div class="totals">
      <div class="totals-row">
        <span class="label">Subtotal:</span>
        <span class="value">₹${subtotal.toFixed(2)}</span>
      </div>
      ${tax > 0 ? `
        <div class="totals-row">
          <span class="label">Tax (${taxRate}%):</span>
          <span class="value">₹${tax.toFixed(2)}</span>
        </div>
      ` : ''}
      <div class="totals-row total-grand">
        <span class="label">Total Amount:</span>
        <span class="value">₹${total.toFixed(2)}</span>
      </div>
      ${paid > 0 ? `
        <div class="totals-row">
          <span class="label">Amount Paid:</span>
          <span class="value" style="color: #15803d;">₹${paid.toFixed(2)}</span>
        </div>
        <div class="totals-row" style="font-weight: 700; color: ${due > 0 ? '#b91c1c' : '#15803d'};">
          <span class="label" style="font-weight: 700; color: inherit;">Balance Due:</span>
          <span class="value">₹${due.toFixed(2)}</span>
        </div>
      ` : ''}
    </div>

    ${invoice.notes ? `
      <div class="note-box">
        <strong>Notes & Terms:</strong><br />
        ${invoice.notes.replace(/\n/g, '<br />')}
      </div>
    ` : ''}

    <div class="footer">
      <span>Thank you for your business!</span>
      <span>Computer Generated Invoice</span>
    </div>
  </div>
</body>
</html>`);

  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
  }, 500);
}

export async function printQuotationDocument(quotation: any, customOptions?: PrintDocumentOptions) {
  const biz = customOptions || (await getBusinessDetails());
  const companyName = customOptions?.companyName || biz.companyName || 'Your Business';
  const companyAddress = customOptions?.companyAddress || biz.companyAddress || '';
  const companyPhone = customOptions?.companyPhone || biz.companyPhone || '';
  const companyGstin = customOptions?.companyGstin || biz.companyGstin || '';

  const quoteNumber = quotation.quotationNumber || quotation.quoteNo || 'QT-001';
  const dateStr = formatDate(quotation.date || quotation.createdAt || new Date());
  const validUntilStr = quotation.validUntil ? formatDate(quotation.validUntil) : '';
  const customerName = quotation.customerName || 'Valued Customer';
  const customerAddress = quotation.customerAddress || '';

  const items = Array.isArray(quotation.items) ? quotation.items : [];
  const subtotal = Number(quotation.subtotal) || 0;
  const tax = Number(quotation.tax) || 0;
  const taxRate = quotation.taxRate ?? (subtotal > 0 && tax > 0 ? Math.round((tax / subtotal) * 100) : 18);
  const total = Number(quotation.total) || (subtotal + tax);

  let itemsHtml = '';
  if (items.length === 0) {
    itemsHtml = `<tr><td colspan="4" style="text-align:center; padding: 12pt; color: #6b7280;">No items listed</td></tr>`;
  } else {
    itemsHtml = items
      .map((it: any) => {
        const desc = it.description || it.productName || it.name || (it.productId ? `Product #${it.productId}` : 'Item');
        const qty = parseInt(it.qty || it.quantity, 10) || 1;
        const price = parseFloat(it.price || it.unitPrice) || 0;
        const disc = parseFloat(it.disc || it.discount) || 0;
        const lineTotal = (it.total != null ? Number(it.total) : it.amount != null ? Number(it.amount) : qty * price * (1 - disc / 100));

        return `
          <tr>
            <td class="desc">
              <strong>${desc}</strong>
              ${disc > 0 ? `<div style="font-size: 8pt; color: #059669;">(${disc}% Discount applied)</div>` : ''}
            </td>
            <td class="qty">${qty}</td>
            <td class="unit right">₹${price.toFixed(2)}</td>
            <td class="amount right">₹${lineTotal.toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');
  }

  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow popups to print the quotation document.');
    return;
  }

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Quotation - ${quoteNumber}</title>
<style>
@media print {
  @page { margin: 12mm 10mm 12mm 10mm; size: A4 portrait; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  * { box-shadow: none !important; }
}
* { box-sizing: border-box; word-break: break-word; overflow-wrap: break-word; }
html, body { margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #18181b; font-size: 13px; line-height: 1.35; }
.doc { max-width: 210mm; padding: 12mm 10mm; margin: 0 auto; background: #fff; }
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5pt solid #4f46e5; padding-bottom: 12pt; margin-bottom: 12pt; }
.brand { font-size: 20pt; font-weight: 800; color: #111827; letter-spacing: -0.5pt; line-height: 1.15; max-width: 60%; }
.brand-sub { font-size: 9pt; color: #4b5563; margin-top: 3pt; line-height: 1.3; }
.doc-type { font-size: 24pt; font-weight: 900; color: #4f46e5; letter-spacing: -1pt; text-align: right; line-height: 1; }
.doc-type-sub { font-size: 9pt; color: #4b5563; text-align: right; margin-top: 4pt; }
.meta-grid { display: flex; justify-content: space-between; gap: 16pt; margin-bottom: 12pt; }
.meta-col { flex: 1; }
.section-label { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 2pt; }
.section-value { font-weight: 600; color: #111827; font-size: 10.5pt; }
.table-wrap { margin: 10pt 0 10pt; border-top: 1.5pt solid #4f46e5; border-bottom: 1pt solid #e5e7eb; }
.table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
.table thead th { text-align: left; padding: 6pt 5pt; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.05em; color: #4b5563; font-weight: 700; border-bottom: 1pt solid #4f46e5; border-top: 1.5pt solid #4f46e5; background: #f8fafc; }
.table th.right, .table td.right { text-align: right; }
.table td { padding: 6pt 5pt; border-bottom: 0.5pt solid #f3f4f6; vertical-align: top; }
.table td.desc { width: 55%; }
.table td.qty { width: 10%; text-align: center; }
.table td.unit { width: 17%; text-align: right; padding-right: 6pt; }
.table td.amount { width: 18%; text-align: right; padding-right: 2pt; font-weight: 600; color: #111827; }
.totals { width: 100%; text-align: right; margin-top: 6pt; border-top: 1pt solid #e5e7eb; padding-top: 6pt; }
.totals-row { display: flex; justify-content: flex-end; gap: 30pt; padding: 2pt 0; font-size: 9.5pt; }
.totals-row .label { color: #4b5563; font-weight: 500; }
.totals-row .value { color: #111827; font-weight: 600; min-width: 80pt; text-align: right; }
.total-grand { font-size: 13pt; font-weight: 800; color: #4f46e5; padding-top: 4pt; border-top: 1.5pt solid #4f46e5; margin-top: 4pt; }
.status-badge { display: inline-block; padding: 2pt 6pt; border-radius: 4pt; font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
.note-box { background: #f8fafc; border-left: 3pt solid #4f46e5; padding: 6pt 8pt; margin-top: 10pt; font-size: 8.5pt; color: #374151; }
.footer { margin-top: 14pt; padding-top: 8pt; border-top: 0.5pt solid #e5e7eb; font-size: 8pt; color: #9ca3af; display: flex; justify-content: space-between; align-items: flex-end; }
</style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <div>
        <div class="brand">${companyName}</div>
        <div class="brand-sub">
          ${companyAddress ? `<div>${companyAddress}</div>` : ''}
          ${companyPhone ? `<div>Phone: ${companyPhone}</div>` : ''}
          ${companyGstin ? `<div>GSTIN: ${companyGstin}</div>` : ''}
        </div>
      </div>
      <div>
        <div class="doc-type">QUOTATION</div>
        <div class="doc-type-sub">#${quoteNumber} &nbsp;|&nbsp; Date: ${dateStr}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-col">
        <div class="section-label">Quote For</div>
        <div class="section-value">${customerName}</div>
        ${customerAddress ? `<div style="font-size: 8.5pt; color: #6b7280; margin-top: 2pt;">${customerAddress}</div>` : ''}
        ${quotation.customerGstin || quotation.gstin ? `<div style="font-size: 8.5pt; color: #4338ca; font-weight: 600; margin-top: 2pt;">GSTIN: ${quotation.customerGstin || quotation.gstin}</div>` : ''}
      </div>
      <div class="meta-col" style="text-align: right;">
        <div class="section-label">Quotation Status</div>
        <div style="margin-bottom: 3pt;">
          <span class="status-badge">${quotation.status ? quotation.status.toUpperCase() : 'SENT'}</span>
        </div>
        ${validUntilStr ? `<div style="font-size: 8.5pt; color: #6b7280;">Valid Until: <strong>${validUntilStr}</strong></div>` : ''}
      </div>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th class="desc">Description / Scope</th>
            <th class="qty">Qty</th>
            <th class="unit right">Unit Price</th>
            <th class="amount right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <div class="totals">
      <div class="totals-row">
        <span class="label">Subtotal:</span>
        <span class="value">₹${subtotal.toFixed(2)}</span>
      </div>
      ${tax > 0 ? `
        <div class="totals-row">
          <span class="label">Tax (${taxRate}%):</span>
          <span class="value">₹${tax.toFixed(2)}</span>
        </div>
      ` : ''}
      <div class="totals-row total-grand">
        <span class="label">Estimated Total:</span>
        <span class="value">₹${total.toFixed(2)}</span>
      </div>
    </div>

    ${quotation.notes ? `
      <div class="note-box">
        <strong>Terms & Conditions:</strong><br />
        ${quotation.notes.replace(/\n/g, '<br />')}
      </div>
    ` : ''}

    <div class="footer">
      <span>Quotation valid until specified date.</span>
      <span>Computer Generated Quotation</span>
    </div>
  </div>
</body>
</html>`);

  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
  }, 500);
}

export async function printReceiptDocument(receipt: any, customOptions?: PrintDocumentOptions) {
  const biz = customOptions || (await getBusinessDetails());
  const companyName = customOptions?.companyName || biz.companyName || 'Your Business';
  const companyAddress = customOptions?.companyAddress || biz.companyAddress || '';
  const companyPhone = customOptions?.companyPhone || biz.companyPhone || '';
  const companyGstin = customOptions?.companyGstin || biz.companyGstin || '';

  const receiptNumber = receipt.receiptNumber || receipt.referenceId || receipt.id?.slice(0, 8) || 'REC-001';
  const dateStr = formatDate(receipt.date || receipt.createdAt || new Date());
  const customerName = receipt.customerName || receipt.receivedFrom || receipt.partyName || 'Customer';
  const amount = Number(receipt.amount) || 0;
  const method = receipt.method || receipt.paymentMethod || 'Cash';
  const notes = receipt.notes || receipt.description || '';

  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow popups to print the receipt.');
    return;
  }

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Payment Receipt - ${receiptNumber}</title>
<style>
@media print {
  @page { margin: 14mm 12mm 14mm 12mm; size: A4 portrait; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  * { box-shadow: none !important; }
}
* { box-sizing: border-box; word-break: break-word; overflow-wrap: break-word; }
html, body { margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #18181b; font-size: 13.5px; line-height: 1.4; }
.doc { max-width: 200mm; padding: 16mm 14mm; margin: 0 auto; background: #fff; border: 1.5pt solid #e5e7eb; border-radius: 8pt; }
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5pt solid #16a34a; padding-bottom: 12pt; margin-bottom: 16pt; }
.brand { font-size: 20pt; font-weight: 800; color: #111827; letter-spacing: -0.5pt; line-height: 1.15; max-width: 60%; }
.brand-sub { font-size: 9pt; color: #4b5563; margin-top: 3pt; line-height: 1.35; }
.doc-type { font-size: 22pt; font-weight: 900; color: #16a34a; letter-spacing: -0.5pt; text-align: right; line-height: 1; }
.doc-type-sub { font-size: 9pt; color: #4b5563; text-align: right; margin-top: 4pt; }
.receipt-box { background: #f0fdf4; border: 1.5pt solid #bbf7d0; border-radius: 8pt; padding: 16pt 18pt; margin: 16pt 0; display: flex; justify-content: space-between; align-items: center; }
.receipt-amount-label { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #166534; }
.receipt-amount-val { font-size: 26pt; font-weight: 900; color: #15803d; line-height: 1.1; margin-top: 2pt; }
.receipt-status-badge { background: #16a34a; color: #fff; padding: 4pt 10pt; border-radius: 6pt; font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14pt; margin-bottom: 14pt; }
.detail-card { background: #f8fafc; border: 1pt solid #e2e8f0; border-radius: 6pt; padding: 10pt 12pt; }
.detail-label { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 3pt; }
.detail-value { font-size: 11pt; font-weight: 600; color: #0f172a; }
.notes-box { background: #fff; border: 1pt dashed #cbd5e1; border-radius: 6pt; padding: 10pt 12pt; margin-top: 12pt; font-size: 9.5pt; color: #334155; }
.sign-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36pt; padding-top: 12pt; border-top: 1pt solid #e2e8f0; }
.sign-line { width: 140pt; border-top: 1pt solid #475569; text-align: center; font-size: 8.5pt; color: #64748b; padding-top: 4pt; }
.footer { margin-top: 20pt; padding-top: 10pt; border-top: 0.5pt solid #f1f5f9; font-size: 8pt; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <div>
        <div class="brand">${companyName}</div>
        <div class="brand-sub">
          ${companyAddress ? `<div>${companyAddress}</div>` : ''}
          ${companyPhone ? `<div>Phone: ${companyPhone}</div>` : ''}
          ${companyGstin ? `<div>GSTIN: ${companyGstin}</div>` : ''}
        </div>
      </div>
      <div>
        <div class="doc-type">PAYMENT RECEIPT</div>
        <div class="doc-type-sub">#${receiptNumber} &nbsp;|&nbsp; Date: ${dateStr}</div>
      </div>
    </div>

    <div class="receipt-box">
      <div>
        <div class="receipt-amount-label">Total Amount Received</div>
        <div class="receipt-amount-val">₹${amount.toFixed(2)}</div>
      </div>
      <div>
        <span class="receipt-status-badge">Payment Received</span>
      </div>
    </div>

    <div class="detail-grid">
      <div class="detail-card">
        <div class="detail-label">Received From</div>
        <div class="detail-value">${customerName}</div>
      </div>
      <div class="detail-card">
        <div class="detail-label">Payment Mode</div>
        <div class="detail-value" style="text-transform: uppercase;">${method}</div>
      </div>
      <div class="detail-card">
        <div class="detail-label">Receipt Number</div>
        <div class="detail-value" style="font-family: monospace;">#${receiptNumber}</div>
      </div>
      <div class="detail-card">
        <div class="detail-label">Transaction Date</div>
        <div class="detail-value">${dateStr}</div>
      </div>
    </div>

    ${notes ? `
      <div class="notes-box">
        <strong>Description / Remarks:</strong><br />
        ${notes.replace(/\n/g, '<br />')}
      </div>
    ` : ''}

    <div class="sign-row">
      <div>
        <div style="font-size: 8.5pt; color: #64748b;">Generated on ${dateStr}</div>
        <div style="font-size: 8pt; color: #94a3b8;">Status: Verified</div>
      </div>
      <div class="sign-line">
        Authorized Signatory
      </div>
    </div>

    <div class="footer">
      Thank you for your payment! This is an official computer generated receipt.
    </div>
  </div>
</body>
</html>`);

  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
  }, 500);
}
