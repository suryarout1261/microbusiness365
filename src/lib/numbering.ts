import { db } from './db';

export type SequenceType = 'invoice' | 'receipt' | 'quotation' | 'sale' | 'purchase' | 'expense' | 'payment';

/**
 * Returns the 2-digit year indication (e.g. '26' for 2026).
 */
export function getCurrentYearPrefix(): string {
  return String(new Date().getFullYear()).slice(-2);
}

/**
 * Extracts the 4+ digit numeric counter from a year-prefixed code.
 * Matches patterns like '260001', 'INV-260001', 'RCPT-260001', etc.
 */
function extractSequenceForYear(raw: string | undefined | null, yearPrefix: string): number | null {
  if (!raw) return null;
  // Match raw YY followed by 4 or more digits, anywhere in the string
  const regex = new RegExp(`(?:^|[^0-9])${yearPrefix}(\\d{4,})(?:[^0-9]|$)`);
  const match = raw.match(regex);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Calculates the next sequential number formatted as YYNNNN (e.g. 260001, 260002, 260003).
 */
export async function getNextSequenceNumber(type: SequenceType): Promise<string> {
  const yy = getCurrentYearPrefix();
  let maxSeq = 0;

  // 1. Check local storage cache
  const localKey = `mb365_seq_${type}_${yy}`;
  const cachedVal = localStorage.getItem(localKey);
  if (cachedVal) {
    const parsed = parseInt(cachedVal, 10);
    if (!isNaN(parsed) && parsed > maxSeq) {
      maxSeq = parsed;
    }
  }

  // 2. Query Dexie database records for the highest sequence
  try {
    if (type === 'invoice') {
      const invs = await db.invoices.toArray();
      for (const inv of invs) {
        const num1 = extractSequenceForYear((inv as any).invoiceNo, yy);
        const num2 = extractSequenceForYear(inv.invoiceNumber, yy);
        if (num1 && num1 > maxSeq) maxSeq = num1;
        if (num2 && num2 > maxSeq) maxSeq = num2;
      }
    } else if (type === 'receipt' || type === 'payment') {
      const payments = await db.payments.toArray();
      for (const p of payments) {
        const num1 = extractSequenceForYear(p.paymentNumber, yy);
        const num2 = extractSequenceForYear(p.notes, yy);
        if (num1 && num1 > maxSeq) maxSeq = num1;
        if (num2 && num2 > maxSeq) maxSeq = num2;
      }
    } else if (type === 'quotation') {
      const quotes = await db.quotations.toArray();
      for (const q of quotes) {
        const num = extractSequenceForYear(q.quotationNumber, yy);
        if (num && num > maxSeq) maxSeq = num;
      }
    } else if (type === 'sale') {
      const sales = await db.sales.toArray();
      for (const s of sales) {
        const num = extractSequenceForYear(s.saleNumber, yy);
        if (num && num > maxSeq) maxSeq = num;
      }
    } else if (type === 'purchase') {
      const purchases = await db.purchases.toArray();
      for (const p of purchases) {
        const num = extractSequenceForYear(p.purchaseNumber, yy);
        if (num && num > maxSeq) maxSeq = num;
      }
    } else if (type === 'expense') {
      const exps = await db.expenses.toArray();
      for (const e of exps) {
        const num = extractSequenceForYear(e.expenseNumber, yy);
        if (num && num > maxSeq) maxSeq = num;
      }
    }
  } catch (err) {
    console.warn(`Failed to inspect db for ${type} sequence:`, err);
  }

  const nextSeq = maxSeq + 1;
  // Format as YY + 4-digit zero-padded number (e.g. 260001)
  const formatted = `${yy}${String(nextSeq).padStart(4, '0')}`;
  return formatted;
}

/**
 * Registers that a sequence number was saved/used so subsequent calls increment properly.
 */
export function recordSequenceUsed(type: SequenceType, fullNumber: string) {
  const yy = getCurrentYearPrefix();
  const seq = extractSequenceForYear(fullNumber, yy);
  if (seq !== null) {
    const localKey = `mb365_seq_${type}_${yy}`;
    const currentCached = parseInt(localStorage.getItem(localKey) || '0', 10);
    if (seq >= currentCached) {
      localStorage.setItem(localKey, String(seq));
    }
  }
}
