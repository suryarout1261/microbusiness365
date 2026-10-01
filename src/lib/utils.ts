export function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function calculateSubtotal(items: { qty: number; price: number }[]) {
  return items.reduce((s, i) => s + i.qty * i.price, 0);
}

export function formatCurrency(n: number) {
  return '₹' + (Number(n) || 0).toFixed(2);
}

export function calculateTax(subtotal: number, rate: number) {
  return Math.round((subtotal * rate) / 100);
}

/**
 * Formats any date into DD-MM-YYYY string.
 * Example: 2026-09-18 -> 18-09-2026
 */
export function formatDate(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    let d: Date;
    if (typeof dateInput === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(dateInput)) {
      return dateInput; // already DD-MM-YYYY
    }
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, day] = dateInput.split('-');
      return `${day}-${m}-${y}`;
    }
    d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return '—';
  }
}

/**
 * Returns today's date formatted as DD-MM-YYYY
 */
export function getTodayDDMMYYYY(): string {
  return formatDate(new Date());
}

/**
 * Returns today's date formatted as YYYY-MM-DD for native <input type="date">
 */
export function getTodayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Sanitize name input: accepts only letters, spaces, dots, hyphens, and apostrophes.
 * Rejects digits and arbitrary symbols.
 */
export function sanitizeName(value: string): string {
  if (!value) return '';
  return value.replace(/[^a-zA-Z\s.'-]/g, '');
}

/**
 * Sanitize integer count input: accepts only digits (no decimals, no negative signs, no fractions).
 */
export function sanitizeInteger(value: string | number): string {
  if (value === undefined || value === null || value === '') return '';
  const digits = String(value).replace(/[^0-9]/g, '');
  return digits;
}

/**
 * Sanitize positive decimal/currency/amount input: allows non-negative float (e.g. 120.50), blocks minus signs and invalid characters.
 */
export function sanitizeAmount(value: string | number): string {
  if (value === undefined || value === null || value === '') return '';
  let str = String(value).replace(/[^0-9.]/g, '');
  // Allow only single decimal dot
  const parts = str.split('.');
  if (parts.length > 2) {
    str = parts[0] + '.' + parts.slice(1).join('');
  }
  return str;
}

/**
 * Sanitize percentage: 0 to 100
 */
export function sanitizePercentage(value: string | number): string {
  const clean = sanitizeAmount(value);
  if (clean === '') return '';
  const num = parseFloat(clean);
  if (isNaN(num)) return '';
  if (num > 100) return '100';
  if (num < 0) return '0';
  return clean;
}

/**
 * KeyDown handler to strictly block decimals, scientific notation, and negative/positive signs in integer count inputs
 */
export function blockDecimalKey(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
    e.preventDefault();
  }
}

/**
 * KeyDown handler to block negative signs and exponential 'e' in non-negative amount inputs
 */
export function blockNegativeKey(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
    e.preventDefault();
  }
}

/**
 * Sanitize phone number: 10 digits only
 */
export function sanitizePhone(value: string): string {
  if (!value) return '';
  return value.replace(/\D/g, '').slice(0, 10);
}

/**
 * Validate phone number: exactly 10 digits
 */
export function isValidPhone(phone: string): boolean {
  return /^\d{10}$/.test(phone.trim());
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  if (!email || !email.trim()) return true; // optional unless required
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Sanitize 6-digit Indian Pincode / Postal code
 */
export function sanitizePincode(value: string): string {
  if (!value) return '';
  return value.replace(/\D/g, '').slice(0, 6);
}

/**
 * Sanitize GSTIN (15 alphanumeric characters uppercase)
 */
export function sanitizeGSTIN(value: string): string {
  if (!value) return '';
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
}
