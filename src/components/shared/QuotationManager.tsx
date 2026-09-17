import { useState, useEffect } from 'react';
import { db } from '../../lib/db';

type Quotation = { id: string; quotationNumber: string; customerId?: string; date: string; subtotal: number; status: string; notes?: string };

export default function QuotationManager() {
  const [list, setList] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.quotations.toArray().then((rows) => {
      setList(rows);
      setLoading(false);
    });
  }, []);

  if (loading) return <div class="text-sm text-[var(--color-text-muted)]">Loading quotations…</div>;
  return (
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-[var(--color-text-primary)]">Quotations</h3>
        <span class="text-xs text-[var(--color-text-muted)]">{list.length} records</span>
      </div>
      <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] text-left text-xs font-medium uppercase tracking-wider">
            <tr><th class="px-4 py-2">#</th><th class="px-4 py-2">Customer</th><th class="px-4 py-2">Total</th><th class="px-4 py-2">Status</th></tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            {list.length === 0 && <tr><td colSpan={4} class="px-4 py-6 text-center text-[var(--color-text-muted)]">No quotations yet.</td></tr>}
            {list.map((q) => (
              <tr key={q.id} class="hover:bg-[var(--color-surface-overlay)] transition-colors">
                <td class="px-4 py-3 font-medium text-[var(--color-text-primary)]">{q.quotationNumber}</td>
                <td class="px-4 py-3 text-[var(--color-text-secondary)]">{q.customerId || '—'}</td>
                <td class="px-4 py-3 font-medium text-[var(--color-text-primary)]">${q.subtotal.toFixed(2)}</td>
                <td class="px-4 py-3"><span class="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300">{q.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p class="text-xs text-[var(--color-text-muted)]">Data from Dexie quotations table.</p>
    </div>
  );
}
