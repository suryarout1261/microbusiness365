export function generateId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
export function calculateSubtotal(items: { qty: number; price: number }[]) { return items.reduce((s,i) => s + i.qty * i.price, 0); }
export function formatCurrency(n: number) { return '₹' + n.toFixed(2); }
